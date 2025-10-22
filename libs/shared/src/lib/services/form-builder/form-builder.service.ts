import { inject, Injectable, Injector, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {
  Model,
  Question,
  QuestionFileModel,
  SurveyModel,
  settings,
  IPanel,
  DownloadFileEvent,
  UploadFilesEvent,
  PanelModelBase,
  QuestionPanelDynamicModel,
  MatrixDropdownCell,
  MatrixDropdownColumn,
  Event,
  PageModel,
  QuestionSelectBase,
  ExpressionRunner,
} from 'survey-core';
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
import { marked } from 'marked';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { isSelectQuestion } from '../../survey/global-properties/reference-data';

let counter = Math.floor(Math.random() * 0xffffff); // Initialize counter with a random value

/**
 * Generates a new MongoDB ObjectId.
 *
 * @returns A new ObjectId in the form of a 24-character hexadecimal string.
 */
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

/** Type for the temporary file storage */
export type TemporaryFilesStorage = Map<Question, File[]>;

/**
 * Applies custom logic to survey data values.
 *
 * @param survey Survey instance
 * @returns Transformed survey data
 */
export const transformSurveyData = (survey: SurveyModel) => {
  // Cloning data to avoid mutating the original survey data
  const data = cloneDeep(survey.data) ?? {};

  Object.keys(data).forEach((filed) => {
    const question = survey.getQuestionByName(filed);
    // Removes data that isn't in the structure, that might've come from prefilling data
    if (!question) {
      delete data[filed];
    } else {
      const isQuestionVisible = (question: Question | IPanel): boolean => {
        // If question is not visible, return false
        if (!question.isVisible || !question) {
          return false;
        }

        // If it is, check if its parent is visible
        if (question.parent) {
          return isQuestionVisible(question.parent);
        }

        // If we're in the root and it's visible, return true
        return true;
      };

      // Removes null values for invisible questions (or pages)
      if (
        (!isQuestionVisible(question) && data[filed] === null) ||
        question.omitField
      ) {
        delete data[filed];
      }

      // Remove data from files if from URL
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
  if (survey.showPercentageProgressBar) {
    // isRequiredCpy is declared in the form builder service, and copy the isRequired property of the question we build when using skipRequiredValidation
    const requiredQuestions = getVisibleQuestions(
      survey.getAllQuestions(true)
    ).filter((q) => q.isRequired || q.isRequiredCpy);
    data._progress =
      (requiredQuestions.filter((question: Question) => !question.isEmpty())
        .length *
        100) /
      requiredQuestions.length;
  }
  return data;
};

/**
 * Gets visible questions
 *
 * @param questions current page questions
 * @returns the interesting questions
 */
export const getVisibleQuestions = (questions: Question[]): Question[] => {
  return questions.flatMap((question: Question) => {
    if (question.getType() === 'panel' && question.elements) {
      // If the question is a static panel, recursively get nested questions
      return getVisibleQuestions(question.elements);
    }
    if (question.getType() === 'paneldynamic' && question.panels) {
      // If the question is a dynamic panel, iterate through each panel's elements
      return question.panels.flatMap((panel: any) =>
        getVisibleQuestions(panel.elements)
      );
    }
    // Include questions that are not read-only and are visible
    return !question.readOnly && question.hasInput && question.isVisible
      ? [question]
      : [];
  });
};

/**
 * Gets the outermost parent of a question before page level
 *
 * @param question Question to get the root parent of
 * @returns The title and name of the root
 */
export const getRootParent = (
  question: Question | PanelModelBase
): {
  title: string;
  name: string;
} => {
  if (question.parent?.getType() === 'page') {
    return { title: question.title, name: question.name };
  }

  if ('parentQuestion' in question && question.parentQuestion) {
    return getRootParent(question.parentQuestion);
  } else {
    return getRootParent(question.parent as PanelModelBase);
  }
};

/**
 * Gets the payload for the update mutation
 *
 * @param op Input expression in the form of {key} = "value"
 * @param survey Survey instance
 * @returns Formatted payload for the update mutation
 */
const getUpdateData = (
  op: string,
  survey: SurveyModel
): Record<string, any> | null => {
  if (!op) return null;
  // Op can either be a stringified JSON object or
  // in the form of {key} = "value"
  try {
    // Replace used variables with their values
    survey.getVariableNames().forEach((variable) => {
      op = op.replace(
        new RegExp(`{${variable}}`, 'g'),
        JSON.stringify(survey.getVariable(variable))
      );
    });

    // Replace question template with their values
    survey.getAllQuestions().forEach((question) => {
      op = op.replace(
        new RegExp(`{${question.name}}`, 'g'),
        JSON.stringify(question.value)
      );
    });

    return JSON.parse(op);
  } catch {
    // Original way of parsing the expression.
    // Matches {key} = "value" and returns the key and value
    const regex = /{\s*(\b.*\b)\s*}\s*=\s*"(.*)"/g;
    const operation = regex.exec(op); // divide string into groups for key : value mapping

    return operation
      ? {
          [operation[1]]: operation[2],
        }
      : null;
  }
};

/**
 * Shared form builder service.
 * Only used to add on complete expression to the survey.
 */
@Injectable({
  providedIn: 'root',
})
export class FormBuilderService implements OnDestroy {
  /** If updating record, saves recordId if necessary gets files from questions */
  public recordId?: string;
  /** Summary of the errors of the form */
  public errorsSummary: {
    label: string;
    message: string;
    page: number;
    questionName: string;
  }[] = [];
  /** Injector */
  private injector = inject(Injector);

  /** Track all active subscriptions for memory management */
  private destroy$ = new Subject<void>();

  /** Track survey-specific subscriptions */
  private surveySubscriptions = new Map<SurveyModel, Subject<void>>();

  /**
   * Constructor of the service
   *
   * @param translate Translation service
   * @param apollo Apollo service
   * @param snackBar Service used to show a snackbar.
   * @param restService This is the service that is used to make http requests.
   * @param formHelpersService Shared form helper service.
   */
  constructor(
    private translate: TranslateService,
    private apollo: Apollo,
    private snackBar: SnackbarService,
    private restService: RestService,
    private formHelpersService: FormHelpersService
  ) {}

  /**
   * Clean up all subscriptions when service is destroyed
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    // Clean up all survey-specific subscriptions
    this.surveySubscriptions.forEach((subject) => {
      subject.next();
      subject.complete();
    });
    this.surveySubscriptions.clear();
  }

  /**
   * Get or create a destroy subject for a specific survey
   *
   * @param survey Survey instance
   * @returns Destroy subject for the survey
   */
  private getSurveyDestroy$(survey: SurveyModel): Subject<void> {
    if (!this.surveySubscriptions.has(survey)) {
      this.surveySubscriptions.set(survey, new Subject<void>());
    }
    return this.surveySubscriptions.get(survey) as Subject<void>;
  }

  /**
   * Clean up subscriptions for a specific survey
   *
   * @param survey Survey instance to clean up
   */
  private cleanupSurvey(survey: SurveyModel): void {
    const surveyDestroy$ = this.surveySubscriptions.get(survey);
    if (surveyDestroy$) {
      surveyDestroy$.next();
      surveyDestroy$.complete();
      this.surveySubscriptions.delete(survey);
    }
  }

  /**
   * Creates new survey from the structure and add on complete expression to it.
   *
   * @param structure form structure
   * @param fields list of fields used to check if the fields should be hidden or disabled
   * @param record record that'll be edited, if any
   * @param form form linked to the survey, if any
   * @returns New survey
   */
  createSurvey(
    structure: string,
    fields: Metadata[] = [],
    record?: RecordModel,
    form?: Form
  ): SurveyModel {
    this.errorsSummary = [];
    settings.useCachingForChoicesRestful = false;
    settings.useCachingForChoicesRestfull = false;
    settings.lazyRender = {
      enabled: true,
      firstBatchSize: 10,
    };
    const survey = new Model(structure);
    survey.checkErrorsMode = 'onComplete';

    // Get survey-specific destroy subject
    const surveyDestroy$ = this.getSurveyDestroy$(survey);

    // Cleanup callbacks
    const onDispose = new Event<() => void, SurveyModel, undefined>();
    survey.onDispose = onDispose;
    survey.disposeCallback = () => {
      onDispose.fire(survey, undefined);
      this.cleanupSurvey(survey);
    };

    // Adds function to survey to be able to get the current parsed data
    survey.getParsedData = () => {
      return transformSurveyData(survey);
    };

    // Add form model to the survey
    if (form) {
      survey.form = form;

      // Add resource model to the survey
      if (form.resource) {
        survey.resource = survey.form.resource;
      }
    }

    // Add record model to the survey
    if (record) {
      survey.record = record;
    }
    // Add custom variables
    this.formHelpersService.addUserVariables(survey);
    this.formHelpersService.addApplicationVariables(survey);
    this.formHelpersService.setWorkflowContextVariable(survey);
    if (record) {
      this.recordId = record.id;
      this.formHelpersService.addRecordVariables(survey, record);
    } else if (survey.generateNewRecordOid) {
      survey.setVariable('record.id', createNewObjectId());
    }

    const addQuestionTooltips =
      this.formHelpersService.addQuestionTooltips.bind(this.formHelpersService);

    // Store reference to the event handler for proper cleanup
    const afterRenderQuestionHandler = (_survey: SurveyModel, options: any) => {
      renderGlobalProperties(this.injector)(_survey, options);

      //Add tooltips to questions if exist
      addQuestionTooltips(_survey, options);

      const questionType = options.question.getType();
      switch (questionType) {
        case 'paneldynamic':
          this.formHelpersService.addUploadButton(options);
          this.formHelpersService.orderDynamicPanels(
            options.question as QuestionPanelDynamicModel
          );
          break;
        case 'matrixdynamic':
          this.formHelpersService.addUploadButton(options);
          break;
        case 'file':
          this.formHelpersService.setDownloadListener(options, this.recordId);
          break;
      }
    };
    survey.onAfterRenderQuestion.add(afterRenderQuestionHandler);

    // Store reference to error handler
    const settingQuestionErrorsHandler = (
      sender: SurveyModel,
      options: any
    ) => {
      // Skip required validation if the survey has the _skipRequiredValidation flag set
      // Flag is built by the skipRequiredValidation expression
      if (sender._skipRequiredValidation) {
        for (let i = options.errors.length - 1; i >= 0; i--) {
          const error = options.errors[i];
          if (error.getErrorType() === 'required') {
            options.errors.splice(i, 1);
          }
        }
      }
      const existingError = this.errorsSummary.find(
        (error) => error.questionName == options.question.name
      );
      if (options.errors.length && !existingError) {
        this.errorsSummary.push({
          label: options.question.title,
          message: options.errors[0].getText(),
          page: survey.visiblePages.indexOf(options.question.page as PageModel),
          questionName: options.question.name,
        });
      } else if (existingError) {
        this.errorsSummary = this.errorsSummary.filter(
          (error) => error != existingError
        );
      }
    };
    survey.onSettingQuestionErrors.add(settingQuestionErrorsHandler);

    // Store reference to completing handler
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
            // Newly created records
            const data = getUpdateData(question.afterRecordCreation, survey);
            data && this.updateRecord(recordID, data, surveyDestroy$);
          } else if (question.afterRecordSelection && !wasSelected(recordID)) {
            // Newly selected records
            const data = getUpdateData(question.afterRecordSelection, survey);
            data && this.updateRecord(recordID, data, surveyDestroy$);
          }
        }

        // Now we get the records that were deselected
        const deselectedRecords = difference(initSelection, questionRecords);
        if (question.afterRecordDeselection) {
          for (const recordID of deselectedRecords) {
            const data = getUpdateData(question.afterRecordDeselection, survey);
            data && this.updateRecord(recordID, data, surveyDestroy$);
          }
        }
      });
    };
    survey.onCompleting.add(completingHandler);

    if (fields.length > 0) {
      for (const f of fields.filter((x) => !x.automated)) {
        const accessible = !!f.canSee;
        const editable = !!f.canUpdate;
        const disabled: boolean =
          (f.canUpdate !== undefined && !f.canUpdate) || false;
        const question = survey.getQuestionByName(f.name);
        if (question) {
          //If is not accessible for the current user, we will delete the question from the current survey instance
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
        // Set all the indexes of configured dynamic panel questions in the survey to the last panel.
        if (question.getPropertyValue('startOnLastElement')) {
          question.currentIndex = question.visiblePanelCount - 1;
        }
      }
      // Avoid reference data to be removed when saving & question isn't loaded yet
      if (isSelectQuestion(question)) {
        if (question.referenceData) {
          (question as QuestionSelectBase).keepIncorrectValues = true;
        }
      }
    });

    // Adds upload button
    const showUploadButtonTypes = ['paneldynamic', 'matrixdynamic'];

    // Store reference to upload button handler
    const uploadButtonHandler = (_survey: SurveyModel, options: any) => {
      const questionType = options.question.getType();
      if (
        !showUploadButtonTypes.includes(questionType) ||
        !options.question.allowImport
      ) {
        return;
      }
    };
    survey.onAfterRenderQuestion.add(uploadButtonHandler);

    // Add an array of cells to the matrix obj
    // Store reference to matrix cell handler
    const matrixCellHandler = (_survey: SurveyModel, options: any) => {
      options.question.cells ||= new Map<string, MatrixDropdownCell>();
      const col = options.column as MatrixDropdownColumn;
      const row = options.row.rowName;
      options.question.cells.set(`${row}:${col.name}`, options.cell);
    };
    survey.onMatrixAfterCellRender.add(matrixCellHandler);

    // Store reference to panel render handler
    const panelRenderHandler = (_survey: SurveyModel, options: any) => {
      addQuestionTooltips(_survey, options);
      const htmlClass = options.panel.getPropertyValue('elementClasses');
      if (htmlClass) {
        options.htmlElement.classList.add(...htmlClass.split(' '));
      }
    };
    survey.onAfterRenderPanel.add(panelRenderHandler);

    // Store reference to panel footer handler
    const panelFooterHandler = (_survey: SurveyModel, options: any) => {
      const question = options.question;
      if (!question || question.getType() !== 'paneldynamic') {
        return;
      }
      const expr = question.getPropertyValue('allowRemovePanelExpression');
      if (expr) {
        const canRemove = new ExpressionRunner(expr).run({
          ..._survey.data,
          panel: options.panel.getValue(),
        });
        const removeAction = options.actions.find((a: any) =>
          a.id?.startsWith('remove-panel')
        );
        if (removeAction) {
          removeAction.visible = canRemove;
        }
      }
    };
    survey.onGetPanelFooterActions.add(panelFooterHandler);

    const surveyLocales = survey.getUsedLocales();
    const onLangChange = (lang: string) => {
      if (surveyLocales.includes(lang)) {
        survey.locale = lang;
      } else {
        survey.locale = surveyLocales[0];
      }
    };

    onLangChange(this.translate.currentLang || this.translate.defaultLang);

    // Subscribe to language changes with proper cleanup
    this.translate.onLangChange
      .pipe(takeUntil(surveyDestroy$), takeUntil(this.destroy$))
      .subscribe((e) => {
        onLangChange(e.lang);
      });

    // Set query params as variables
    this.formHelpersService.addQueryParamsVariables(survey);

    survey.showNavigationButtons = 'none';
    if (survey.showPercentageProgressBar) {
      import('../../survey/progress-bar/progress-bar.component').then(() => {
        survey.addLayoutElement({
          id: 'progressbar-percentage',
          component: 'sv-progressbar-percentage',
          container: 'contentTop',
          data: survey,
        });
      });
    }

    // Store reference to markdown handler
    const markdownHandler = (_survey: SurveyModel, options: any) => {
      const str = marked(options.text).trim();
      options.html =
        str.startsWith('<p>') && str.endsWith('</p>')
          ? str.substring(3, str.length - 4)
          : str;
    };
    survey.onTextMarkdown.add(markdownHandler);

    survey.showProgressBar = 'off';
    survey.focusFirstQuestionAutomatic = false;
    survey.applyTheme({ isPanelless: true });
    return survey;
  }

  /**
   * Add common events callbacks to the created survey taking in account pages
   * and temporary files storage
   *
   * @param survey Survey where to add the callbacks
   * @param selectedPageIndex Current page of the survey
   * @param temporaryFilesStorage Temporary files saved while executing the survey
   * @param destroy$ Subject to destroy the subscription
   */
  public addEventsCallBacksToSurvey(
    survey: SurveyModel,
    selectedPageIndex: BehaviorSubject<number>,
    temporaryFilesStorage: TemporaryFilesStorage,
    destroy$: Subject<boolean>
  ): void {
    const surveyDestroy$ = this.getSurveyDestroy$(survey);

    selectedPageIndex
      .asObservable()
      .pipe(takeUntil(surveyDestroy$), takeUntil(destroy$))
      .subscribe((index) => {
        survey.currentPageNo = index;
      });

    // Logic to initialize the survey on a specific page
    if (survey.openOnPageByQuestionValue) {
      const page = survey.getPageByName(
        survey.record?.data[survey.openOnPageByQuestionValue] ?? ''
      );
      if (page) {
        // Store reference to initial page handler
        const setInitialPage = () => {
          selectedPageIndex.next(page.visibleIndex);
          survey.render();
          survey.onAfterRenderSurvey.remove(setInitialPage);
        };
        survey.onAfterRenderSurvey.add(setInitialPage);
      }
    } else if (survey.openOnPage) {
      const page = survey.getPageByName(survey.openOnPage);
      if (page) {
        selectedPageIndex.next(page.visibleIndex);
      }
    }

    survey.getAllQuestions().forEach((question) => {
      // For each question, if validateOnValueChange is true, we will add a listener to the value change event
      if (question.validateOnValueChange) {
        question.registerFunctionOnPropertyValueChanged('value', () => {
          question.validate();
        });
      }

      // Set all the indexes of configured dynamic panel questions in the survey to the last panel.
      if (question.getPropertyValue('startOnLastElement')) {
        question.currentIndex = question.visiblePanelCount - 1;
      }
    });

    // Store reference to event handlers for proper cleanup
    const clearFilesHandler = (_survey: SurveyModel, options: any) =>
      this.onClearFiles(options);
    const uploadFilesHandler = (_survey: SurveyModel, options: any) =>
      this.onUploadFiles(temporaryFilesStorage, options);
    const downloadFileHandler = (
      _survey: SurveyModel,
      options: DownloadFileEvent
    ) => {
      this.onDownloadFile(options);
    };
    const currentPageChangedHandler = (_survey: SurveyModel) => {
      if (_survey.currentPageNo !== selectedPageIndex.getValue()) {
        selectedPageIndex.next(_survey.currentPageNo);
      }
    };
    const focusInQuestionHandler = (_survey: SurveyModel, e: any) => {
      const { title: rootTitle, name: rootName } = getRootParent(e.question);
      _survey.setVariable('__FOCUSED__.name', e.question.name);
      _survey.setVariable('__FOCUSED__.title', e.question.title);
      _survey.setVariable('__FOCUSED__.root.name', rootName);
      _survey.setVariable('__FOCUSED__.root.title', rootTitle);
    };

    // Add event handlers
    survey.onClearFiles.add(clearFilesHandler);
    survey.onUploadFiles.add(uploadFilesHandler);
    survey.onDownloadFile.add(downloadFileHandler);
    survey.onCurrentPageChanged.add(currentPageChangedHandler);
    survey.onFocusInQuestion.add(focusInQuestionHandler);

    // Clean up event handlers when survey is destroyed
    surveyDestroy$.subscribe(() => {
      survey.onClearFiles.remove(clearFilesHandler);
      survey.onUploadFiles.remove(uploadFilesHandler);
      survey.onDownloadFile.remove(downloadFileHandler);
      survey.onCurrentPageChanged.remove(currentPageChangedHandler);
      survey.onFocusInQuestion.remove(focusInQuestionHandler);
    });
  }

  /**
   * Handles the clearing of files
   *
   * @param options Options regarding the files
   */
  private onClearFiles(options: any): void {
    options.callback('success');
  }

  /**
   * Handles the uploading of files event
   *
   * @param temporaryFilesStorage Temporary files saved while executing the survey
   * @param options Options regarding the upload
   */
  private onUploadFiles(
    temporaryFilesStorage: TemporaryFilesStorage,
    options: UploadFilesEvent
  ): void {
    const question = options.question as QuestionFileModel;
    const readFiles = () => {
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
    };

    if (question.name === 'shapefile') {
      const formData = new FormData();
      const headers = new HttpHeaders({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        Accept: 'application/json',
      });
      formData.append('file', options.files[0]);
      this.restService
        .post(`${this.restService.apiUrl}/gis/validate-shapefile`, formData, {
          headers,
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            // JSON is valid, continue
            readFiles();
          },
          error: (error: HttpErrorResponse) => {
            this.snackBar.openSnackBar(error.message, {
              error: true,
              duration: 15000,
            });
            options.callback(null, error);
          },
        });
      // return;
    } else {
      readFiles();
    }
  }

  /**
   * Handles the downloading of a file event
   *
   * @param options Options regarding the download
   */
  private onDownloadFile(options: DownloadFileEvent): void {
    if (options.question.name === 'shapefile') {
      return;
    }
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
      options.callback('success', '');
    }
  }

  /**
   * Updates the field with the specified information.
   *
   * @param id Id of the record to update
   * @param data Data to update
   * @param destroy$ Subject to manage subscription lifecycle
   */
  private updateRecord(id: string, data: any, destroy$: Subject<void>): void {
    if (id && data) {
      this.apollo
        .mutate<EditRecordMutationResponse>({
          mutation: EDIT_RECORD,
          variables: {
            id,
            data,
          },
        })
        .pipe(takeUntil(destroy$), takeUntil(this.destroy$))
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
