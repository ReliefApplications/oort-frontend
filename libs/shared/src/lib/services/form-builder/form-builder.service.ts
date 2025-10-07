import { Injectable, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  Model,
  Question,
  QuestionFileModel,
  SurveyModel,
  settings,
  IPanel,
} from 'survey-core';
import { ReferenceDataService } from '../reference-data/reference-data.service';
import { renderGlobalProperties } from '../../survey/render-global-properties';
import { Apollo } from 'apollo-angular';
import { EDIT_RECORD } from './graphql/mutations';
import {
  EditRecordMutationResponse,
  Record as RecordModel,
} from '../../models/record.model';
import { Metadata } from '../../models/metadata.model';
import { RestService } from '../rest/rest.service';
import { BehaviorSubject, Subject, takeUntil } from 'rxjs';
import { SnackbarService } from '@oort-front/ui';
import { FormHelpersService } from '../form-helper/form-helper.service';
import { cloneDeep, difference, get } from 'lodash';
import { Form } from '../../models/form.model';

let counter = Math.floor(Math.random() * 0xffffff);

const createNewObjectId = () => {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0');
  const randomValue = Array.from({ length: 5 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0')
  ).join('');
  const counterHex = (counter++).toString(16).padStart(6, '0');
  return timestamp + randomValue + counterHex;
};

export type TemporaryFilesStorage = Map<Question, File[]>;

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
      if (
        (!isQuestionVisible(question) && data[filed] === null) ||
        question.omitField
      ) {
        delete data[filed];
      }
      if (question.downloadFileFrom) {
        data[filed] = [
          {
            name: question.fileName,
            type: question.fileType,
            content: `custom:${question.downloadFileFrom}`,
            includeToken: question.includeOortToken,
          },
        ];
      }
    }
  });
  return data;
};

const getUpdateData = (
  op: string,
  survey: SurveyModel
): Record<string, any> | null => {
  if (!op) return null;
  try {
    survey.getVariableNames().forEach((variable) => {
      op = op.replace(
        new RegExp(`{${variable}}`, 'g'),
        JSON.stringify(survey.getVariable(variable))
      );
    });
    survey.getAllQuestions().forEach((question) => {
      op = op.replace(
        new RegExp(`{${question.name}}`, 'g'),
        JSON.stringify(question.value)
      );
    });
    return JSON.parse(op);
  } catch {
    const regex = /{\s*(\b.*\b)\s*}\s*=\s*"(.*)"/g;
    const operation = regex.exec(op);
    return operation
      ? {
          [operation[1]]: operation[2],
        }
      : null;
  }
};

@Injectable({
  providedIn: 'root',
})
export class FormBuilderService implements OnDestroy {
  private destroy$ = new Subject<void>();
  public recordId?: string;

