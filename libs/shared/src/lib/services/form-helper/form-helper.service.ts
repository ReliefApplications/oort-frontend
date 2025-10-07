import { Inject, Injectable, OnDestroy } from '@angular/core';
import {
  IPanel,
  PageModel,
  QuestionPanelDynamicModel,
  SurveyModel,
} from 'survey-core';
import { Apollo } from 'apollo-angular';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmService } from '../confirm/confirm.service';
import { firstValueFrom, lastValueFrom, Subscription } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { ADD_RECORD } from '../../components/form/graphql/mutations';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import {
  IconComponent,
  SnackbarService,
  TooltipDirective,
} from '@oort-front/ui';
import localForage from 'localforage';
import { snakeCase, cloneDeep, set, get, isNil, flattenDeep } from 'lodash';
import { AuthService } from '../auth/auth.service';
import { BlobType, DownloadService } from '../download/download.service';
import {
  AddDraftRecordMutationResponse,
  AddRecordMutationResponse,
  EditDraftRecordMutationResponse,
  RecordQueryResponse,
  Record,
} from '../../models/record.model';
import { Question } from '../../survey/types';
import {
  ADD_DRAFT_RECORD,
  DELETE_DRAFT_RECORD,
  EDIT_DRAFT_RECORD,
} from './graphql/mutations';
import { WorkflowService } from '../workflow/workflow.service';
import { ApplicationService } from '../application/application.service';
import { DomService } from '../dom/dom.service';
import { TemporaryFilesStorage } from '../form-builder/form-builder.service';
import { Router } from '@angular/router';
import { DashboardService } from '../dashboard/dashboard.service';
import { GET_RECORD_BY_UNIQUE_FIELD_VALUE } from './graphql/queries';
import { Metadata } from '../../models/metadata.model';
import { Overlay, OverlayPositionBuilder } from '@angular/cdk/overlay';
import { Subject } from 'rxjs';

export type CheckUniqueProprietyReturnT = {
  verified: boolean;
  overwriteRecord?: Record;
};

export const transformSurveyData = (survey: SurveyModel) => {
  const data = cloneDeep(survey.data) ?? {};
  Object.keys(data).forEach((filed) => {
    const question = survey.getQuestionByName(filed);
    if (!question) {
      delete data[filed];
    } else {
      const isQuestionVisible = (question: Question | IPanel): boolean => {
        if (!question.isVisible || !question) {
          return false;
        }
        if (question.parent) {
          return isQuestionVisible(question.parent);
        }
        return true;
      };
      if (!isQuestionVisible(question) && data[filed] === null) {
        delete data[filed];
      }
    }
  });
  return data;
};

interface TooltipCleanupRef {
  cleanup: () => void;
  surveyId: string;
  questionName: string;
}

@Injectable({
  providedIn: 'root',
})
export class FormHelpersService implements OnDestroy {
  private subscriptions: Subscription[] = [];
  private tooltipCleanups: TooltipCleanupRef[] = [];
  private activeDialogs: DialogRef<any>[] = [];
  private domComponents: any[] = [];
  private destroy$ = new Subject<void>();

  constructor(
    @Inject('environment') private environment: any,
    public apollo: Apollo,
    private snackBar: SnackbarService,
    private confirmService: ConfirmService,
    private translate: TranslateService,
    private authService: AuthService,
    private downloadService: DownloadService,
    private workflowService: WorkflowService,
    private applicationService: ApplicationService,
    private domService: DomService,
    private router: Router,
    public dialog: Dialog,
    private dashboardService: DashboardService,
    private overlay: Overlay,
    private overlayPositionBuilder: OverlayPositionBuilder
  ) { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions = [];

    this.cleanupAllTooltips();

    this.activeDialogs.forEach((dialogRef) => dialogRef.close());
    this.activeDialogs = [];

    this.domComponents.forEach((component) => {
      try {
        if (component && component.destroy) {
          component.destroy();
        }
      } catch (error) {
        console.warn('Error destroying DOM component:', error);
      }
    });
    this.domComponents = [];
  }

