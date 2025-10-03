import { Apollo } from 'apollo-angular';
import {
  Component,
  ElementRef,
  Inject,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewContainerRef,
  ChangeDetectorRef,
} from '@angular/core';
import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { GET_RECORD_BY_ID, GET_FORM_BY_ID } from './graphql/queries';
import { Form, FormQueryResponse } from '../../models/form.model';
import { ConfirmService } from '../../services/confirm/confirm.service';
import { SurveyModel } from 'survey-core';
import { SurveyModule } from 'survey-angular-ui';
import {
  AddRecordMutationResponse,
  EditRecordMutationResponse,
  EditRecordsMutationResponse,
  Record,
  RecordQueryResponse,
} from '../../models/record.model';
import {
  EDIT_RECORD,
  ADD_RECORD,
  EDIT_RECORDS,
  ARCHIVE_RECORD,
} from './graphql/mutations';
import addCustomFunctions from '../../survey/custom-functions';
import { AuthService } from '../../services/auth/auth.service';
import {
  FormBuilderService,
  TemporaryFilesStorage,
} from '../../services/form-builder/form-builder.service';
import { BehaviorSubject, firstValueFrom, takeUntil } from 'rxjs';
import isNil from 'lodash/isNil';
import omitBy from 'lodash/omitBy';
import { TranslateService } from '@ngx-translate/core';
import { cleanRecord } from '../../utils/cleanRecord';
import { CommonModule } from '@angular/common';
import { IconModule } from '@oort-front/ui';
import { ButtonModule, SnackbarService, TabsModule } from '@oort-front/ui';
import { RecordSummaryModule } from '../record-summary/record-summary.module';
import { FormActionsModule } from '../form-actions/form-actions.module';
import { TranslateModule } from '@ngx-translate/core';
import { SpinnerModule } from '@oort-front/ui';
import { UnsubscribeComponent } from '../utils/unsubscribe/unsubscribe.component';
import {
  CheckUniqueProprietyReturnT,
  FormHelpersService,
  transformSurveyData,
} from '../../services/form-helper/form-helper.service';
import { DialogModule } from '@oort-front/ui';
import { DraftRecordComponent } from '../draft-record/draft-record.component';
import { UploadRecordsComponent } from '../upload-records/upload-records.component';
import { ContextService } from '../../services/context/context.service';

/**
 * Interface of Dialog data.
 */
interface DialogData {
  template?: string;
  recordId?: string | [];
  prefillRecords?: Record[];
  prefillData?: any;
  askForConfirm?: boolean;
  alwaysCreateRecord?: boolean;
}
/**
 * Defines the default Dialog data
 */
const DEFAULT_DIALOG_DATA = { askForConfirm: true };

/**
 * Modal to edit or add a record.
 */
