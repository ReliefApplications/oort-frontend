import { Apollo } from 'apollo-angular';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { ConfirmService } from '../../services/confirm/confirm.service';
import {
  PanelModel,
  Question,
  QuestionPanelDynamicModel,
  SurveyModel,
} from 'survey-core';
import { ADD_RECORD, EDIT_RECORD } from './graphql/mutations';
import { Form } from '../../models/form.model';
import {
  AddRecordMutationResponse,
  EditRecordMutationResponse,
  Record as RecordModel,
} from '../../models/record.model';
import { BehaviorSubject, interval, Subscription, takeUntil } from 'rxjs';
import addCustomFunctions from '../../survey/custom-functions';
import { AuthService } from '../../services/auth/auth.service';
import {
  FormBuilderService,
  getRootParent,
  TemporaryFilesStorage,
} from '../../services/form-builder/form-builder.service';
import { RecordHistoryComponent } from '../record-history/record-history.component';
import { TranslateService } from '@ngx-translate/core';
import { UnsubscribeComponent } from '../utils/unsubscribe/unsubscribe.component';
import {
  CheckUniqueProprietyReturnT,
  FormHelpersService,
} from '../../services/form-helper/form-helper.service';
import { SnackbarService, UILayoutService } from '@oort-front/ui';
import { DashboardService } from '../../services/dashboard/dashboard.service';
import { DashboardState } from '../../models/dashboard.model';
import { animate, style, transition, trigger } from '@angular/animations';

/** Question type which should not display the add comment button when hovered */
const UNCOMMENTABLE_TYPES = ['html'];

/** Interface of the type of the mapping question o state rules */
interface MapQuestionToState {
  question: string;
  state: string;
  direction: 'questionToState' | 'stateToQuestion' | 'both';
}

/**
 * This component is used to display forms
 */