  createRevertDialog(version: any): DialogRef<any> {
    const date = new Date(parseInt(version.createdAt, 0));
    const formatDate = `${date.getDate()}/${date.getMonth() + 1
      }/${date.getFullYear()}`;
    const dialogRef = this.confirmService.openConfirmModal({
      title: this.translate.instant('components.record.recovery.title'),
      content: this.translate.instant(
        'components.record.recovery.confirmationMessage',
        { date: formatDate }
      ),
      confirmText: this.translate.instant('components.confirmModal.confirm'),
      confirmVariant: 'primary',
    });

    this.activeDialogs.push(dialogRef as any);

    dialogRef.closed.pipe(take(1)).subscribe(() => {
      const index = this.activeDialogs.indexOf(dialogRef as any);
      if (index > -1) {
        this.activeDialogs.splice(index, 1);
      }
    });

    return dialogRef as any;
  }

  setEmptyQuestions(survey: SurveyModel): void {
    const questions = survey.getAllQuestions();
    const data = { ...survey.data };
    for (const field in questions) {
      if (questions[field]) {
        const key = questions[field].getValueName();
        if (isNil(survey.data[key])) {
          if (questions[field].getType() !== 'boolean') {
            set(data, key, null);
          }
          if (questions[field].readOnly || !questions[field].visible) {
            delete data[key];
          }
        }
      }
    }
    survey.data = data;
  }

  /**
   * Upload asynchronously files to create questions in the form
   *
   * @param temporaryFilesStorage Temporary files saved while executing the survey
   * @param formId Form where to upload the files
   */
  async uploadFiles(
    temporaryFilesStorage: TemporaryFilesStorage,
    formId: string | undefined
  ): Promise<void> {
    if (!formId) {
      throw new Error('Form id is not defined');
    }

    for (const [question, files] of temporaryFilesStorage) {
      const paths = await Promise.all(
        files.map((file) =>
          this.downloadService.uploadBlob(file, BlobType.RECORD_FILE, formId)
        )
      );

      const mappedFiles = ((question.value as any[]) || []).map((f, idx) => ({
        ...f,
        content: paths[idx],
      }));

      question.value = mappedFiles;
    }
  }

  uploadTemporaryRecords(survey: SurveyModel): Promise<any>[] {
    const promises: Promise<any>[] = [];
    const surveyData = survey.data;
    const questions = survey.getAllQuestions();
    for (const question of questions) {
      if (question && question.value) {
        if (
          question.getType() === 'resources' ||
          question.getType() == 'resource'
        ) {
          for (const recordId of question.value) {
            const promise = new Promise<void>((resolve, reject) => {
              localForage
                .getItem(recordId)
                .then((data: any) => {
                  if (data != null) {
                    const recordFromResource = JSON.parse(data);
                    const subscription = this.apollo
                      .mutate<AddRecordMutationResponse>({
                        mutation: ADD_RECORD,
                        variables: {
                          form: recordFromResource.template,
                          data: recordFromResource.data,
                        },
                      })
                      .pipe(takeUntil(this.destroy$))
                      .subscribe({
                        next: ({ data, errors }) => {
                          if (errors) {
                            this.snackBar.openSnackBar(
                              `Error. ${errors[0].message}`,
                              {
                                error: true,
                              }
                            );
                            reject(errors);
                          } else {
                            question.value[question.value.indexOf(recordId)] =
                              question.value.includes(recordId)
                                ? data?.addRecord.id
                                : recordId;
                            surveyData[question.name] = question.value;
                            resolve();
                          }
                        },
                        error: (err) => {
                          this.snackBar.openSnackBar(err.message, {
                            error: true,
                          });
                          reject(err);
                        },
                      });
                    this.subscriptions.push(subscription);
                  } else {
                    resolve();
                  }
                })
                .catch((error: any) => {
                  console.error(error);
                  reject(error);
                });
              localForage.removeItem(recordId);
            });
            promises.push(promise);
          }
        }
      }
    }
    return promises;
  }

