import { Dialog, DIALOG_DATA } from '@angular/cdk/dialog';
import { Component, Inject, OnInit } from '@angular/core';
import { FormGroup, Validators } from '@angular/forms';
import {
  ApplicationService,
  CustomNotification,
  customNotificationRecipientsType,
  GridLayoutService,
  Layout,
  Resource,
  Template,
  TemplateTypeEnum,
  UnsubscribeComponent,
  DistributionList,
  Channel,
  ChannelsQueryResponse,
} from '@oort-front/shared';
import { NotificationType, Triggers, TriggersType } from '../../triggers.types';
import { takeUntil } from 'rxjs';
import { get } from 'lodash';
import { Apollo } from 'apollo-angular';
import { GET_CHANNELS } from './graphql/queries';

/**
 * Dialog data interface.
 */
interface DialogData {
  trigger?: CustomNotification;
  triggerType: TriggersType;
  formGroup: FormGroup;
  resource: Resource;
}

/** Recipients options for email type trigger */
const emailRecipientsOptions = [
  customNotificationRecipientsType.distributionList,
  customNotificationRecipientsType.email,
  customNotificationRecipientsType.userField,
  customNotificationRecipientsType.emailField,
];

/** Recipients options for notification type trigger */
const notificationRecipientsOptions = [
  customNotificationRecipientsType.channel,
  customNotificationRecipientsType.userField,
];

/**
 * Edit/create trigger modal.
 */
@Component({
  selector: 'app-manage-trigger-modal',
  templateUrl: './manage-trigger-modal.component.html',
  styleUrls: ['./manage-trigger-modal.component.scss'],
})
export class ManageTriggerModalComponent
  extends UnsubscribeComponent
  implements OnInit
{
  /** Trigger form group */
  public formGroup!: FormGroup;
  /** Triggers enum */
  public TriggersEnum = Triggers;
  /** Layout */
  public layout?: Layout;
  /** List of channels */
  public channels?: Channel[];
  /** List of recipients options depending on selected type */
  public recipientsTypeOptions?:
    | typeof emailRecipientsOptions
    | typeof notificationRecipientsOptions;

  /** @returns application distribution lists */
  get distributionLists(): DistributionList[] {
    return this.applicationService.distributionLists || [];
  }

  /** @returns application templates */
  get templates(): Template[] {
    return (this.applicationService.templates || []).filter(
      (x) => x.type === TemplateTypeEnum.EMAIL
    );
  }

  /** @returns available users fields */
  get userFields(): any[] {
    return get(this.data.resource, 'metadata', []).filter(
      (x) => x.type === 'users'
    );
  }

  /** @returns available email fields */
  get emailFields(): any[] {
    return get(this.data.resource, 'metadata', []).filter(
      (x) => x.type === 'email'
    );
  }

  /**
   * Edit/create trigger modal.
   *
   * @param data dialog data
   * @param gridLayoutService Shared dataset layout service
   * @param applicationService Shared application service
   * @param dialog Dialog service
   * @param apollo The apollo client
   */
  constructor(
    @Inject(DIALOG_DATA) public data: DialogData,
    private gridLayoutService: GridLayoutService,
    private applicationService: ApplicationService,
    private dialog: Dialog,
    private apollo: Apollo
  ) {
    super();
    this.formGroup = this.data.formGroup;
    console.log('this.data', this.data);
    this.onNotificationTypeChange(
      this.formGroup.controls.notificationType.value
    );
  }

  ngOnInit(): void {
    this.getChannels();

    // Add email validation to recipients field if recipients type is email
    this.formGroup
      .get('recipientsType')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (value === 'email') {
          this.formGroup.get('recipients')?.addValidators(Validators.email);
        } else {
          this.formGroup.get('recipients')?.removeValidators(Validators.email);
        }
      });
  }

  /**
   * Opens modal for layout selection/creation
   */
  public async addLayout() {
    const { AddLayoutModalComponent } = await import('@oort-front/shared');
    const dialogRef = this.dialog.open(AddLayoutModalComponent, {
      data: {
        resource: this.data.resource,
        hasLayouts: this.data.resource.hasLayouts,
      },
    });
    dialogRef.closed.pipe(takeUntil(this.destroy$)).subscribe((value: any) => {
      if (value) {
        if (typeof value === 'string') {
          this.formGroup.get('layout')?.setValue(value);
        } else {
          this.layout = value;
          this.formGroup.get('layout')?.setValue(value.id);
        }
      }
    });
  }

  /**
   * Edit chosen layout, in a modal. If saved, update it.
   */
  public async editLayout(): Promise<void> {
    const { EditLayoutModalComponent } = await import('@oort-front/shared');
    const dialogRef = this.dialog.open(EditLayoutModalComponent, {
      disableClose: true,
      data: {
        layout: this.layout,
        queryName: this.data.resource?.queryName,
      },
    });
    dialogRef.closed.pipe(takeUntil(this.destroy$)).subscribe((value: any) => {
      if (value && this.layout) {
        this.gridLayoutService
          .editLayout(this.layout, value, this.data.resource?.id)
          .subscribe((res: any) => {
            this.layout = res.data?.editLayout;
          });
      }
    });
  }

  /**
   * Unset layout.
   */
  public removeLayout(): void {
    this.formGroup.get('layout')?.setValue(null);
    this.layout = undefined;
  }

  /**
   * Opens modal for adding a new email template
   */
  public async addEmailTemplate() {
    const { EditTemplateModalComponent } = await import('@oort-front/shared');
    const dialogRef = this.dialog.open(EditTemplateModalComponent, {
      disableClose: true,
    });
    dialogRef.closed.pipe(takeUntil(this.destroy$)).subscribe((value: any) => {
      if (value)
        this.applicationService.addTemplate(
          {
            name: value.name,
            type: TemplateTypeEnum.EMAIL,
            content: {
              subject: value.subject,
              body: value.body,
            },
          },
          (template: Template) => {
            this.formGroup.get('template')?.setValue(template.id || null);
          }
        );
    });
  }

  /**
   * Unset layout.
   *
   * @param type selected notification type
   */
  public onNotificationTypeChange(type: NotificationType | undefined): void {
    this.formGroup.get('recipients')?.setValue('');
    this.formGroup.get('recipientsType')?.setValue('');
    if (type) {
      if (type === NotificationType.email) {
        this.recipientsTypeOptions = emailRecipientsOptions;
      } else {
        this.recipientsTypeOptions = notificationRecipientsOptions;
      }
    }
  }

  /**
   * Load GET_CHANNELS query data.
   */
  private getChannels(): void {
    this.apollo
      .query<ChannelsQueryResponse>({
        query: GET_CHANNELS,
        variables: {
          application: this.applicationService.application.getValue()?.id,
        },
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ data }) => {
        this.channels = data.channels;
      });
  }
}