  constructor(
    private referenceDataService: ReferenceDataService,
    private translate: TranslateService,
    private apollo: Apollo,
    private snackBar: SnackbarService,
    private restService: RestService,
    private formHelpersService: FormHelpersService
  ) {}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  createSurvey(
    structure: string,
    fields: Metadata[] = [],
    record?: RecordModel,
    form?: Form
  ): SurveyModel {
    settings.useCachingForChoicesRestful = false;
    settings.useCachingForChoicesRestfull = false;
    const survey = new Model(structure);

    survey.getParsedData = () => {
      return transformSurveyData(survey);
    };

    if (form) {
      survey.form = form;
      if (form.resource) {
        survey.resource = survey.form.resource;
      }
    }

    if (record) {
      survey.record = record;
    }

    this.formHelpersService.addUserVariables(survey);
    this.formHelpersService.addApplicationVariables(survey);
    this.formHelpersService.setWorkflowContextVariable(survey);
    if (record) {
      this.recordId = record.id;
      this.formHelpersService.addRecordVariables(survey, record);
    } else if (survey.generateNewRecordOid) {
      survey.setVariable('record.id', createNewObjectId());
    }
    survey.onAfterRenderQuestion.add(
      renderGlobalProperties(this.referenceDataService)
    );

    survey.onAfterRenderQuestion.add(
      this.formHelpersService.addQuestionTooltips.bind(this.formHelpersService)
    );

    survey.getAllQuestions().forEach((question) => {
      if (question.validateOnValueChange) {
        question.registerFunctionOnPropertyValueChanged('value', () => {
          question.validate();
        });
      }
    });

    survey.onQuestionValueChanged = {};
    survey.onValueChanged.add((_, options) => {
      if (survey.onQuestionValueChanged[options.name]) {
        survey.onQuestionValueChanged[options.name](options);
      }
    });

    survey.onCompleting.add(() => {
      survey.getAllQuestions().forEach((question) => {
        const isResource = question.getType() === 'resource';
        const isResources = question.getType() === 'resources';
        if (!isResource && !isResources) {
          return;
        }
        const initSelection = [get(record, `data.${question.name}`, [])]
          .flat()
          .filter(Boolean);

        const wasSelected = (id: string) => initSelection.includes(id);

        const questionRecords = (
          isResource ? [question.value] : question.value
        ).filter(Boolean);

        for (const recordID of questionRecords) {
          if (
            question.newCreatedRecords &&
            question.newCreatedRecords.includes(recordID) &&
            question.afterRecordCreation
          ) {
            const data = getUpdateData(question.afterRecordCreation, survey);
            data && this.updateRecord(recordID, data);
          } else if (question.afterRecordSelection && !wasSelected(recordID)) {
            const data = getUpdateData(question.afterRecordSelection, survey);
            data && this.updateRecord(recordID, data);
          }
        }

        const deselectedRecords = difference(initSelection, questionRecords);
        if (question.afterRecordDeselection) {
          for (const recordID of deselectedRecords) {
            const data = getUpdateData(question.afterRecordDeselection, survey);
            data && this.updateRecord(recordID, data);
          }
        }
      });
    });

    if (fields.length > 0) {
      for (const f of fields.filter((x) => !x.automated)) {
        const accessible = !!f.canSee;
        const editable = !!f.canUpdate;
        const disabled: boolean =
          (f.canUpdate !== undefined && !f.canUpdate) || false;
        const question = survey.getQuestionByName(f.name);
        if (question) {
          if (!accessible) {
            question.delete();
          } else {
            question.readOnly = disabled || !editable;
          }
        }
      }
    }

    survey.getAllQuestions().forEach((question) => {
      if (question.getType() == 'paneldynamic') {
        if (question.getPropertyValue('startOnLastElement')) {
          question.currentIndex = question.visiblePanelCount - 1;
        }

        if (question.AllowNewPanelsExpression) {
          question.allowAddPanel = true;
        }
      }
    });

    const surveyLang = localStorage.getItem('surveyLang');
    const surveyLocales = survey.getUsedLocales();
    if (surveyLang && surveyLocales.includes(surveyLang)) {
      survey.locale = surveyLang;
    } else {
      const lang = this.translate.currentLang || this.translate.defaultLang;
      if (surveyLocales.includes(lang)) {
        survey.locale = lang;
      } else {
        survey.locale = surveyLocales[0] ?? survey.locale;
      }
    }

    this.formHelpersService.addQueryParamsVariables(survey);

    survey.showNavigationButtons = 'none';
    survey.showProgressBar = 'off';
    survey.focusFirstQuestionAutomatic = false;
    survey.applyTheme({ isPanelless: true });
    return survey;
  }