  public async createTemporaryRecords(survey: SurveyModel): Promise<void> {
    const promises: Promise<any>[] = [];
    const questions = survey.getAllQuestions();
    const nestedRecordsToAdd: { draftIds: string[]; question: Question }[] = [];

    const updateIds: {
      [key in string]: (arg0: string) => void;
    } = {};

    const nestedQuestions: Question[] = [];
    survey
      .getAllQuestions()
      .filter((q) => q.getType() === 'paneldynamic')
      .forEach((question) => {
        const panel = question as QuestionPanelDynamicModel;
        const embeddedResourcesQuestions: string[] = [];
        panel.templateElements.forEach((element) => {
          if (['resource', 'resources'].includes(element.getType())) {
            embeddedResourcesQuestions.push(element.name);
          }
        });
        embeddedResourcesQuestions.forEach((name) => {
          (panel.value || []).forEach((_: any, index: number) => {
            const question = panel.getQuestionFromArray(
              name,
              index
            ) as Question;
            nestedQuestions.push(question as Question);
          });
        });
      });
    const updateResourcesExpressions: ((arg1: string, arg2: string) => void)[] =
      [];

    questions.concat(nestedQuestions).forEach((question) => {
      const type = question.getType();
      if (!['resource', 'resources'].includes(type) || !question.draftData) {
        return;
      }

      if (question.valueExpression) {
        updateResourcesExpressions.push((oldId, newId) => {
          const value = question.value;
          if (Array.isArray(value)) {
            question.value = value.map((x) => (x === oldId ? newId : x));
          }
        });
      }
      const isResource = type === 'resource';

      const toAdd = (isResource ? [question.value] : question.value).filter(
        (id: string) => id in question.draftData
      );
      nestedRecordsToAdd.push({
        draftIds: toAdd,
        question,
      });

      toAdd.forEach((id: string) => {
        updateIds[id] = (newId: string) => {
          question.value = isResource
            ? newId
            : question.value.map((x: string) => (x === id ? newId : x));
        };
      });
    });

    for (const element of nestedRecordsToAdd) {
      for (const draftId of element.draftIds) {
        const data = element.question.draftData[draftId];
        const template = element.question.template;

        promises.push(
          firstValueFrom(
            this.apollo
              .mutate<AddRecordMutationResponse>({
                mutation: ADD_RECORD,
                variables: {
                  form: template,
                  data,
                },
              })
              .pipe(takeUntil(this.destroy$))
          ).then((res) => {
            const newId = res.data?.addRecord?.id;
            if (!newId) {
              return;
            }
            updateIds[draftId](newId);
            const isResource = element.question.getType() === 'resource';
            const draftIndex = (
              isResource
                ? [element.question.newCreatedRecords]
                : element.question.newCreatedRecords
            ).indexOf(draftId);
            if (draftIndex !== -1) {
              if (isResource) {
                element.question.newCreatedRecords = newId;
              } else {
                element.question.newCreatedRecords[draftIndex] = newId;
              }
            }
            this.deleteRecordDraft(draftId);
            delete element.question.draftData[draftId];
            return;
          })
        );
      }
    }

    await Promise.all(promises);
  }

  public addUserVariables = (survey: SurveyModel) => {
    const user = this.authService.user.getValue();

    survey.setVariable('user.name', user?.name ?? '');
    survey.setVariable('user.firstName', user?.firstName ?? '');
    survey.setVariable('user.lastName', user?.lastName ?? '');
    survey.setVariable('user.email', user?.username ?? '');

    for (const attribute of this.environment.user?.attributes || []) {
      survey.setVariable(
        `user.${attribute}`,
        get(user?.attributes, attribute) || ''
      );
    }

    survey.setVariable('user.roles', user?.roles?.map((r) => r.id || '') ?? []);
    survey.setVariable('user.id', user?.id || '');
  };