@Component({
  selector: 'shared-form',
  templateUrl: './form.component.html',
  styleUrls: ['../../style/survey.scss', './form.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({
          opacity: 0,
          width: '0px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }),
        animate(
          '300ms ease-in',
          style({
            opacity: 1,
            width: '*',
          })
        ),
      ]),
      transition(':leave', [
        style({
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }),
        animate(
          '300ms ease-out',
          style({
            opacity: 0,
            width: '0px',
          })
        ),
      ]),
    ]),
  ],
})
export class FormComponent
  extends UnsubscribeComponent
  implements OnInit, OnDestroy, OnChanges
{
  /** Form input */
  @Input() form!: Form;
  /** Record input, optional */
  @Input() record?: RecordModel;
  /** Display actions buttons on floating div, optional */
  @Input() floatingActions = true;
  /** Array of mapping questions to states rules, if form widget on dashboard uses it */
  @Input() mapQuestionState?: MapQuestionToState[];
  /** Output event when saving the form */
  @Output() save: EventEmitter<{
    completed: boolean;
    hideNewRecord?: boolean;
  }> = new EventEmitter();
  /** Edit mode */
  @Input() mode: 'edit' | 'display' = 'edit';
  /** Survey model */
  public survey!: SurveyModel;
  /** Indicates whether the search is active */
  public surveyActive = true;
  /** Temporary storage for files */
  public temporaryFilesStorage: TemporaryFilesStorage = new Map();
  /** Reference to the form container element */
  @ViewChild('formContainer') formContainer!: ElementRef;
  /** Date when the form was last modified */
  public modifiedAt: Date | null = null;
  /** indicates whether the data is from the cache */
  public isFromCacheData = false;
  /** Selected page index */
  public selectedPageIndex: BehaviorSubject<number> =
    new BehaviorSubject<number>(0);
  /** Selected page index as observable */
  public selectedPageIndex$ = this.selectedPageIndex.asObservable();
  /** Available pages*/
  private pages = new BehaviorSubject<any[]>([]);
  /** Pages as observable */
  public pages$ = this.pages.asObservable();
  /** The id of the last draft record that was loaded */
  public lastDraftRecord?: string;
  /** saving operations */
  public saving = false;
  /** Text shown on the save button */
  public saveButtonText = this.translate.instant('common.save');
  /** autosaving operations */
  public autosaving = false;
  /** last date saved */
  public latestSaveDate: Date | null = null;
  /** Timeout for reset survey */
  private resetTimeoutListener!: NodeJS.Timeout;
  /** Submitting state for Save & Submit */
  public submitting = false;
  /** isSaveAndSubmitEnabled state */
  public isSaveAndSubmitEnabled = false;
  /** Auto save interval */
  private autoSaveInterval?: Subscription;
  /** Stringified version of last saved survey data for autosave comparison */
  private lastSavedDataState?: string;

  /**
   * Gets the error questions for current page
   *
   * @returns the error questions for current page
   */
  get errorQuestions() {
    return this.formBuilderService.errorsSummary.filter(
      (error) => error.page === this.selectedPageIndex.value
    );
  }

  /**
   * Returns a list of the panel and dynamic panel questions from current page
   *
   * @returns a list of the panel and dynamic panel questions from current page
   */
  get panels(): (PanelModel | QuestionPanelDynamicModel)[] {
    return this.survey.currentPage.elements.filter(
      (el: Question) =>
        el.getType() === 'panel' || el.getType() === 'paneldynamic'
    );
  }

  /**
   * Whether all panels are collapsed or not
   *
   * @returns the collapsed state
   */
  get collapsed() {
    return this.panels.every((panel) => panel.isCollapsed);
  }

  /**
   * The constructor function is a special function that is called when a new instance of the class is
   * created.
   *
   * @param dialog This is the Angular Dialog service.
   * @param apollo This is the Apollo client that is used to make GraphQL requests.
   * @param snackBar This is the service that allows you to show a snackbar message to the user.
   * @param authService This is the service that handles authentication.
   * @param layoutService UI layout service
   * @param formBuilderService This is the service that will be used to build forms.
   * @param formHelpersService This is the service that will handle forms.
   * @param translate This is the service used to translate text
   * @param dashboardService Shared dashboard service
   * @param confirmService This is the service that will be used to display confirm window.
   */
  constructor(
    public dialog: Dialog,
    private apollo: Apollo,
    private snackBar: SnackbarService,
    private authService: AuthService,
    private layoutService: UILayoutService,
    public formBuilderService: FormBuilderService,
    public formHelpersService: FormHelpersService,
    private translate: TranslateService,
    private dashboardService: DashboardService,
    private confirmService: ConfirmService
  ) {
    super();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes.record &&
      changes.record.currentValue?.id !== changes.record.previousValue?.id
    ) {
      this.initSurvey();
    }
  }

  ngOnInit(): void {
    this.initSurvey();
  }

  /** Sets up listeners to keep mapped fields updated */
  private setupStateMappingListeners(): void {
    this.mapQuestionState?.forEach((rule: MapQuestionToState) => {
      const question = this.survey.getQuestionByName(rule.question);
      if (!question) {
        return;
      }

      if (rule.direction === 'questionToState' || rule.direction === 'both') {
        const updateState = () => {
          const state = this.dashboardService.states
            .getValue()
            .find((s: DashboardState) => s.name === rule.state);
          if (state) {
            this.dashboardService.setDashboardState(question.value, state.id);
          }
        };
        question.registerFunctionOnPropertyValueChanged('value', updateState);
        updateState();
      }

      if (rule.direction === 'stateToQuestion' || rule.direction === 'both') {
        this.dashboardService.states$
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            const states = this.dashboardService.states.getValue();
            const state = states.find(
              (s: DashboardState) => s.name === rule.state
            );
            if (state) {
              if (question.isValueArray && Array.isArray(state.value)) {
                question.value = state.value;
              } else if (
                !question.isValueArray &&
                !Array.isArray(state.value)
              ) {
                question.value = state.value;
              } else if (question.isValueArray && !Array.isArray(state.value)) {
                question.value = [state.value];
              } else {
                question.value = state.value[0];
              }
            }
          });
      }
    });
  }

  /**
   * Reset the survey to empty
   */
  public reset(): void {
    this.survey.clear();
    /** Clear temporary files */
    this.temporaryFilesStorage.clear();
    /** Force reload of the survey so default value are being applied */
    this.survey.fromJSON(this.survey.toJSON());
    /** Adding variables */
    this.formHelpersService.addUserVariables(this.survey);
    this.formHelpersService.addApplicationVariables(this.survey);
    this.formHelpersService.setWorkflowContextVariable(this.survey);
    /** Reset custom variables */
    this.survey.showCompletedPage = false;
    this.save.emit({ completed: false });
    if (this.resetTimeoutListener) {
      clearTimeout(this.resetTimeoutListener);
    }
    this.resetTimeoutListener = setTimeout(
      () => (this.surveyActive = true),
      100
    );
  }

  /**
   * Calls the complete method of the survey if no error.
   */
  public submit(): void {
    this.formHelpersService.validateAndSubmit(
      this.survey,
      {
        // Pass setters for your booleans
        setSaving: (val) => {
          this.saving = val;
        },
        setSubmitting: (val) => {
          this.submitting = val;
        },
      },
      this.destroy$
    );
  }

  /**
   * Saves the current data as a draft record
   */
  public saveAsDraft(): void {
    const callback = (details: {
      id: string;
      save: {
        completed: boolean;
        hideNewRecord: boolean;
      };
    }) => {
      this.surveyActive = true;
      this.lastDraftRecord = details.id;
      // Updates parent component
      this.save.emit(details.save);
    };
    this.formHelpersService.saveAsDraft(
      this.survey,
      this.form.id as string,
      this.temporaryFilesStorage,
      this.lastDraftRecord,
      callback
    );
  }

  /**
   * Creates the record when it is complete, or update it if provided.
   *
   * @param autoSave whether the save is automatic or manual
   */
  private async onComplete(autoSave = false) {
    this.formHelpersService
      .checkUniquePropriety(this.survey)
      .then(async (response: CheckUniqueProprietyReturnT) => {
        if (response.verified) {
          let mutation: any;
          this.surveyActive = autoSave;
          this.autosaving = autoSave;
          this.saving = true;

          await this.formHelpersService.uploadFiles(
            this.temporaryFilesStorage,
            this.form?.id
          );
          this.temporaryFilesStorage.clear();
          if (!autoSave) {
            this.formHelpersService.setEmptyQuestions(this.survey);
          }
          // We wait for the resources questions to update their ids
          await this.formHelpersService.createTemporaryRecords(this.survey);
          const editRecord = !!(autoSave
            ? this.record?.id
            : response.overwriteRecord ??
              (this.record?.id || this.form.uniqueRecord?.id));
          // If is an already saved record, edit it
          if (editRecord) {
            // If update or creation of record is overwriting another record because unique field values
            const recordId = response.overwriteRecord
              ? response.overwriteRecord.id
              : this.record
              ? this.record.id
              : this.form.uniqueRecord?.id;
            mutation = this.apollo.mutate<EditRecordMutationResponse>({
              mutation: EDIT_RECORD,
              variables: {
                id: recordId,
                data: this.survey.getParsedData?.() ?? this.survey.data,
                ...(!response.overwriteRecord && {
                  template:
                    this.form.id !== this.record?.form?.id
                      ? this.form.id
                      : null,
                }),
              },
            });
            // Else create a new one
          } else {
            mutation = this.apollo.mutate<AddRecordMutationResponse>({
              mutation: ADD_RECORD,
              variables: {
                id: this.survey.getVariable('record.id'),
                form: this.form.id,
                data: this.survey.getParsedData?.() ?? this.survey.data,
              },
            });
          }
          mutation
            .pipe(takeUntil(this.destroy$))
            .subscribe(({ errors, data }: any) => {
              if (errors) {
                this.save.emit({ completed: false });
                this.survey.clear(false, true);
                this.surveyActive = true;
                this.snackBar.openSnackBar(errors[0].message, {
                  error: true,
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

                const shouldClearSurvey =
                  !this.submitting &&
                  !this.survey.alwaysShowCompletedPage &&
                  (data.editRecord ||
                    data.addRecord?.form.uniqueRecord ||
                    autoSave);

                if (shouldClearSurvey) {
                  this.survey.clear(false, false);
                  if (data.addRecord) {
                    this.record = data.addRecord;
                    this.modifiedAt = this.record?.modifiedAt || null;
                  } else {
                    this.modifiedAt = data.editRecord?.modifiedAt;
                  }
                  this.surveyActive = true;
                } else if (this.submitting) {
                  if (data.addRecord) {
                    this.record = data.addRecord;
                    this.modifiedAt = this.record?.modifiedAt || null;
                  } else if (data.editRecord) {
                    this.modifiedAt = data.editRecord.modifiedAt;
                  }
                  this.survey.showCompletedPage = true; // Show completion message after Save & Submit
                  this.surveyActive = true;
                } else {
                  this.survey.showCompletedPage = true;
                }

                this.save.emit({
                  completed: true,
                  hideNewRecord: true, // Always hide new record button after submission
                });
              }

              this.saving = false;
              this.autosaving = false;
              this.submitting = false;
              this.latestSaveDate = new Date();
              this.lastSavedDataState = JSON.stringify(this.survey.data ?? {});
            });
        } else {
          this.snackBar.openSnackBar(
            this.translate.instant('components.form.display.cancelMessage')
          );
          this.survey.clear(false);
        }
      });
  }

  /**
   * Handles the show page event
   *
   * @param i Index of the page
   */
  public onShowPage(i: number): void {
    if (this.survey) {
      setTimeout(() => {
        this.survey.currentPageNo = i;
      }, 50);
    }
  }

  /**
   * Closes the survey and empties the temporary and local storage
   */
  public onClear(): void {
    // If unicity of records is set up, do not clear but go back to latest saved version
    if (this.form.uniqueRecord && this.form.uniqueRecord.data) {
      this.survey.data = this.form.uniqueRecord.data;
      this.modifiedAt = this.form.uniqueRecord.modifiedAt || null;
    } else {
      this.survey.clear();
    }
    this.temporaryFilesStorage.clear();
  }

  /**
   * Opens the history of the record on the right side of the screen.
   */
  public onShowHistory(): void {
    if (this.record) {
      this.layoutService.setRightSidenav({
        component: RecordHistoryComponent,
        inputs: {
          id: this.record.id,
          revert: (version: any) =>
            this.confirmRevertDialog(this.record, version),
          resizable: true,
        },
      });
    }
  }

  /**
   * Scrolls to the error
   *
   * @param questionName Question name
   */
  onErrorClick(questionName: string) {
    const question = this.survey.getQuestionByName(questionName);
    if (question) {
      question.focus(false, true);
      setTimeout(() => {
        question._focus?.();
      }, 100);
    }
  }

  /**
   * Toggles the expansion/collapsion of all panels
   */
  toggleAllPanels() {
    const toggle = this.collapsed ? 'expand' : 'collapse';
    this.panels.forEach((panel) => panel[toggle]());
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
        this.apollo
          .mutate<EditRecordMutationResponse>({
            mutation: EDIT_RECORD,
            variables: {
              id: record.id,
              version: version.id,
            },
          })
          .subscribe({
            next: ({ errors }) => {
              if (errors) {
                this.snackBar.openSnackBar(
                  this.translate.instant(
                    'common.notifications.dataNotRecovered'
                  ),
                  { error: true }
                );
              } else {
                this.layoutService.setRightSidenav(null);
                this.snackBar.openSnackBar(
                  this.translate.instant('common.notifications.dataRecovered')
                );
              }
            },
            error: (err) => {
              this.snackBar.openSnackBar(err.message, { error: true });
            },
          });
      }
    });
  }

  /** It removes the item from local storage, clears cached records, and discards the search. */
  override ngOnDestroy(): void {
    super.ngOnDestroy();
    if (this.autoSaveInterval) {
      this.autoSaveInterval.unsubscribe();
    }
    if (this.resetTimeoutListener) {
      clearTimeout(this.resetTimeoutListener);
    }
    this.survey?.dispose();
  }

  /**
   * It adds custom functions, creates the lookup, adds callbacks to the lookup events,
   * fetches cached data from local storage, and sets the lookup data.
   */
  private initSurvey(): void {
    addCustomFunctions({
      record: this.record,
      authService: this.authService,
      apollo: this.apollo,
      form: this.form,
      translateService: this.translate,
    });

    const structure = JSON.parse(this.form.structure || '{}');
    // Override completedHtml with standard message
    if (structure) {
      structure.completedHtml = `<h3>${this.translate.instant(
        'components.form.display.submissionMessage'
      )}</h3>`;
    }

    this.survey = this.formBuilderService.createSurvey(
      JSON.stringify(structure),
      this.form.metadata,
      this.record,
      this.form
    );

    const customSaveText = this.survey.getPropertyValue('saveButtonText');
    if (customSaveText) {
      this.saveButtonText = customSaveText;
    }

    this.survey.onAfterRenderSurvey.add(() => {
      this.setupStateMappingListeners();
    });

    // After the survey is created we add common callback to survey events
    this.formBuilderService.addEventsCallBacksToSurvey(
      this.survey,
      this.selectedPageIndex,
      this.temporaryFilesStorage,
      this.destroy$
    );

    this.survey.showCompletedPage = false;
    if (this.mode === 'display') {
      this.survey.mode = 'display';
    }
    if (!this.record && !this.form.canCreateRecords) {
      this.survey.mode = 'display';
    }

    // Should trigger for comment button creation
    if (this.survey.canBeCommented && this.survey.mode === 'display') {
      this.survey.onAfterRenderQuestion.add((survey, options) => {
        // Replace the focus, as form isn't focusable in display mode
        const el = options.htmlElement;
        const question = this.survey
          .getAllQuestions()
          .find((question) => question.id === options.question.id);
        if (!question || UNCOMMENTABLE_TYPES.includes(question.getType())) {
          // Prevent unreachable question or uncommentable types to trigger comment
          return;
        }

        // Create comment button
        const buttonId = 'comment_button_' + el.id;
        if (document.getElementById(buttonId)) {
          return;
        }

        const button = document.createElement('button');
        button.className = 'comment-button';
        button.id = buttonId;
        button.textContent = '+';

        button.onclick = (e) => {
          e.stopPropagation();

          const { title: rootTitle, name: rootName } = getRootParent(question);
          survey.setVariable('__FOCUSED__.name', question.name);
          survey.setVariable('__FOCUSED__.title', question.title);
          survey.setVariable('__FOCUSED__.root.name', rootName);
          survey.setVariable('__FOCUSED__.root.title', rootTitle);
        };
        el.appendChild(button);
      });
    }

    // Listen to value changes to enable/disable Save & Submit button
    if (this.survey.enableSaveAndSubmit) {
      this.isSaveAndSubmitEnabled =
        this.formHelpersService.evaluateSaveAndSubmitEnableIf(this.survey);
      this.survey.onValueChanged.add(() => {
        this.isSaveAndSubmitEnabled =
          this.formHelpersService.evaluateSaveAndSubmitEnableIf(this.survey);
      });
    }

    // Auto save survey
    if (this.survey.autoSave && this.survey.mode !== 'display') {
      this.autoSaveInterval = interval(15000)
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          // Don't autosave if we're submitting or if completed page is showing
          if (
            !this.saving &&
            !this.autosaving &&
            !this.submitting &&
            !this.survey.showCompletedPage &&
            this.survey.data &&
            Object.keys(this.survey.data).length > 0 &&
            JSON.stringify(this.survey.data) !== this.lastSavedDataState
          ) {
            this.formHelpersService.autoSaveRecord(
              this.onComplete.bind(this, true),
              this.temporaryFilesStorage,
              this.form.id
            );
          }
        });
    }
    this.survey.onComplete.add(() => {
      this.onComplete();
      this.formHelpersService.saveDebounced.cancel();
    });

    // Set readOnly fields
    this.form.fields?.forEach((field) => {
      if (field.readOnly && this.survey.getQuestionByName(field.name))
        this.survey.getQuestionByName(field.name).readOnly = true;
    });

    if (this.form.uniqueRecord && this.form.uniqueRecord.data) {
      this.survey.data = this.form.uniqueRecord.data;
      this.modifiedAt = this.form.uniqueRecord.modifiedAt || null;
    } else if (this.record && this.record.data) {
      this.survey.data = this.record.data;
      this.modifiedAt = this.record.modifiedAt || null;
    }

    // Initialize last saved state for autosave comparison
    this.lastSavedDataState = JSON.stringify(this.survey.data ?? {});

    // if (this.survey.getUsedLocales().length > 1) {
    //   this.survey.getUsedLocales().forEach((lang) => {
    //     const nativeName = (LANGUAGES as any)[lang].nativeName.split(',')[0];
    //     this.usedLocales.push({ value: lang, text: nativeName });
    //     this.dropdownLocales.push(nativeName);
    //   });
    // }

    // Sets default language as form language if it is in survey locales
    // const currentLang = this.usedLocales.find(
    //   (lang) => lang.value === this.translate.currentLang
    // );
    // if (currentLang) {
    //   this.setLanguage(currentLang.text);
    //   this.surveyLanguage = (LANGUAGES as any)[currentLang.value];
    // } else {
    //   this.survey.locale = this.translate.currentLang;
    // }
  }
}
