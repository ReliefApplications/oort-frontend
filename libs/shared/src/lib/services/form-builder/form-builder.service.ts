import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  Model,
  Question,
  QuestionFileModel,
  SurveyModel,
  settings,
  IPanel,
  AfterRenderSurveyEvent,
  ClearFilesEvent,
  UploadFilesEvent,
  DownloadFileEvent,
  CurrentPageChangedEvent,
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

/** Counter for creating unique object IDs */
let counter = Math.floor(Math.random() * 0xffffff);

/**
 * Creates a new unique object ID
 *
 * @returns A unique hexadecimal string ID
 */
const createNewObjectId = (): string => {
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

/** Temporary storage for files during form editing */
export type TemporaryFilesStorage = Map<Question, File[]>;

/** CRITICAL: Cache transformed survey data to avoid repeated processing */
const surveyDataCache = new WeakMap<SurveyModel, any>();

/**
 * Transforms survey data by cleaning up and processing file downloads
 *
 * @param survey The survey model to transform data from
 * @returns The cleaned and processed survey data
 */
export const transformSurveyData = (survey: SurveyModel): any => {
  // Check cache first
  if (surveyDataCache.has(survey)) {
    return surveyDataCache.get(survey);
  }

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

  // Cache the result
  surveyDataCache.set(survey, data);
  return data;
};

/**
 * Gets update data by parsing operation string with survey variables
 *
 * @param op The operation string to parse
 * @param survey The survey model containing variables
 * @returns The parsed update data or null if invalid
 */
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

/** Define proper event handler types */
interface SurveyEventHandlers {
  afterRenderHandler: (
    _sender: SurveyModel,
    _options: AfterRenderSurveyEvent
  ) => void;
  clearFilesHandler: (_sender: SurveyModel, options: ClearFilesEvent) => void;
  uploadFilesHandler: (_sender: SurveyModel, options: UploadFilesEvent) => void;
  downloadFileHandler: (
    _sender: SurveyModel,
    options: DownloadFileEvent
  ) => void;
  pageChangedHandler: (
    _sender: SurveyModel,
    options: CurrentPageChangedEvent
  ) => void;
}

/**
 * Service for building and managing survey forms with advanced features
 * including caching, memory management, and event handling
 */
@Injectable({
  providedIn: 'root',
})
export class FormBuilderService {
  /** Current record ID being edited */
  public recordId?: string;

  /** Add event handler references for cleanup with proper typing */
  private eventHandlers = new WeakMap<SurveyModel, SurveyEventHandlers>();

  /** Track active subscriptions for cleanup */
  private activeSubscriptions = new Set<any>();

  /** CRITICAL: Cache for parsed survey structures to avoid duplicate JSON parsing */
  private surveyStructureCache = new Map<string, any>();

  /**
   * Constructor for FormBuilderService
   *
   * @param referenceDataService Service for handling reference data
   * @param translate Translation service
   * @param apollo Apollo GraphQL client
   * @param snackBar Snackbar notification service
   * @param restService REST API service
   * @param formHelpersService Form helper utilities
   */
  constructor(
    private referenceDataService: ReferenceDataService,
    private translate: TranslateService,
    private apollo: Apollo,
    private snackBar: SnackbarService,
    private restService: RestService,
    private formHelpersService: FormHelpersService
  ) {}

  /**
   * CRITICAL: Clean up all active subscriptions and caches
   */
  public destroy(): void {
    this.activeSubscriptions.forEach((subscription) => {
      try {
        subscription.unsubscribe();
      } catch (error) {
        console.warn('Error unsubscribing:', error);
      }
    });
    this.activeSubscriptions.clear();

    // Clear caches to free memory
    this.surveyStructureCache.clear();
  }

  /**
   * CRITICAL: Parse survey structure with caching to avoid duplicate JSON parsing
   *
   * @param structure The JSON structure string to parse
   * @returns The parsed survey structure
   */
  private parseSurveyStructure(structure: string): any {
    const cacheKey = structure; // Use the raw string as cache key

    if (this.surveyStructureCache.has(cacheKey)) {
      return this.surveyStructureCache.get(cacheKey);
    }

    try {
      const parsed = JSON.parse(structure);
      this.surveyStructureCache.set(cacheKey, parsed);
      return parsed;
    } catch (error) {
      console.error('Error parsing survey structure:', error);
      return { pages: [] };
    }
  }

  /**
   * Creates a new survey model with configured properties and event handlers
   *
   * @param structure The JSON structure of the survey
   * @param fields Metadata fields for the survey
   * @param record Optional record data to prefill
   * @param form Optional form configuration
   * @returns The configured survey model
   */
  createSurvey(
    structure: string,
    fields: Metadata[] = [],
    record?: RecordModel,
    form?: Form
  ): SurveyModel {
    settings.useCachingForChoicesRestful = false;
    settings.useCachingForChoicesRestfull = false;

    // CRITICAL: Use cached structure parsing
    const parsedStructure = this.parseSurveyStructure(structure);
    const survey = new Model(parsedStructure);

    // Override getParsedData to use caching
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

    // CRITICAL: Use arrow functions to avoid creating new function instances each time
    survey.getAllQuestions().forEach((question) => {
      if (question.validateOnValueChange) {
        const validationHandler = () => {
          question.validate();
        };
        question.registerFunctionOnPropertyValueChanged(
          'value',
          validationHandler
        );
        // Store handler reference for cleanup
        (question as any).validationHandler = validationHandler;
      }
    });

    survey.onQuestionValueChanged = {};
    const valueChangedHandler = (
      _: any,
      options: { name: string | number }
    ) => {
      if (survey.onQuestionValueChanged[options.name]) {
        survey.onQuestionValueChanged[options.name](options);
      }
    };
    survey.onValueChanged.add(valueChangedHandler);
    (survey as any).valueChangedHandler = valueChangedHandler;

    // CRITICAL FIX: Use proper subscription management for onCompleting
    const completingHandler = () => {
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
    };

    survey.onCompleting.add(completingHandler);
    (survey as any).completingHandler = completingHandler;

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

  /**
   * CRITICAL FIX: Properly clean up event handlers from survey and DOM elements
   *
   * @param survey The survey model to clean up
   */
  private clearSurveyEventHandlers(survey: SurveyModel): void {
    const handlers = this.eventHandlers.get(survey);
    if (handlers) {
      try {
        survey.onAfterRenderSurvey.remove(handlers.afterRenderHandler);
        survey.onClearFiles.remove(handlers.clearFilesHandler);
        survey.onUploadFiles.remove(handlers.uploadFilesHandler);
        survey.onDownloadFile.remove(handlers.downloadFileHandler);
        survey.onCurrentPageChanged.remove(handlers.pageChangedHandler);

        // Clean up completing handler
        if ((survey as any).completingHandler) {
          survey.onCompleting.remove((survey as any).completingHandler);
        }

        // Clean up value changed handler
        if ((survey as any).valueChangedHandler) {
          survey.onValueChanged.remove((survey as any).valueChangedHandler);
        }

        // Clean up question validation handlers
        survey.getAllQuestions().forEach((question) => {
          if ((question as any).validationHandler) {
            try {
              question.clearFunctionsOnPropertyValueChanged('value');
            } catch (error) {
              console.warn('Error clearing validation handler:', error);
            }
            delete (question as any).validationHandler;
          }
        });

        // Clear cached data
        surveyDataCache.delete(survey);
      } catch (error) {
        console.warn('Error clearing survey event handlers:', error);
      }
      this.eventHandlers.delete(survey);
    }
  }

  /**
   * CRITICAL: Enhanced survey disposal to remove DOM elements
   *
   * @param survey The survey model to dispose
   */
  public disposeSurvey(survey: SurveyModel): void {
    if (!survey) return;

    try {
      // CRITICAL: Remove survey from DOM first
      const surveyDomNode = survey.getRootElement();
      if (surveyDomNode && surveyDomNode.parentNode) {
        surveyDomNode.parentNode.removeChild(surveyDomNode);
      }

      // Clear all event handlers
      this.clearSurveyEventHandlers(survey);

      // Clear survey data and dispose
      survey.clear(true);
      survey.dispose();

      // Force garbage collection by breaking references
      (survey as any) = null;
    } catch (error) {
      console.warn('Error disposing survey:', error);
    }
  }

  /**
   * FIXED: Proper event handler management with cleanup references
   *
   * @param survey The survey model to add events to
   * @param selectedPageIndex Behavior subject for tracking page index
   * @param temporaryFilesStorage Temporary storage for file uploads
   * @param destroy$ Subject to trigger cleanup on component destruction
   */
  public addEventsCallBacksToSurvey(
    survey: SurveyModel,
    selectedPageIndex: BehaviorSubject<number>,
    temporaryFilesStorage: TemporaryFilesStorage,
    destroy$: Subject<any>
  ): void {
    // Clear any existing handlers first
    this.clearSurveyEventHandlers(survey);

    // FIXED: Use takeUntil to prevent subscription leak
    const pageIndexSubscription = selectedPageIndex
      .asObservable()
      .pipe(takeUntil(destroy$))
      .subscribe((index) => {
        survey.currentPageNo = index;
      });

    // Track this subscription for cleanup
    this.activeSubscriptions.add(pageIndexSubscription);

    // CRITICAL: Store event handler references for cleanup with proper typing
    const afterRenderHandler = (
      _sender: SurveyModel,
      _options: AfterRenderSurveyEvent
    ) => {
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
    };

    const clearFilesHandler = (
      _sender: SurveyModel,
      options: ClearFilesEvent
    ) => this.onClearFiles(options);

    const uploadFilesHandler = (
      _sender: SurveyModel,
      options: UploadFilesEvent
    ) => this.onUploadFiles(temporaryFilesStorage, options);

    const downloadFileHandler = (
      _sender: SurveyModel,
      options: DownloadFileEvent
    ) => this.onDownloadFile(options);

    const pageChangedHandler = (
      _sender: SurveyModel,
      options: CurrentPageChangedEvent
    ) => {
      survey.checkErrorsMode = survey.isLastPage ? 'onComplete' : 'onNextPage';
      if (survey.currentPageNo !== selectedPageIndex.getValue()) {
        selectedPageIndex.next(survey.currentPageNo);
      }
    };

    // Add event handlers
    survey.onAfterRenderSurvey.add(afterRenderHandler);
    survey.onClearFiles.add(clearFilesHandler);
    survey.onUploadFiles.add(uploadFilesHandler);
    survey.onDownloadFile.add(downloadFileHandler);
    survey.onCurrentPageChanged.add(pageChangedHandler);

    // Store handlers for cleanup
    this.eventHandlers.set(survey, {
      afterRenderHandler,
      clearFilesHandler,
      uploadFilesHandler,
      downloadFileHandler,
      pageChangedHandler,
    });

    // CRITICAL FIX: Clean up everything when destroy$ emits
    destroy$.subscribe(() => {
      try {
        // Unsubscribe from page index subscription
        if (pageIndexSubscription) {
          pageIndexSubscription.unsubscribe();
          this.activeSubscriptions.delete(pageIndexSubscription);
        }

        // Clear all event handlers and DOM elements
        this.disposeSurvey(survey);

        // Clear temporary files storage
        temporaryFilesStorage.clear();
      } catch (error) {
        console.warn('Error during survey cleanup:', error);
      }
    });
  }

  /**
   * Handles file clearing events from survey
   *
   * @param options Clear files event options
   */
  private onClearFiles(_options: ClearFilesEvent): void {
    _options.callback('success');
  }

  /**
   * Handles file upload events from survey
   *
   * @param temporaryFilesStorage Temporary storage for uploaded files
   * @param options Upload files event options
   */
  private onUploadFiles(
    temporaryFilesStorage: TemporaryFilesStorage,
    options: UploadFilesEvent
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

  /**
   * Handles file download events from survey
   *
   * @param options Download file event options
   */
  private onDownloadFile(options: DownloadFileEvent): void {
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

  /**
   * CRITICAL FIX: This subscription was creating memory leaks!
   * Now properly managed with takeUntil
   *
   * @param id Record ID to update
   * @param data Data to update the record with
   */
  private updateRecord(id: string, data: any): void {
    if (id && data) {
      // Create a subject to manage this specific subscription
      const destroySubject = new Subject<void>();

      const subscription = this.apollo
        .mutate<EditRecordMutationResponse>({
          mutation: EDIT_RECORD,
          variables: {
            id,
            data,
          },
        })
        .pipe(takeUntil(destroySubject))
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
            // Complete the subject to clean up
            destroySubject.next();
            destroySubject.complete();
            this.activeSubscriptions.delete(subscription);
          },
          error: (err) => {
            console.error('Error updating record:', err);
            destroySubject.next();
            destroySubject.complete();
            this.activeSubscriptions.delete(subscription);
          },
        });

      // Track this subscription
      this.activeSubscriptions.add(subscription);
    }
  }
}