  public addQuestionTooltips(survey: SurveyModel, options: any): void {
    if (!options.question.tooltip) {
      return;
    }

    const titleElement = (options.htmlElement as HTMLElement).querySelector(
      '.sd-question__title'
    );
    if (titleElement) {
      titleElement.querySelectorAll('.sv-string-viewer').forEach((el: any) => {
        const component = this.domService.appendComponentToBody(
          IconComponent,
          el
        );
        component.instance.icon = 'help';
        component.instance.variant = 'primary';
        component.location.nativeElement.classList.add('ml-2', 'inline-flex');

        const tooltipDirective = new TooltipDirective(
          'default',
          component.location,
          this.overlay,
          this.overlayPositionBuilder
        );
        tooltipDirective.uiTooltip = options.question.tooltip;

        tooltipDirective.onMouseEnter =
          tooltipDirective.onMouseEnter.bind(tooltipDirective);
        tooltipDirective.onMouseLeave =
          tooltipDirective.onMouseLeave.bind(tooltipDirective);
        tooltipDirective.onMouseDown =
          tooltipDirective.onMouseDown.bind(tooltipDirective);

        component.location.nativeElement.addEventListener(
          'mouseenter',
          tooltipDirective.onMouseEnter
        );
        component.location.nativeElement.addEventListener(
          'mouseleave',
          tooltipDirective.onMouseLeave
        );
        component.location.nativeElement.addEventListener(
          'mousedown',
          tooltipDirective.onMouseDown
        );

        component.instance.tooltip = options.question.tooltip;

        const cleanup = () => {
          component.location.nativeElement.removeEventListener(
            'mouseenter',
            tooltipDirective.onMouseEnter
          );
          component.location.nativeElement.removeEventListener(
            'mouseleave',
            tooltipDirective.onMouseLeave
          );
          component.location.nativeElement.removeEventListener(
            'mousedown',
            tooltipDirective.onMouseDown
          );

          if (component && component.destroy) {
            component.destroy();
          }
        };

        const cleanupRef: TooltipCleanupRef = {
          cleanup,
          surveyId: survey.id || 'unknown',
          questionName: options.question.name || 'unknown',
        };

        this.tooltipCleanups.push(cleanupRef);
        this.domComponents.push(component);
      });
    }
  }

  public cleanupSurveyTooltips(surveyId: string): void {
    const toRemove: number[] = [];

    this.tooltipCleanups.forEach((cleanupRef, index) => {
      if (cleanupRef.surveyId === surveyId) {
        cleanupRef.cleanup();
        toRemove.push(index);
      }
    });

    toRemove.reverse().forEach((index) => {
      this.tooltipCleanups.splice(index, 1);
    });
  }

  /**
   * Clean up all tooltips
   */
  private cleanupAllTooltips(): void {
    this.tooltipCleanups.forEach((cleanupRef) => {
      try {
        cleanupRef.cleanup();
      } catch (error) {
        console.warn('Error cleaning up tooltip:', error);
      }
    });
    this.tooltipCleanups = [];
  }

  public toSnakeCase(text: string): string {
    if (this.isSnakeCase(text)) {
      return text;
    }
    return snakeCase(text);
  }

  public setValueName(question: Question, page: PageModel): boolean {
    if (!question.valueName) {
      if (question.title) {
        question.valueName = this.toSnakeCase(question.title);
      } else if (question.name) {
        question.valueName = this.toSnakeCase(question.name);
      } else {
        this.snackBar.openSnackBar(
          this.translate.instant('pages.formBuilder.errors.missingName', {
            page: page.name,
          }),
          {
            error: true,
            duration: 15000,
          }
        );
        return false;
      }
    } else {
      if (!this.isSnakeCase(question.valueName)) {
        this.snackBar.openSnackBar(
          this.translate.instant('pages.formBuilder.errors.snakecase', {
            name: question.valueName,
            page: page.name,
          }),
          {
            error: true,
            duration: 15000,
          }
        );
        return false;
      }
    }
    return true;
  }

