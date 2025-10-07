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
import { BehaviorSubject, firstValueFrom, Subject, takeUntil } from 'rxjs';
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

interface DialogData {
  template?: string;
  recordId?: string | [];
  prefillRecords?: Record[];
  prefillData?: any;
  askForConfirm?: boolean;
  alwaysCreateRecord?: boolean;
}

const DEFAULT_DIALOG_DATA = { askForConfirm: true };

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
  @ViewChild('formContainer') formContainer!: ElementRef;
  @ViewChild('uploadRecordsContent', { read: ViewContainerRef })
  uploadRecordsContent!: ViewContainerRef;

  public survey!: SurveyModel;
  public loading = true;
  public saving = false;
  public form?: Form;
  public record?: Record;
  public modifiedAt: Date | null = null;
  public selectedPageIndex: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);
  public selectedPageIndex$ = this.selectedPageIndex.asObservable();
  public lastDraftRecord?: string;
  public disableSaveAsDraft = false;
  private pages = new BehaviorSubject<any[]>([]);
  public pages$ = this.pages.asObservable();
  protected isMultiEdition = false;
  protected temporaryFilesStorage: TemporaryFilesStorage = new Map();
  private storedMergedData: any;
  private uploadedRecords = false;

  // Add cleanup subject for Apollo subscriptions
  private apolloDestroy$ = new Subject<void>();

  /**
   * Form Modal Component constructor
   *
   * @param data Dialog data
   * @param dialog Dialog service
   * @param dialogRef Dialog reference
   * @param apollo Apollo service
   * @param snackBar Snackbar service
   * @param authService Auth service
   * @param formBuilderService Form builder service
   * @param formHelpersService Form helpers service
   * @param confirmService Confirm service
   * @param translate Translate service
   * @param ngZone NgZone service
   * @param contextService Context service
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
    protected contextService: ContextService
  ) {
    super();
  }

  /**
   * Component initialization
   */
  async ngOnInit(): Promise<void> {
    this.data = { ...DEFAULT_DIALOG_DATA, ...this.data };
    this.isMultiEdition = Array.isArray(this.data.recordId);

    const promises: Promise<FormQueryResponse | RecordQueryResponse | void>[] =
      [];

    if (this.data.recordId) {
      const id = this.isMultiEdition
        ? this.data.recordId[0]
        : this.data.recordId;
      promises.push(
        firstValueFrom(
          this.apollo
            .query<RecordQueryResponse>({
              query: GET_RECORD_BY_ID,
              variables: {
                id,
                getForm: !this.data.template,
              },
            })
            .pipe(takeUntil(this.apolloDestroy$))
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

    if (!this.data.recordId || this.data.template) {
      promises.push(
        firstValueFrom(
          this.apollo
            .query<FormQueryResponse>({
              query: GET_FORM_BY_ID,
              variables: {
                id: this.data.template,
              },
            })
            .pipe(takeUntil(this.apolloDestroy$))
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

    if (this.survey.allowUploadRecords && !this.record) {
      const componentRef = this.uploadRecordsContent.createComponent(
        UploadRecordsComponent
      );

      componentRef.setInput('id', this.form?.id);
      componentRef.setInput('name', this.form?.name);
      componentRef.setInput('path', 'form');

      componentRef.instance.uploaded
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => (this.uploadedRecords = true));

      componentRef.changeDetectorRef.detectChanges();
    }
  }

  /**
   * Initialize the survey
   */
  private initSurvey(): void {
    this.survey = this.formBuilderService.createSurvey(
      this.form?.structure || '',
      this.form?.metadata,
      this.record,
      this.form
    );

    this.formBuilderService.addEventsCallBacksToSurvey(
      this.survey,
      this.selectedPageIndex,
      this.temporaryFilesStorage,
      this.destroy$
    );

    const structure = JSON.parse(this.form?.structure || '');
    const pages = structure.pages;
    const initReadOnly = (elements: any): void => {
      elements.forEach((question: any) => {
        if (question.elements) {
          initReadOnly(question.elements);
        } else if (question.templateElements) {
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

    this.survey.onValueChanged.add(() => {
      this.disableSaveAsDraft = false;
    });

    this.survey.onComplete.add(this.onComplete);

    if (this.storedMergedData) {
      this.survey.data = {
        ...this.survey.data,
        ...omitBy(this.storedMergedData, isNil),
      };
    }
    this.loading = false;
  }

  /**
   * Submit the form
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
   * Close the modal
   */
  public close(): void {
    const surveyData = transformSurveyData(this.survey);
    const recordData = this.record?.data || {};

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
   * Handle survey completion
   *
   * @param survey The completed survey
   */
  public onComplete = (survey: any) => {
    this.survey?.clear(false);
    const rowsSelected = Array.isArray(this.data.recordId)
      ? this.data.recordId.length
      : 1;

    this.formHelpersService.setEmptyQuestions(survey);

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
    } else {
      this.onUpdate(survey);
    }
  };

  /**
   * Update records after survey completion
   *
   * @param survey The completed survey
   * @param refreshWidgets Whether to refresh widgets
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

          await this.formHelpersService.createTemporaryRecords(survey);
          const editRecord = response.overwriteRecord ?? this.data.recordId;

          if (editRecord) {
            const recordId = response.overwriteRecord
              ? response.overwriteRecord.id
              : this.data.recordId;
            if (this.isMultiEdition) {
              this.updateMultipleData(recordId, survey, refreshWidgets);
            } else {
              this.updateData(recordId, survey, refreshWidgets);
            }
          } else {
            this.apollo
              .mutate<AddRecordMutationResponse>({
                mutation: ADD_RECORD,
                variables: {
                  id: this.survey.getVariable('record.id'),
                  form: this.data.template,
                  data: survey.getParsedData?.() ?? survey.data,
                },
              })
              .pipe(takeUntil(this.apolloDestroy$))
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
   * Update single record data
   *
   * @param id Record ID
   * @param survey Survey data
   * @param refreshWidgets Whether to refresh widgets
   */
  public updateData(id: any, survey: any, refreshWidgets = false): void {
    this.apollo
      .mutate<EditRecordMutationResponse>({
        mutation: EDIT_RECORD,
        variables: {
          id,
          data: survey.getParsedData?.() ?? survey.data,
          template: this.data.template,
        },
      })
      .pipe(takeUntil(this.apolloDestroy$))
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
  }

  /**
   * Update multiple records data
   *
   * @param ids Record IDs
   * @param survey Survey data
   * @param refreshWidgets Whether to refresh widgets
   */
  public updateMultipleData(
    ids: any,
    survey: any,
    refreshWidgets = false
  ): void {
    const recordData = cleanRecord(survey.getParsedData?.() ?? survey.data);
    this.apollo
      .mutate<EditRecordsMutationResponse>({
        mutation: EDIT_RECORDS,
        variables: {
          ids,
          data: recordData,
          template: this.data.template,
        },
      })
      .pipe(takeUntil(this.apolloDestroy$))
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
  }

  /**
   * Handle record mutation response
   *
   * @param response Mutation response
   * @param responseType Type of response
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
   * Show specific page in survey
   *
   * @param i Page index
   */
  public onShowPage(i: number): void {
    if (this.selectedPageIndex.getValue() !== i) {
      this.selectedPageIndex.next(i);
    }
  }

  /**
   * Merge data from multiple records
   *
   * @param records Records to merge
   * @returns Merged data
   */
  private mergedData(records: Record[]): any {
    const data: any = {};
    for (const inputField of records[0].form?.fields || []) {
      if (this.form?.fields?.some((x) => x.name === inputField.name)) {
        const targetField = this.form?.fields?.find(
          (x) => x.name === inputField.name
        );
        if (inputField.choices || inputField.choicesByUrl) {
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
          } else {
            if (
              !records.some(
                (x) =>
                  x.data[inputField.name] !== records[0].data[inputField.name]
              )
            ) {
              data[inputField.name] = records[0].data[inputField.name];
            }
          }
        } else if (inputField.type === targetField.type) {
          if (inputField.type === 'text') {
            data[inputField.name] = records[0].data[inputField.name];
          } else {
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
   * Show record history
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
   * Confirm revert dialog
   *
   * @param record Record to revert
   * @param version Version to revert to
   */
  private confirmRevertDialog(record: any, version: any) {
    const dialogRef = this.formHelpersService.createRevertDialog(version);
    dialogRef.closed.pipe(takeUntil(this.destroy$)).subscribe((value: any) => {
      if (value) {
        this.apollo
          .mutate<EditRecordMutationResponse>({
            mutation: EDIT_RECORD,
            variables: {
              id: record.id,
              version: version.id,
            },
          })
          .pipe(takeUntil(this.apolloDestroy$))
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
      }
    });
  }

  /**
   * Save record as draft
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
   * Load draft record
   *
   * @param id Draft record ID
   */
  public onLoadDraftRecord(id: string): void {
    this.lastDraftRecord = id;
    this.disableSaveAsDraft = true;
  }

  /**
   * Delete current record
   */
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
        this.apollo
          .mutate({
            mutation: ARCHIVE_RECORD,
            variables: {
              id: this.record.id,
            },
          })
          .pipe(takeUntil(this.apolloDestroy$))
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
      }
    });
  }

  /**
   * Clean up component
   */
  override ngOnDestroy(): void {
    super.ngOnDestroy();

    // Clean up all Apollo subscriptions
    this.apolloDestroy$.next();
    this.apolloDestroy$.complete();

    // Clean up SurveyJS
    if (this.survey) {
      this.survey.dispose();

      // Additional SurveyJS cleanup to prevent memory leaks
      try {
        // Clear all event handlers
        this.survey.onValueChanged.clear();
        this.survey.onComplete.clear();
        this.survey.onCurrentPageChanged.clear();
        this.survey.onAfterRenderQuestion.clear();
        this.survey.onAfterRenderSurvey.clear();

        // Clear all questions and panels
        this.survey.getAllQuestions().forEach((question) => {
          try {
            question.dispose();
          } catch (e) {
            console.warn('Error disposing question:', e);
          }
        });

        // Clear survey data
        this.survey.data = {};
        this.survey.clear(true, true);
      } catch (e) {
        console.warn('Error during survey cleanup:', e);
      }
    }

    // Clean up temporary files storage
    this.temporaryFilesStorage.clear();

    // Clean up behavior subjects
    this.selectedPageIndex.complete();
    this.pages.complete();
  }
}
