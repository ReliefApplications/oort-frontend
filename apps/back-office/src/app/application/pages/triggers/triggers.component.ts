import { Component, OnInit } from '@angular/core';
import {
  Resource,
  UnsubscribeComponent,
  CustomNotification,
  ApplicationService,
  ResourceQueryResponse,
  cronValidator,
  ConfirmService,
  FiltersService,
  RestService,
} from '@oort-front/shared';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Apollo } from 'apollo-angular';
import { SnackbarService, UIPageChangeEvent } from '@oort-front/ui';
import { firstValueFrom, takeUntil } from 'rxjs';
import { GET_RESOURCE } from './graphql/queries';
import { triggers, Triggers, TriggersType } from './triggers.types';
import { get, omit } from 'lodash';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { TranslateService } from '@ngx-translate/core';

/** Default page size  */
const DEFAULT_PAGE_SIZE = 10;

/**
 * Triggers page component for application.
 */
@Component({
  selector: 'app-triggers',
  templateUrl: './triggers.component.html',
  styleUrls: ['./triggers.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ),
    ]),
  ],
})
export class TriggersComponent extends UnsubscribeComponent implements OnInit {
  /** Triggers list */
  public triggers: CustomNotification[] = [];
  /** Filter */
  public filter: any;
  /** Filter loading */
  public filterLoading = false;
  /** Updating status */
  public updating = false;
  /** Trigger form group */
  public triggerFormGroup!: ReturnType<typeof this.getTriggerForm>;
  /** Triggers enum */
  public TriggersEnum = Triggers;
  /** Loading status */
  public loading = true;
  /** Page info */
  public pageInfo = {
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    length: 0,
  };
  /** Current application id */
  public applicationId!: string;
  /** Resource cache */
  private resourcesCache = new Map<string, Resource>();
  /** Triggers types */
  public TriggersTypes = triggers;

  /**
   * Triggers page component for application.
   *
   * @param apollo Apollo client service
   * @param snackBar shared snackbar service
   * @param applicationService Shared application service
   * @param fb Angular form builder
   * @param dialog Dialog service
   * @param translate Angular translate service
   * @param confirmService Shared confirmation service
   * @param filtersService Shared filters service
   * @param restService REST service
   */
  constructor(
    private apollo: Apollo,
    private snackBar: SnackbarService,
    private applicationService: ApplicationService,
    private fb: FormBuilder,
    public dialog: Dialog,
    private translate: TranslateService,
    private confirmService: ConfirmService,
    private filtersService: FiltersService,
    private restService: RestService
  ) {
    super();
    this.applicationId =
      this.applicationService.application.getValue()?.id ?? '';
  }

  /** Load the triggers. */
  ngOnInit(): void {
    this.fetchTriggers();
  }

  /**
   * Filters resources and updates table.
   *
   * @param filter filter event.
   */
  public onFilter(filter: any): void {
    this.filterLoading = true;
    this.filter = filter;
    this.pageInfo.pageIndex = 0;
    this.fetchTriggers();
  }

  /**
   * Handles page event.
   *
   * @param e page event.
   */
  public onPage(e: UIPageChangeEvent): void {
    this.pageInfo.pageIndex = e.pageIndex;
    this.pageInfo.pageSize = e.pageSize;
    this.fetchTriggers();
  }

  /**
   * Delete selected trigger
   *
   * @param trigger Selected trigger
   */
  public onDeleteTrigger(trigger: CustomNotification): void {
    const dialogRef = this.confirmService.openConfirmModal({
      title: this.translate.instant('common.deleteObject', {
        name: this.translate.instant('common.trigger.one').toLowerCase(),
      }),
      content: this.translate.instant('components.triggers.confirmDelete', {
        name: trigger.name,
      }),
      confirmText: this.translate.instant('components.confirmModal.delete'),
      confirmVariant: 'danger',
    });
    dialogRef.closed.pipe(takeUntil(this.destroy$)).subscribe((value: any) => {
      if (value) {
        this.applicationService.deleteCustomNotification(
          trigger.id as string,
          () => {
            this.snackBar.openSnackBar(
              this.translate.instant('common.notifications.objectDeleted', {
                value: this.translate.instant('common.trigger.one'),
              })
            );
            this.fetchTriggers();
          }
        );
      }
    });
  }