  public addEventsCallBacksToSurvey(
    survey: SurveyModel,
    selectedPageIndex: BehaviorSubject<number>,
    temporaryFilesStorage: TemporaryFilesStorage,
    destroy$: Subject<boolean>
  ) {
    selectedPageIndex
      .asObservable()
      .pipe(takeUntil(destroy$))
      .subscribe((index) => {
        survey.currentPageNo = index;
      });

    survey.onAfterRenderSurvey.add(() => {
      if (survey.initialConfigurationDone) {
        return;
      }
      survey.initialConfigurationDone = true;

      if (survey.openOnQuestionValuesPage) {
        const question = survey.getQuestionByName(
          survey.openOnQuestionValuesPage
        );
        if (question) {
          const page = survey.getPageByName(question.value);
          if (page) {
            setTimeout(() => {
              selectedPageIndex.next(page.visibleIndex);
            }, 100);
          }
        }
      } else if (survey.openOnPage) {
        const page = survey.getPageByName(survey.openOnPage);
        if (page) {
          selectedPageIndex.next(page.visibleIndex);
        }
      }

      survey.getAllQuestions().forEach((question) => {
        if (
          question.getType() == 'paneldynamic' &&
          question.getPropertyValue('startOnLastElement')
        ) {
          question.currentIndex = question.visiblePanelCount - 1;
        }
      });
    });

    survey.onClearFiles.add((_, options: any) => this.onClearFiles(options));
    survey.onUploadFiles.add((_, options: any) =>
      this.onUploadFiles(temporaryFilesStorage, options)
    );
    survey.onDownloadFile.add((_, options: any) =>
      this.onDownloadFile(options)
    );
    survey.onCurrentPageChanged.add((survey: SurveyModel) => {
      survey.checkErrorsMode = survey.isLastPage ? 'onComplete' : 'onNextPage';
      if (survey.currentPageNo !== selectedPageIndex.getValue()) {
        selectedPageIndex.next(survey.currentPageNo);
      }
    });
  }

  private onClearFiles(options: any): void {
    options.callback('success');
  }

  private onUploadFiles(
    temporaryFilesStorage: TemporaryFilesStorage,
    options: any
  ): void {
    const question = options.question as QuestionFileModel;
    temporaryFilesStorage.set(question, options.files);

    let content: any[] = [];
    options.files.forEach((file: any) => {
      const fileReader = new FileReader();
      fileReader.onload = () => {
        content = content.concat([
          {
            name: file.name,
            type: file.type,
            content: fileReader.result,
            file,
          },
        ]);
        if (content.length === options.files.length) {
          options.callback(
            'success',
            content.map((fileContent) => ({
              file: fileContent.file,
              content: fileContent.content,
            }))
          );
        }
      };
      fileReader.readAsDataURL(file);
    });
  }

  private onDownloadFile(options: any): void {
    if (
      options.content.indexOf('base64') !== -1 ||
      options.content.startsWith('http')
    ) {
      options.callback('success', options.content);
    } else if (options.content.startsWith('custom:')) {
      fetch(options.content.slice(7), {
        headers: options.fileValue.includeOortToken
          ? {
              Authorization: `Bearer ${localStorage.getItem('idtoken')}`,
            }
          : {},
      })
        .then((response) => response.blob())
        .then((blob) => {
          const file = new File([blob], options.fileValue.name, {
            type: options.fileValue.fileType,
          });
          const reader = new FileReader();
          reader.onload = (e) => {
            options.callback('success', e.target?.result);
          };
          reader.readAsDataURL(file);
        })
        .catch((error) => {
          console.error('Error downloading file:', error);
          options.callback('error', error);
        });
    } else if (this.recordId) {
      const xhr = new XMLHttpRequest();
      xhr.open(
        'GET',
        `${this.restService.apiUrl}/download/file/${options.content}/${this.recordId}/${options.name}`
      );
      xhr.setRequestHeader(
        'Authorization',
        `Bearer ${localStorage.getItem('idtoken')}`
      );
      xhr.onloadstart = () => {
        xhr.responseType = 'blob';
      };
      xhr.onload = () => {
        const file = new File([xhr.response], options.fileValue.name, {
          type: options.fileValue.type,
        });
        const reader = new FileReader();
        reader.onload = (e) => {
          options.callback('success', e.target?.result);
        };
        reader.readAsDataURL(file);
      };
      xhr.send();
    }
  }

  private updateRecord(id: string, data: any): void {
    if (id && data) {
      this.apollo
        .mutate<EditRecordMutationResponse>({
          mutation: EDIT_RECORD,
          variables: {
            id,
            data,
          },
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: ({ errors }) => {
            if (errors) {
              this.snackBar.openSnackBar(
                this.translate.instant(
                  'common.notifications.objectNotUpdated',
                  {
                    type: this.translate.instant('common.record.one'),
                    error: errors ? errors[0].message : '',
                  }
                ),
                { error: true }
              );
            } else {
              this.snackBar.openSnackBar(
                this.translate.instant('common.notifications.objectUpdated', {
                  type: this.translate.instant('common.record.one'),
                  value: '',
                })
              );
            }
          },
        });
    }
  }
}
