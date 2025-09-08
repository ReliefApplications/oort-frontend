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
  ResourceQueryResponse,
  QueryBuilderService,
  RestService,
} from '@oort-front/shared';
import { NotificationType, Triggers, TriggersType } from '../../triggers.types';
import { firstValueFrom, takeUntil } from 'rxjs';
import { Apollo } from 'apollo-angular';
import { GET_CHANNELS, GET_LAYOUT } from './graphql/queries';
import { TranslateService } from '@ngx-translate/core';

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
  customNotificationRecipientsType.channel,
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
  /** List of pages */
  public pages$ = this.applicationService.pages$;
  /** List of recipients options depending on selected type */
  public recipientsTypeOptions?:
    | typeof emailRecipientsOptions
    | typeof notificationRecipientsOptions;
  /** Available users fields */
  public userFields: any[] = [];
  /** Available email fields */
  public emailFields: any[] = [];
  /** Filter fields */
  public filterFields: any[] = [];
  /** Indicates if initiating component */
  private init = true;

  /** @returns application distribution lists */
  get distributionLists(): DistributionList[] {
    return this.applicationService.distributionLists || [];
  }

  /** @returns application templates */
  get templates(): Template[] {
    return (this.applicationService.templates || []).filter(
      (x) => x.type === this.formGroup.value.notificationType
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
   * @param queryBuilder Query builder service
   * @param restService Shared est service
   * @param translate Translate service
   */
  constructor(
    @Inject(DIALOG_DATA) public data: DialogData,
    private gridLayoutService: GridLayoutService,
    private applicationService: ApplicationService,
    private dialog: Dialog,
    private apollo: Apollo,
    private queryBuilder: QueryBuilderService,
    private restService: RestService,
    private translate: TranslateService
  ) {
    super();
    this.formGroup = this.data.formGroup;
    this.onNotificationTypeChange(
      this.formGroup.controls.notificationType.value
    );
  }

  ngOnInit(): void {
    // Load all application channels
    this.getChannels();

    // If editing trigger, get layout
    if (this.data.trigger?.layout) {
      this.getLayout(this.data.trigger?.layout);
    }

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

    this.init = false;

    // Fetch attributes for optional channel filtering
    firstValueFrom(this.restService.get('/permissions/attributes')).then(
      (userAttributes: { value: string; text: string }[]) => {
        const attrFields = userAttributes.map((x) => ({
          text: x.text,
          name: x.value,
          editor: 'text',
        }));
        this.filterFields.unshift({
          text: this.translate.instant('common.attribute.few'),
          // regular questions can't have dollar signs in their name
          name: `$attribute`,
          filter: {
            operators: ['eq', 'neq'],
          },
          fields: attrFields,
          editor: null,
        });
      }
    );
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
          this.getLayout(value);
        } else {
          this.getLayout(value.id);
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
            this.formGroup.get('layout')?.markAsDirty();
            this.getLayout(res.data?.editLayout.id);
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
  public async addTemplate() {
    const { EditTemplateModalComponent } = await import('@oort-front/shared');
    const dialogRef = this.dialog.open(EditTemplateModalComponent, {
      disableClose: true,
    });
    dialogRef.closed.pipe(takeUntil(this.destroy$)).subscribe((value: any) => {
      if (value) {
        const content =
          value.type === TemplateTypeEnum.EMAIL
            ? {
                subject: value.subject,
                body: value.body,
              }
            : {
                title: value.title,
                description: value.description,
              };
        this.applicationService.addTemplate(
          {
            name: value.name,
            type: value.type,
            content,
          },
          (template: Template) => {
            this.formGroup.get('template')?.setValue(template.id || null);
          }
        );
      }
    });
  }

  /**
   * Handle redirect active or not:
   * If redirection not active, remove validator from url and type controls if necessary.
   * If active, add validator to type.
   */
  public onRedirectToggle(): void {
    if (!this.formGroup.value.redirect.active) {
      this.formGroup
        .get('redirect.type')
        ?.removeValidators(Validators.required);
      this.onRedirectTypeChange(undefined);
    } else {
      this.formGroup.get('redirect.type')?.addValidators(Validators.required);
    }
    this.formGroup.get('redirect.type')?.updateValueAndValidity();
  }

  /**
   * Handle redirect type change.
   *
   * @param type selected notification type
   */
  public onRedirectTypeChange(type: 'url' | 'recordIds' | undefined): void {
    if (!this.init) {
      this.formGroup.get('redirect.url')?.setValue('');
    }
    if (type) {
      if (type === 'url') {
        this.formGroup.get('redirect.url')?.addValidators(Validators.required);
      } else {
        this.formGroup
          .get('redirect.url')
          ?.removeValidators(Validators.required);
      }
    } else {
      this.formGroup.get('redirect.url')?.removeValidators(Validators.required);
    }
    this.formGroup.get('redirect.url')?.updateValueAndValidity();
  }

  /**
   * Handle notification type change.
   *
   * @param type selected notification type
   */
  public onNotificationTypeChange(type: NotificationType | undefined): void {
    if (!this.init) {
      this.formGroup.get('recipients')?.setValue('');
      this.formGroup.get('recipientsType')?.setValue('');
      this.formGroup.get('template')?.setValue('');
    }
    if (type) {
      if (type === NotificationType.email) {
        this.formGroup.get('redirect.active')?.setValue(false);
        this.formGroup.get('redirect.type')?.setValue('');
        this.onRedirectToggle();
        this.recipientsTypeOptions = emailRecipientsOptions;
      } else {
        this.onRedirectToggle();
        this.recipientsTypeOptions = notificationRecipientsOptions;
      }
    }
  }

  /**
   * Load channels query data.
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

  /**
   * Load layout by its id.
   *
   * @param layoutId id of the layout
   */
  private getLayout(layoutId: string): void {
    this.apollo
      .query<ResourceQueryResponse>({
        query: GET_LAYOUT,
        variables: {
          id: layoutId,
          resource: this.data.resource.id,
        },
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ data }) => {
        this.layout = data.resource.layouts?.edges[0]?.node;
        this.formGroup.get('layout')?.setValue(this.layout?.id);
        this.queryBuilder
          .buildMetaQuery(this.layout?.query)
          ?.pipe(takeUntil(this.destroy$))
          .subscribe({
            next: ({ data }) => {
              this.userFields = [];
              this.emailFields = [];
              for (const field in data) {
                if (Object.prototype.hasOwnProperty.call(data, field)) {
                  this.extractFieldsFromMetadata(data[field]);
                }
              }
            },
          });
      });
  }

  /**
   * Extract fields from metadata recursively.
   *
   * @param metaData Query metadata
   * @param path Current path in the metadata object
   */
  private extractFieldsFromMetadata(metaData: any, path = '') {
    for (const field in metaData) {
      if (
        Object.prototype.hasOwnProperty.call(metaData, field) &&
        field !== '__typename'
      ) {
        const fieldData = metaData[field];

        if (fieldData && typeof fieldData === 'object') {
          // Check if this is a field definition (has a 'type' property)
          const currentPath = path ? `${path}.${field}` : field;

          if (fieldData.type && fieldData.name) {
            const fieldInfo = {
              ...fieldData,
              name: currentPath,
            };

            if (fieldData.type === 'users') {
              this.userFields.push(fieldInfo);
            } else if (fieldData.type === 'email') {
              this.emailFields.push(fieldInfo);
            }
          } else {
            if (!Array.isArray(fieldData)) {
              // Extract fields from nested objects
              this.extractFieldsFromMetadata(fieldData, currentPath);
            }
          }
        }
      }
    }
  }
}