  /**
   * Open modal to edit selected trigger
   *
   * @param trigger Selected trigger
   * @param triggerType Trigger type
   */
  public async onEditTrigger(
    trigger: CustomNotification,
    triggerType: TriggersType
  ): Promise<void> {
    console.log('Editing trigger', trigger, triggerType);
    const resource = await this.getResource(trigger.resource as string);
    const triggerFormGroup = await this.getTriggerForm(
      trigger,
      triggerType,
      resource.id as string
    );
    const { ManageTriggerModalComponent } = await import(
      './components/manage-trigger-modal/manage-trigger-modal.component'
    );
    const dialogRef = this.dialog.open(ManageTriggerModalComponent, {
      data: {
        trigger,
        triggerType,
        formGroup: triggerFormGroup,
        resource,
      },
    });

    dialogRef.closed.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (value) {
        this.applicationService.updateCustomNotification(
          trigger.id as string,
          value,
          () => {
            this.snackBar.openSnackBar(
              this.translate.instant('common.notifications.objectUpdated', {
                type: this.translate.instant('common.trigger.one'),
                value: '',
              })
            );
            this.fetchTriggers();
          }
        );
      }
    });
  }

  /**
   * Open modal to duplicate selected trigger
   *
   * @param trigger Selected trigger
   * @param triggerType Trigger type
   */
  public async onDuplicateTrigger(
    trigger: CustomNotification,
    triggerType: TriggersType
  ): Promise<void> {
    const resource = await this.getResource(trigger.resource as string);
    const triggerFormGroup = await this.getTriggerForm(
      trigger,
      triggerType,
      resource.id as string
    );
    const { ManageTriggerModalComponent } = await import(
      './components/manage-trigger-modal/manage-trigger-modal.component'
    );
    const dialogRef = this.dialog.open(ManageTriggerModalComponent, {
      data: {
        trigger: omit(trigger, 'id'),
        triggerType,
        formGroup: triggerFormGroup,
        resource,
      },
    });

    dialogRef.closed.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (value) {
        this.applicationService.addCustomNotification(
          value,
          (newTrigger: CustomNotification) => {
            if (newTrigger) {
              if (trigger.filter) {
                // Avoid duplicating filter if empty
                this.applicationService.editCustomNotificationFilters(
                  newTrigger.id ?? '',
                  trigger.filter
                );
              }

              this.snackBar.openSnackBar(
                this.translate.instant(
                  'common.notifications.objectDuplicated',
                  {
                    type: this.translate.instant('common.trigger.one'),
                    value: '',
                  }
                )
              );
              this.fetchTriggers();
            }
          }
        );
      }
    });
  }

  /**
   * Open modal to create a new trigger of the selected type
   *
   * @param triggerType Trigger type
   */
  public async onCreateTrigger(triggerType: TriggersType): Promise<void> {
    const { SelectTriggerResourceModalComponent } = await import(
      './components/select-trigger-resource-modal/select-trigger-resource-modal.component'
    );
    const selectDialogRef = this.dialog.open(
      SelectTriggerResourceModalComponent
    );

    selectDialogRef.closed
      .pipe(takeUntil(this.destroy$))
      .subscribe((resourceId) => {
        void this.handleCreateTrigger(
          triggerType,
          resourceId as string | undefined
        );
      });
  }

  /**
   * Handle trigger creation after selecting a resource.
   *
   * @param triggerType Trigger type
   * @param resourceId Selected resource id
   */
  private async handleCreateTrigger(
    triggerType: TriggersType,
    resourceId?: string
  ): Promise<void> {
    if (!resourceId) {
      return;
    }
    const resource = await this.getResource(resourceId);
    const triggerFormGroup = await this.getTriggerForm(
      null,
      triggerType,
      resource.id as string
    );
    const { ManageTriggerModalComponent } = await import(
      './components/manage-trigger-modal/manage-trigger-modal.component'
    );
    const dialogRef = this.dialog.open(ManageTriggerModalComponent, {
      data: {
        triggerType,
        formGroup: triggerFormGroup,
        resource,
      },
    });

    dialogRef.closed.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (value) {
        this.applicationService.addCustomNotification(
          value,
          (newTrigger: any) => {
            if (newTrigger) {
              this.snackBar.openSnackBar(
                this.translate.instant('common.notifications.objectCreated', {
                  type: this.translate.instant('common.trigger.one'),
                  value: '',
                })
              );
              this.fetchTriggers();
            }
          }
        );
      }
    });
  }

  /**
   * Build trigger reactive form group.
   *
   * @param trigger Selected trigger, if any
   * @param triggerType Trigger type
   * @param resourceId Resource id
   * @returns Notification form group
   */
  private getTriggerForm(
    trigger: CustomNotification | null,
    triggerType: TriggersType,
    resourceId?: string
  ): Promise<FormGroup> {
    return new Promise((resolve) => {
      const formGroup = this.fb.group({
        name: [get(trigger, 'name', ''), Validators.required],
        applicationTrigger: true,
        status: 'active',
        schedule: [get(trigger, 'schedule', '')],
        onRecordCreation: [get(trigger, 'onRecordCreation', false)],
        onRecordUpdate: [get(trigger, 'onRecordUpdate', false)],
        notificationType: [
          get(trigger, 'notificationType', 'email'),
          Validators.required,
        ],
        resource: [
          {
            value: resourceId ?? get(trigger, 'resource', null),
            disabled: true,
          },
          Validators.required,
        ],
        layout: [get(trigger, 'layout', ''), Validators.required],
        template: [get(trigger, 'template', ''), Validators.required],
        recipientsType: [
          get(trigger, 'recipientsType', ''),
          Validators.required,
        ],
        recipientsChannelFilter: this.filtersService.createFilterGroup(
          get(trigger, 'recipientsChannelFilter', null)
        ),
        recipients: [get(trigger, 'recipients', ''), Validators.required],
        redirect: this.fb.group({
          active: [get(trigger, 'redirect.active', '')],
          type: [get(trigger, 'redirect.type', '')],
          url: [get(trigger, 'redirect.url', '')],
          field: [get(trigger, 'redirect.field', '')],
        }),
      });

      if (triggerType === Triggers.cronBased) {
        formGroup.controls.schedule.addValidators([
          Validators.required,
          cronValidator(),
        ]);
        formGroup.controls.schedule.updateValueAndValidity();
      } else if (triggerType === Triggers.onRecordCreation) {
        formGroup.controls.onRecordCreation.setValue(true);
      } else if (triggerType === Triggers.onRecordUpdate) {
        formGroup.controls.onRecordUpdate.setValue(true);
      }

      resolve(formGroup);
    });
  }

  /**
   * Fetch triggers list from REST API.
   */
  private fetchTriggers(): void {
    if (!this.applicationId) {
      this.triggers = [];
      this.loading = false;
      this.filterLoading = false;
      return;
    }

    this.loading = true;
    this.updating = true;

    const params: any = {
      application: this.applicationId,
      page: this.pageInfo.pageIndex,
      pageSize: this.pageInfo.pageSize,
    };

    const filters = this.filter?.filters || [];
    const nameFilter = filters.find((f: any) => f.field === 'name');
    const startDateFilter = filters.find(
      (f: any) => f.field === 'createdAt' && f.operator === 'gte'
    );
    const endDateFilter = filters.find(
      (f: any) => f.field === 'createdAt' && f.operator === 'lte'
    );

    if (nameFilter?.value) {
      params.search = nameFilter.value;
    }
    if (startDateFilter?.value) {
      params.startDate =
        startDateFilter.value instanceof Date
          ? startDateFilter.value.toISOString()
          : startDateFilter.value;
    }
    if (endDateFilter?.value) {
      params.endDate =
        endDateFilter.value instanceof Date
          ? endDateFilter.value.toISOString()
          : endDateFilter.value;
    }

    this.restService
      .get('/notifications/triggers', { params })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.triggers = res.items || [];
          this.pageInfo.length = res.totalCount || 0;
          this.loading = false;
          this.updating = false;
          this.filterLoading = false;
        },
        error: (err) => {
          this.triggers = [];
          this.loading = false;
          this.updating = false;
          this.filterLoading = false;
          this.snackBar.openSnackBar(err.message, { error: true });
        },
      });
  }

  /**
   * Fetch resource details for a given id, using a local cache.
   *
   * @param resourceId resource id
   * @returns resource
   */
  private async getResource(resourceId: string): Promise<Resource> {
    const cached = this.resourcesCache.get(resourceId);
    if (cached) {
      return cached;
    }
    const result = await firstValueFrom(
      this.apollo.query<ResourceQueryResponse>({
        query: GET_RESOURCE,
        variables: {
          id: resourceId,
          application: this.applicationId,
        },
      })
    );
    const resource = result.data.resource;
    this.resourcesCache.set(resourceId, resource);
    return resource;
  }

  /**
   * Open filter modal for the selected trigger.
   *
   * @param trigger Selected trigger
   */
  public async onOpenFilter(trigger: CustomNotification): Promise<void> {
    const resource = await this.getResource(trigger.resource as string);
    const { TriggersResourceFiltersComponent } = await import(
      './components/triggers-resource-filters/triggers-resource-filters.component'
    );
    const dialogRef = this.dialog.open(TriggersResourceFiltersComponent, {
      data: {
        trigger,
        resource,
      },
    });
    dialogRef.closed.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (value) {
        this.updating = true;
        this.applicationService.editCustomNotificationFilters(
          trigger.id ?? '',
          value,
          () => {
            this.updating = false;
            this.snackBar.openSnackBar(
              this.translate.instant('common.notifications.objectUpdated', {
                type: this.translate.instant('common.trigger.one'),
                value: '',
              })
            );
            this.fetchTriggers();
          }
        );
      }
    });
  }
}