  public saveAsDraft(
    survey: SurveyModel,
    formId: string,
    temporaryFilesStorage: TemporaryFilesStorage,
    draftId?: string,
    callback?: any
  ): void {
    this.uploadFiles(temporaryFilesStorage, formId).then(() => {
      if (!draftId) {
        const subscription = this.apollo
          .mutate<AddDraftRecordMutationResponse>({
            mutation: ADD_DRAFT_RECORD,
            variables: {
              form: formId,
              data: survey.data,
            },
          })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: ({ errors, data }) => {
              if (errors) {
                survey.clear(false, true);
                this.snackBar.openSnackBar(errors[0].message, { error: true });
              } else {
                this.snackBar.openSnackBar(
                  this.translate.instant(
                    'components.form.draftRecords.successSave'
                  ),
                  {
                    error: false,
                  }
                );
              }
              if (callback) {
                callback({
                  id: data?.addDraftRecord.id,
                  save: {
                    completed: false,
                    hideNewRecord: true,
                  },
                });
              }
            },
            error: (err) => {
              this.snackBar.openSnackBar(err.message, { error: true });
            },
          });
        this.subscriptions.push(subscription);
      } else {
        const subscription = this.apollo
          .mutate<EditDraftRecordMutationResponse>({
            mutation: EDIT_DRAFT_RECORD,
            variables: {
              id: draftId,
              data: survey.data,
            },
          })
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: ({ errors }: any) => {
              if (errors) {
                survey.clear(false, true);
                this.snackBar.openSnackBar(errors[0].message, { error: true });
              } else {
                this.snackBar.openSnackBar(
                  this.translate.instant(
                    'components.form.draftRecords.successEdit'
                  ),
                  {
                    error: false,
                  }
                );
              }
              if (callback) {
                callback({
                  id: draftId,
                  save: {
                    completed: false,
                    hideNewRecord: true,
                  },
                });
              }
            },
            error: (err) => {
              this.snackBar.openSnackBar(err.message, { error: true });
            },
          });
        this.subscriptions.push(subscription);
      }
    });
  }

  public deleteRecordDraft(draftId: string, callback?: any): void {
    const subscription = this.apollo
      .mutate<any>({
        mutation: DELETE_DRAFT_RECORD,
        variables: {
          id: draftId,
        },
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (callback) {
          callback();
        }
      });
    this.subscriptions.push(subscription);
  }

  private isSnakeCase(text: string): any {
    if (text.startsWith('_')) {
      text = text.substring(1);
    }
    return text.match(/^[a-zA-Z0-9]+(_[a-zA-Z0-9]+)*$/);
  }

  public addApplicationVariables = (survey: SurveyModel) => {
    const application = this.applicationService.application.getValue();
    survey.setVariable('application.id', application?.id ?? null);
    survey.setVariable('application.name', application?.name ?? null);
    survey.setVariable(
      'application.description',
      application?.description ?? null
    );
  };

  public addRecordVariables = (survey: SurveyModel, record: Record) => {
    survey.setVariable('record.id', record.id);
    survey.setVariable('record.incrementalID', record?.incrementalId ?? '');

    Object.keys(record?.data ?? {}).forEach((key) => {
      survey.setVariable(`record.${key}`, record.data[key]);
    });
  };

  public setWorkflowContextVariable = (survey: SurveyModel) => {
    survey.setVariable(
      `__WORKFLOW_CONTEXT__`,
      this.workflowService.workflowContextValue ?? []
    );
    this.workflowService.setContext([]);
  };

  public addQueryParamsVariables = (survey: SurveyModel) => {
    const queryParams = this.router.parseUrl(this.router.url).queryParams;
    Object.keys(queryParams).forEach((key) => {
      survey.setVariable(`param.${key}`, queryParams[key]);
    });
  };

  public async checkResourceOnFilter(
    resourceId: string,
    filterStructure: any
  ): Promise<string | undefined> {
    if (filterStructure) {
      const widgets = flattenDeep(
        this.dashboardService.widgets.map((widget: any) => {
          if (widget.component === 'tabs') {
            const tabs = widget.settings.tabs.map((tab: any) => tab.structure);
            return tabs;
          } else {
            return widget;
          }
        })
      );
      for await (const widget of widgets) {
        if (
          widget.settings.resource === resourceId ||
          widget.settings.card?.resource === resourceId
        ) {
          return resourceId;
        }
      }
      return;
    } else {
      return;
    }
  }

  public async checkUniquePropriety(
    survey: SurveyModel
  ): Promise<CheckUniqueProprietyReturnT> {
    const uniqueFields: Question[] = [];
    survey.getAllQuestions().forEach((question) => {
      if (question.unique) {
        uniqueFields.push(question);
      }
    });
    const checkUniqueResponse: CheckUniqueProprietyReturnT = {
      verified: true,
    };
    if (uniqueFields.length) {
      let firstOverwriteRecord = true;
      for await (const field of uniqueFields) {
        if (isNil(field.value)) {
          continue;
        }
        const { data } = await lastValueFrom(
          this.apollo
            .query<RecordQueryResponse>({
              query: GET_RECORD_BY_UNIQUE_FIELD_VALUE,
              variables: {
                uniqueField: field.name,
                uniqueValue: field.value,
              },
            })
            .pipe(takeUntil(this.destroy$))
        );

        if (!data.record || data.record.id === survey.record?.id) {
          continue;
        } else {
          const canUpdate = data.record.form?.metadata?.find(
            (metadataField: Metadata) => field.name === metadataField.name
          )?.canUpdate;
          if (!canUpdate) {
            this.snackBar.openSnackBar(
              this.translate.instant('components.record.uniqueField.exist', {
                question: field.title,
                value: field.value,
              }) +
              this.translate.instant(
                'components.record.uniqueField.cannotUpdate'
              ),
              { error: true }
            );
            return { verified: false };
          }

          if (firstOverwriteRecord) {
            firstOverwriteRecord = false;
            const dialogRef = this.confirmService.openConfirmModal({
              title: this.translate.instant(
                'components.record.uniqueField.title'
              ),
              content:
                this.translate.instant('components.record.uniqueField.exist', {
                  question: field.title,
                  value: field.value,
                }) +
                ' ' +
                this.translate.instant(
                  'components.record.uniqueField.overwriteConfirm'
                ),
              confirmText: this.translate.instant(
                'components.confirmModal.confirm'
              ),
              confirmVariant: 'primary',
            });
            const confirm = await lastValueFrom(dialogRef.closed.pipe(take(1)));
            if (confirm) {
              checkUniqueResponse.overwriteRecord = data.record;
              continue;
            } else {
              return { verified: false };
            }
          } else {
            this.snackBar.openSnackBar(
              this.translate.instant('components.record.uniqueField.exist', {
                question: field.title,
                value: field.value,
              }) +
              this.translate.instant(
                'components.record.uniqueField.updateRecord'
              ),
              { error: true }
            );
            const { FormModalComponent } = await import(
              '../../components/form-modal/form-modal.component'
            );

            const dialogRef = this.dialog.open(FormModalComponent, {
              disableClose: true,
              data: {
                recordId: data.record.id,
              },
              autoFocus: false,
            });

            const updateRecordDialogRef = await lastValueFrom(
              dialogRef.closed.pipe(take(1))
            );
            if (updateRecordDialogRef) {
              continue;
            } else {
              return { verified: false };
            }
          }
        }
      }
      return checkUniqueResponse;
    } else {
      return checkUniqueResponse;
    }
  }
}