@Component({
  standalone: true,
  selector: 'shared-form-modal',
  templateUrl: './form-modal.component.html',
  styleUrls: ['../../style/survey.scss', './form-modal.component.scss'],
  imports: [
    CommonModule,
    IconModule,
    TabsModule,
    RecordSummaryModule,
    FormActionsModule,
    TranslateModule,
    DialogModule,
    ButtonModule,
    SpinnerModule,
    SurveyModule,
    DraftRecordComponent,
  ],
})
export class FormModalComponent
  extends UnsubscribeComponent
  implements OnInit, OnDestroy
{
  /** Reference to form container */
  @ViewChild('formContainer') formContainer!: ElementRef;
  /** Reference to content view container */
  @ViewChild('uploadRecordsContent', { read: ViewContainerRef })
  uploadRecordsContent!: ViewContainerRef;
  /** Current template */
  public survey!: SurveyModel;
  /** Loading indicator */
  public loading = true;
  /** Is form saving */
  public saving = false;
  /** Loaded form */
  public form?: Form;
  /** Loaded record (optional) */
  public record?: Record;
  /** Modification date */
  public modifiedAt: Date | null = null;
  /** Selected page index */
  public selectedPageIndex: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);
  /** Selected page index as observable */
  public selectedPageIndex$ = this.selectedPageIndex.asObservable();
  /** The id of the last draft record that was loaded */
  public lastDraftRecord?: string;
  /** Disables the save as draft button */
  public disableSaveAsDraft = false;
  /** Available pages*/
  private pages = new BehaviorSubject<any[]>([]);
  /** Pages as observable */
  public pages$ = this.pages.asObservable();
  /** Is multi edition of records enabled ( for grid actions ) */
  protected isMultiEdition = false;
  /** Temporary storage of files */
  protected temporaryFilesStorage: TemporaryFilesStorage = new Map();
  /** Stored merged data */
  private storedMergedData: any;
  /** If new records was uploaded */
  private uploadedRecords = false;

  // Track active GraphQL subscriptions
  private activeSubscriptions = new Set<any>();

  // CRITICAL: Track dynamic components for cleanup
  private dynamicComponents: any[] = [];

  /**
   * Modal to edit or add a record.
   *
   * @param data This is the data that is passed to the modal when it is opened.
   * @param dialog This is the Angular Dialog service.
   * @param dialogRef This is the reference to the dialog.
   * @param apollo This is the Apollo client that we'll use to make GraphQL requests.
   * @param snackBar This is the service that allows you to display a snackbar.
   * @param authService This is the service that handles authentication.
   * @param formBuilderService This is the service that will be used to build forms.
   * @param formHelpersService This is the service that will handle forms.
   * @param confirmService This is the service that will be used to display confirm window.
   * @param translate This is the service that allows us to translate the text in our application.
   * @param ngZone Angular Service to execute code inside Angular environment
   * @param contextService Shared context service
   * @param cdRef Change detector reference for manual cleanup
   */
  constructor(
    @Inject(DIALOG_DATA) public data: DialogData,
    public dialog: Dialog,
    public dialogRef: DialogRef<FormModalComponent>,
    private apollo: Apollo,
    protected snackBar: SnackbarService,
    private authService: AuthService,
    private formBuilderService: FormBuilderService,
    protected formHelpersService: FormHelpersService,
    protected confirmService: ConfirmService,
    protected translate: TranslateService,
    protected ngZone: NgZone,
    protected contextService: ContextService,
    private cdRef: ChangeDetectorRef // CRITICAL: Add change detector
  ) {
    super();
  }

  async ngOnInit(): Promise<void> {
    this.data = { ...DEFAULT_DIALOG_DATA, ...this.data };

    this.isMultiEdition = Array.isArray(this.data.recordId);
    const promises: Promise<FormQueryResponse | RecordQueryResponse | void>[] =
      [];
    // Fetch record data if record id provided
    if (this.data.recordId) {
      const id = this.isMultiEdition
        ? this.data.recordId[0]
        : this.data.recordId;
      promises.push(
        firstValueFrom(
          this.apollo.query<RecordQueryResponse>({
            query: GET_RECORD_BY_ID,
            variables: {
              id,
              getForm: !this.data.template,
            },
          })
        ).then(({ data }) => {
          this.record = data.record;
          this.modifiedAt = this.isMultiEdition
            ? null
            : this.record?.modifiedAt || null;
          if (!this.data.template) {
            this.form = this.record?.form;
          }
        })
      );
    }
    // Fetch form if no record id provided or specific template provided
    if (!this.data.recordId || this.data.template) {
      promises.push(
        firstValueFrom(
          this.apollo.query<FormQueryResponse>({
            query: GET_FORM_BY_ID,
            variables: {
              id: this.data.template,
            },
          })
        ).then(({ data }) => {
          this.form = data.form;
          if (this.data.prefillData) {
            this.storedMergedData = this.data.prefillData;
          }
          if (this.data.prefillRecords && this.data.prefillRecords.length > 0) {
            this.storedMergedData = this.mergedData(this.data.prefillRecords);
            const resId = this.data.prefillRecords[0].form?.resource?.id;
            const resourcesField = this.form.fields?.find(
              (x) => x.type === 'resources' && x.resource === resId
            );
            if (resourcesField) {
              this.storedMergedData[resourcesField.name] =
                this.data.prefillRecords.map((x) => x.id);
            } else {
              this.snackBar.openSnackBar(
                this.translate.instant(
                  'models.record.notifications.conversionIncomplete'
                ),
                { error: true }
              );
            }
          }
        })
      );
    }
    await Promise.all(promises);

    this.initSurvey();

    // Creates UploadRecordsComponent
    if (this.survey.allowUploadRecords && !this.record) {
      const componentRef = this.uploadRecordsContent.createComponent(
        UploadRecordsComponent
      );

      componentRef.setInput('id', this.form?.id);
      componentRef.setInput('name', this.form?.name);
      componentRef.setInput('path', 'form');

      // CRITICAL: Track dynamic component for cleanup
      this.dynamicComponents.push(componentRef);

      const uploadedSubscription = componentRef.instance.uploaded.subscribe(
        () => (this.uploadedRecords = true)
      );
      this.activeSubscriptions.add(uploadedSubscription);

      /** To use angular hooks */
      componentRef.changeDetectorRef.detectChanges();
    }
  }

  /**
   * FIXED: Initialize survey with proper cleanup consideration
   */
  private initSurvey(): void {
    // Clear existing survey if any
    if (this.survey) {
      this.cleanupSurvey();
    }

    this.survey = this.formBuilderService.createSurvey(
      this.form?.structure || '',
      this.form?.metadata,
      this.record,
      this.form
    );

    // After the survey is created we add common callback to survey events
    this.formBuilderService.addEventsCallBacksToSurvey(
      this.survey,
      this.selectedPageIndex,
      this.temporaryFilesStorage,
      this.destroy$
    );

    // Set questions readOnly propriety
    const structure = JSON.parse(this.form?.structure || '');
    const pages = structure.pages;
    const initReadOnly = (elements: any): void => {
      elements.forEach((question: any) => {
        if (question.elements) {
          // If question is a panel type that has sub-questions
          initReadOnly(question.elements);
        } else if (question.templateElements) {
          // If question is a paneldynamic type that has sub-questions
          initReadOnly(question.templateElements);
        } else if (this.survey.getQuestionByName(question.name)) {
          this.survey.getQuestionByName(question.name).readOnly =
            question.readOnly ?? false;
        }
      });
    };
    pages.forEach((page: any) => {
      if (page.elements) {
        initReadOnly(page.elements);
      }
    });

    if (this.data.recordId && this.record) {
      addCustomFunctions({
        record: this.record,
        authService: this.authService,
        apollo: this.apollo,
        form: this.form,
        translateService: this.translate,
      });
      this.survey.data = this.isMultiEdition ? null : this.record.data;
      this.survey.showCompletedPage = false;
      this.form?.fields?.forEach((field) => {
        if (field.readOnly && this.survey.getQuestionByName(field.name))
          this.survey.getQuestionByName(field.name).readOnly = true;
      });
    }

    // FIXED: Use arrow function to maintain proper 'this' context
    const valueChangedCallback = () => {
      // Allow user to save as draft
      this.disableSaveAsDraft = false;
    };
    this.survey.onValueChanged.add(valueChangedCallback);
    (this.survey as any).valueChangedCallback = valueChangedCallback;

    // FIXED: Bind the onComplete method to maintain proper context
    this.survey.onComplete.add(this.onComplete.bind(this));

    if (this.storedMergedData) {
      this.survey.data = {
        ...this.survey.data,
        ...omitBy(this.storedMergedData, isNil),
      };
    }
    this.loading = false;
  }

  /**
   * CRITICAL: Enhanced survey cleanup to remove DOM elements and Angular context
   */
  private cleanupSurvey(): void {
    if (this.survey) {
      try {
        // Use the service's enhanced disposal method
        this.formBuilderService.disposeSurvey(this.survey);

        // CRITICAL: Clear Angular context from DOM elements
        if (this.formContainer?.nativeElement) {
          const container = this.formContainer.nativeElement;
          // Remove all child nodes to clear Angular context
          while (container.firstChild) {
            container.removeChild(container.firstChild);
          }

          // Clear any Angular-specific attributes
          container.removeAttribute('_ngcontent');
          container.removeAttribute('ng-version');
          container.removeAttribute('_nghost');
        }

        // Clear the survey reference
        this.survey = null as any;
      } catch (error) {
        console.warn('Error during survey cleanup:', error);
      }
    }
  }

  /**
   * Calls the complete method of the survey if no error.
   */
  public submit(): void {
    this.saving = true;
    if (!this.survey?.hasErrors()) {
      this.survey.completeLastPage();
    } else {
      this.snackBar.openSnackBar(
        this.translate.instant('models.form.notifications.savingFailed'),
        { error: true }
      );
      this.saving = false;
    }
  }

  /**
   * Closes the dialog asking for confirmation if needed.
   */
  public close(): void {
    const surveyData = transformSurveyData(this.survey);
    const recordData = this.record?.data || {};

    // To check if the user modified the data, we check if there's any key on the surveyData
    // that is different from or doesn't exist in the recordData
    const isModified = Object.keys(surveyData).some(
      (key) => surveyData[key] !== recordData[key]
    );
    if (this.survey.confirmOnModalClose && isModified) {
      const dialogRef = this.confirmService.openConfirmModal({
        title: this.translate.instant('common.close'),
        content: this.translate.instant(
          'components.record.modal.closeConfirmation'
        ),
        confirmText: this.translate.instant('components.confirmModal.confirm'),
        confirmVariant: 'primary',
      });
      dialogRef.closed
        .pipe(takeUntil(this.destroy$))
        .subscribe((value: any) => {
          if (value) {
            this.dialogRef.close(!!this.uploadedRecords as any);
          }
        });
    } else {
      this.dialogRef.close(!!this.uploadedRecords as any);
    }
  }

  /**
   * Creates the record, or update it if provided.
   *
   * @param survey Survey instance.
   */
  public onComplete = (survey: any) => {
    this.survey?.clear(false);
    const rowsSelected = Array.isArray(this.data.recordId)
      ? this.data.recordId.length
      : 1;

    /** we can send to backend empty data if they are not required */
    this.formHelpersService.setEmptyQuestions(survey);
    // Displays confirmation modal.
    if (this.data.askForConfirm) {
      const dialogRef = this.confirmService.openConfirmModal({
        title: this.translate.instant(
          `common.row.update.${rowsSelected > 1 ? 'few' : 'one'}.title`
        ),
        content: this.translate.instant(
          `common.row.update.${rowsSelected > 1 ? 'few' : 'one'}.content`,
          {
            quantity: rowsSelected,
          }
        ),
        confirmText: this.translate.instant('components.confirmModal.confirm'),
        confirmVariant: 'primary',
      });
      dialogRef.closed
        .pipe(takeUntil(this.destroy$))
        .subscribe(async (value: any) => {
          if (value) {
            await this.onUpdate(survey);
          } else {
            this.saving = false;
          }
        });
      // Updates the data directly.
    } else {
      this.onUpdate(survey);
    }
  };

  /**
   * Handles update data event.
   *
   * @param survey current survey
   * @param refreshWidgets if updating/creating resource on resource-modal and widgets using it need to be refreshed
   */
  public async onUpdate(survey: any, refreshWidgets = false): Promise<void> {
    this.formHelpersService
      .checkUniquePropriety(this.survey)
      .then(async (response: CheckUniqueProprietyReturnT) => {
        if (response.verified) {
          this.loading = true;
          await this.formHelpersService.uploadFiles(
            this.temporaryFilesStorage,
            this.form?.id
          );
          // await Promise.allSettled(promises);
          await this.formHelpersService.createTemporaryRecords(survey);
          const editRecord = response.overwriteRecord ?? this.data.recordId;
          if (editRecord) {
            // If update or creation of record is overwriting another record because unique field values
            const recordId = response.overwriteRecord
              ? response.overwriteRecord.id
              : this.data.recordId;
            if (this.isMultiEdition) {
              this.updateMultipleData(recordId, survey, refreshWidgets);
            } else {
              this.updateData(recordId, survey, refreshWidgets);
            }
          } else {
            // CRITICAL FIX: Use takeUntil for Apollo mutations
            const subscription = this.apollo
              .mutate<AddRecordMutationResponse>({
                mutation: ADD_RECORD,
                variables: {
                  id: this.survey.getVariable('record.id'),
                  form: this.data.template,
                  data: survey.getParsedData?.() ?? survey.data,
                },
              })
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: async ({ errors, data }) => {
                  if (errors) {
                    this.snackBar.openSnackBar(`Error. ${errors[0].message}`, {
                      error: true,
                    });
                    this.ngZone.run(() => {
                      this.dialogRef.close();
                    });
                  } else {
                    if (this.lastDraftRecord) {
                      const callback = () => {
                        this.lastDraftRecord = undefined;
                      };
                      this.formHelpersService.deleteRecordDraft(
                        this.lastDraftRecord,
                        callback
                      );
                    }
                    if (refreshWidgets) {
                      this.contextService.setWidgets(
                        await this.formHelpersService.checkResourceOnFilter(
                          this.form?.resource?.id as string,
                          this.contextService.filterStructure.getValue()
                        )
                      );
                    }
                    this.ngZone.run(() => {
                      this.dialogRef.close({
                        template: this.data.template,
                        data: data?.addRecord,
                      } as any);
                    });
                  }
                },
                error: (err) => {
                  this.snackBar.openSnackBar(err.message, { error: true });
                },
              });

            this.activeSubscriptions.add(subscription);
          }
          survey.showCompletedPage = true;
        } else {
          this.snackBar.openSnackBar(
            this.translate.instant('components.form.display.cancelMessage')
          );
          this.survey.clear(false);
          this.saving = false;
        }
      });
  }

  /**
   * Updates a specific record.
   *
   * @param id record id.
   * @param survey current survey.
   * @param refreshWidgets if updating/creating resource on resource-modal and widgets using it need to be refreshed
   */
  public updateData(id: any, survey: any, refreshWidgets = false): void {
    // CRITICAL FIX: Use takeUntil for Apollo mutations
    const subscription = this.apollo
      .mutate<EditRecordMutationResponse>({
        mutation: EDIT_RECORD,
        variables: {
          id,
          data: survey.getParsedData?.() ?? survey.data,
          template: this.data.template,
        },
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async ({ errors, data }) => {
          this.handleRecordMutationResponse({ data, errors }, 'editRecord');
          if (refreshWidgets) {
            this.contextService.setWidgets(
              await this.formHelpersService.checkResourceOnFilter(
                this.form?.resource?.id as string,
                this.contextService.filterStructure.getValue()
              )
            );
          }
          this.loading = false;
        },
        error: (err) => {
          this.snackBar.openSnackBar(err.message, { error: true });
          this.loading = false;
        },
      });

    this.activeSubscriptions.add(subscription);
  }

  /**
   * Updates multiple records.
   *
   * @param ids list of record ids.
   * @param survey current survey.
   * @param refreshWidgets if updating/creating resource on resource-modal and widgets using it need to be refreshed
   */
  public updateMultipleData(
    ids: any,
    survey: any,
    refreshWidgets = false
  ): void {
    const recordData = cleanRecord(survey.getParsedData?.() ?? survey.data);
    // CRITICAL FIX: Use takeUntil for Apollo mutations
    const subscription = this.apollo
      .mutate<EditRecordsMutationResponse>({
        mutation: EDIT_RECORDS,
        variables: {
          ids,
          data: recordData,
          template: this.data.template,
        },
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async ({ errors, data }) => {
          if (this.lastDraftRecord) {
            const callback = () => {
              this.lastDraftRecord = undefined;
            };
            this.formHelpersService.deleteRecordDraft(
              this.lastDraftRecord,
              callback
            );
          }
          this.handleRecordMutationResponse({ data, errors }, 'editRecords');
          if (refreshWidgets) {
            this.contextService.setWidgets(
              await this.formHelpersService.checkResourceOnFilter(
                this.form?.resource?.id as string,
                this.contextService.filterStructure.getValue()
              )
            );
          }
          this.loading = false;
        },
        error: (err) => {
          this.snackBar.openSnackBar(err.message, { error: true });
          this.loading = false;
        },
      });

    this.activeSubscriptions.add(subscription);
  }

  /**
   * Handle mutation type for the given response type, single or multiple records
   *
   * @param response Graphql mutation response
   * @param response.data response data
   * @param response.errors response errors
   * @param responseType response type
   */
  private handleRecordMutationResponse(
    response: { data: any; errors: any },
    responseType: 'editRecords' | 'editRecord'
  ) {
    const { data, errors } = response;
    const type =
      responseType === 'editRecords'
        ? this.translate.instant('common.record.few')
        : this.translate.instant('common.record.one');
    if (errors) {
      this.snackBar.openSnackBar(
        this.translate.instant('common.notifications.objectNotUpdated', {
          type,
          error: errors ? errors[0].message : '',
        }),
        { error: true }
      );
    } else {
      if (data) {
        this.snackBar.openSnackBar(
          this.translate.instant('common.notifications.objectUpdated', {
            type,
            value: '',
          })
        );
        this.dialogRef.close({
          template: this.form?.id,
          data: data[responseType],
        } as any);
      }
    }
  }

  /**
   * Handles the show page event
   *
   * @param i The index of the page
   */
  public onShowPage(i: number): void {
    if (this.selectedPageIndex.getValue() !== i) {
      this.selectedPageIndex.next(i);
    }
  }

  /**
   * Merge records
   *
   * @param records Records to merge
   * @returns The merged records
   */
  private mergedData(records: Record[]): any {
    const data: any = {};
    // Loop on source fields
    for (const inputField of records[0].form?.fields || []) {
      // If source field match with target field
      if (this.form?.fields?.some((x) => x.name === inputField.name)) {
        const targetField = this.form?.fields?.find(
          (x) => x.name === inputField.name
        );
        // If source field got choices
        if (inputField.choices || inputField.choicesByUrl) {
          // If the target has multiple choices we concatenate all the source values
          if (
            targetField.type === 'tagbox' ||
            targetField.type === 'checkbox'
          ) {
            if (
              inputField.type === 'tagbox' ||
              targetField.type === 'checkbox'
            ) {
              data[inputField.name] = Array.from(
                new Set(
                  records.reduce((o: string[], record: Record) => {
                    o = o.concat(record.data[inputField.name]);
                    return o;
                  }, [])
                )
              );
            } else {
              data[inputField.name] = records.map(
                (x) => x.data[inputField.name]
              );
            }
          }
          // If the target has single choice we we put the common choice if any or leave it empty
          else {
            if (
              !records.some(
                (x) =>
                  x.data[inputField.name] !== records[0].data[inputField.name]
              )
            ) {
              data[inputField.name] = records[0].data[inputField.name];
            }
          }
        }
        // If source field is a free input and types are matching between source and target field
        else if (inputField.type === targetField.type) {
          // If type is text just put the text of the first record
          if (inputField.type === 'text') {
            data[inputField.name] = records[0].data[inputField.name];
          }
          // If type is different from text and there is a common value, put it. Otherwise leave empty
          else {
            if (
              !records.some(
                (x) =>
                  x.data[inputField.name] !== records[0].data[inputField.name]
              )
            ) {
              data[inputField.name] = records[0].data[inputField.name];
            }
          }
        }
      }
    }
    return data;
  }

  /**
   * Opens the history of the record in a modal.
   */
  public async onShowHistory(): Promise<void> {
    if (this.record) {
      const { RecordHistoryModalComponent } = await import(
        '../record-history-modal/record-history-modal.component'
      );
      this.dialog.open(RecordHistoryModalComponent, {
        data: {
          id: this.record.id,
          revert: (version: any) =>
            this.confirmRevertDialog(this.record, version),
        },
        panelClass: ['lg:w-4/5', 'w-full'],
        autoFocus: false,
      });
    }
  }

  /**
   * Open a dialog modal to confirm the recovery of data
   *
   * @param record The record whose data we need to recover
   * @param version The version to recover
   */
  private confirmRevertDialog(record: any, version: any) {
    const dialogRef = this.formHelpersService.createRevertDialog(version);
    dialogRef.closed.pipe(takeUntil(this.destroy$)).subscribe((value: any) => {
      if (value) {
        // CRITICAL FIX: Use takeUntil for Apollo mutations
        const subscription = this.apollo
          .mutate<EditRecordMutationResponse>({
            mutation: EDIT_RECORD,
            variables: {
              id: record.id,
              version: version.id,
            },
          })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (errors) => {
              if (errors) {
                this.snackBar.openSnackBar(
                  this.translate.instant(
                    'common.notifications.dataNotRecovered'
                  ),
                  { error: true }
                );
              } else {
                this.snackBar.openSnackBar(
                  this.translate.instant('common.notifications.dataRecovered')
                );
              }
              this.dialog.closeAll();
            },
            error: (err) => {
              this.snackBar.openSnackBar(err.message, { error: true });
            },
          });

        this.activeSubscriptions.add(subscription);
      }
    });
  }

  /**
   * Saves the current data as a draft record
   */
  public saveAsDraft(): void {
    const callback = (details: any) => {
      this.lastDraftRecord = details.id;
    };
    this.formHelpersService.saveAsDraft(
      this.survey,
      this.form?.id as string,
      this.temporaryFilesStorage,
      this.lastDraftRecord,
      callback
    );
  }

  /**
   * Handle draft record load .
   *
   * @param id if of the draft record loaded
   */
  public onLoadDraftRecord(id: string): void {
    this.lastDraftRecord = id;
    this.disableSaveAsDraft = true;
  }

  /** Confirms deletion of record using the confirm service and deletes the record if confirmed */
  public async deleteRecord(): Promise<void> {
    const dialogRef = this.confirmService.openConfirmModal({
      title: this.translate.instant('common.deleteObject', {
        name: this.translate.instant('common.record.one'),
      }),
      content: this.translate.instant(
        'components.record.delete.confirmationMessage',
        {
          name: '',
        }
      ),
      confirmText: this.translate.instant('components.confirmModal.delete'),
      confirmVariant: 'danger',
    });

    dialogRef.closed.pipe(takeUntil(this.destroy$)).subscribe(async (value) => {
      if (value && this.record?.id) {
        // CRITICAL FIX: Use takeUntil for Apollo mutations
        const subscription = this.apollo
          .mutate({
            mutation: ARCHIVE_RECORD,
            variables: {
              id: this.record.id,
            },
          })
          .pipe(takeUntil(this.destroy$))
          .subscribe((res) => {
            if (res.errors) {
              this.snackBar.openSnackBar(
                this.translate.instant(
                  'common.notifications.objectNotDeleted',
                  {
                    value: this.translate.instant('common.record.one'),
                    error: res.errors[0]?.message ?? '',
                  }
                ),
                { error: true }
              );
              return;
            } else {
              this.snackBar.openSnackBar(
                this.translate.instant('common.notifications.objectDeleted', {
                  value: this.translate.instant('common.record.one'),
                })
              );
              this.dialogRef.close();
            }
          });

        this.activeSubscriptions.add(subscription);
      }
    });
  }

  /**
   * CRITICAL: Enhanced cleanup in ngOnDestroy to fix DOM memory leaks
   */
  override ngOnDestroy(): void {
    super.ngOnDestroy();

    // CRITICAL: Detach change detector first to prevent any further change detection
    this.cdRef.detach();

    // CRITICAL: Clean up all active subscriptions
    this.activeSubscriptions.forEach((subscription) => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing:', error);
      }
    });
    this.activeSubscriptions.clear();

    // CRITICAL: Clean up dynamic components
    this.dynamicComponents.forEach((component) => {
      try {
        // Clear the view container reference first
        if (this.uploadRecordsContent) {
          this.uploadRecordsContent.clear();
        }
        component.destroy();
      } catch (error) {
        console.warn('Error destroying dynamic component:', error);
      }
    });
    this.dynamicComponents = [];

    // CRITICAL: Proper survey disposal with DOM cleanup
    this.cleanupSurvey();

    // Clear temporary files storage
    this.temporaryFilesStorage.clear();

    // Clear any other subscriptions and data
    this.selectedPageIndex.complete();
    this.pages.complete();

    // CRITICAL: Clear large data objects and DOM references to help garbage collection
    this.form = undefined;
    this.record = undefined;
    this.storedMergedData = null;

    // Clear DOM element references
    if (this.formContainer) {
      // Remove all child nodes and clear the container
      const container = this.formContainer.nativeElement;
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      // Clear Angular-specific attributes
      container.removeAttribute('_ngcontent');
      container.removeAttribute('ng-version');
      container.removeAttribute('_nghost');
    }

    // Clear the upload records container
    if (this.uploadRecordsContent) {
      this.uploadRecordsContent.clear();
    }

    // Destroy form builder service
    this.formBuilderService.destroy();

    // CRITICAL: Force garbage collection by breaking circular references
    setTimeout(() => {
      // This gives Angular time to clean up before we force GC
      if (typeof window['gc'] === 'function') {
        window['gc'](); // Only works in Chrome with --js-flags="--expose-gc"
      }
    }, 100);
  }
}
