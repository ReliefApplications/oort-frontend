import {
  Component,
  EventEmitter,
  Inject,
  Input,
  OnChanges,
  OnInit,
  Output,
} from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import * as SurveyCreator from 'survey-creator';
import * as Survey from 'survey-angular';
import { TranslateService } from '@ngx-translate/core';
import { snakeCase, get, uniqBy, difference } from 'lodash';
import { SafeSnackBarService } from '../../services/snackbar/snackbar.service';
import { SafeReferenceDataService } from '../../services/reference-data/reference-data.service';
import { Form } from '../../models/form.model';
import { renderGlobalProperties } from '../../survey/render-global-properties';

/**
 * Array containing the different types of questions.
 * Commented types are not yet implemented.
 */
const QUESTION_TYPES = [
  'text',
  'checkbox',
  'radiogroup',
  'dropdown',
  'comment',
  // 'rating',
  // 'ranking',
  // 'imagepicker',
  'boolean',
  'image',
  'html',
  // 'signaturepad',
  'expression',
  'file',
  'matrix',
  'matrixdropdown',
  'matrixdynamic',
  'multipletext',
  'panel',
  'paneldynamic',
  'tagbox',
];

/**
 * Allowed properties for a core question in a child form.
 */
const CORE_QUESTION_ALLOWED_PROPERTIES = [
  'width',
  'maxWidth',
  'minWidth',
  'startWithNewLine',
  'indent',
  'page',
  'titleLocation',
  'descriptionLocation',
  'state',
  'defaultValue',
  'defaultValueExpression',
  'relatedName',
  'addRecord',
  'addTemplate',
  'Search resource table',
  'visible',
  'readOnly',
  'isRequired',
  'placeHolder',
  'enableIf',
  'visibleIf',
  'tooltip',
];

/**
 * Class name to add to core field question.
 */
const CORE_FIELD_CLASS = 'core-question';

/**
 * Component used to build forms in applications
 */
@Component({
  selector: 'safe-form-builder',
  templateUrl: './form-builder.component.html',
  styleUrls: ['./form-builder.component.scss'],
})
export class SafeFormBuilderComponent implements OnInit, OnChanges {
  @Input() form!: Form;
  @Output() save: EventEmitter<any> = new EventEmitter();
  @Output() formChange: EventEmitter<any> = new EventEmitter();

  // === CREATOR ===
  surveyCreator!: SurveyCreator.SurveyCreator;
  public json: any;

  environment: any;

  /**
   * The constructor function is a special function that is called when a new instance of the class is
   * created.
   *
   * @param environment This is the environment in which we are running the application, it changes the theme of the form builder (color etc.)
   * @param dialog This is the Angular Material Dialog service used to display dialog modals
   * @param snackBar This is the service that will be used to display the snackbar.
   * @param translate Angular translate service
   * @param referenceDataService Reference data service
   */
  constructor(
    @Inject('environment') environment: any,
    public dialog: MatDialog,
    private snackBar: SafeSnackBarService,
    private translate: TranslateService,
    private referenceDataService: SafeReferenceDataService
  ) {
    this.environment = environment;
    // translate the editor in the same language as the interface
    SurveyCreator.localization.currentLocale = this.translate.currentLang;
    this.translate.onLangChange.subscribe(() => {
      SurveyCreator.localization.currentLocale = this.translate.currentLang;
      this.setFormBuilder(this.surveyCreator.text);
    });
  }

  ngOnInit(): void {
    this.setFormBuilder(get(this.form, 'structure', ''));
  }

  ngOnChanges(): void {
    if (this.surveyCreator) {
      this.surveyCreator.text = this.form.structure || '';
      if (!this.form.structure) {
        this.surveyCreator.survey.showQuestionNumbers = 'off';
      }
      // skip if form is core
      if (!this.form.core) {
        const coreFields =
          this.form.fields?.filter((x) => x.isCore).map((x) => x.name) || [];
        // Highlight core fields
        this.addCustomClassToCoreFields(coreFields);
      }

      this.surveyCreator.survey.onUpdateQuestionCssClasses.add(
        (survey: Survey.SurveyModel, options: any) =>
          this.onSetCustomCss(options)
      );

      // add the rendering of custom properties
      this.surveyCreator.survey.onAfterRenderQuestion.add(
        renderGlobalProperties(this.referenceDataService)
      );
    }
  }

  /**
   * Creates the form builder and sets up all the options.
   *
   * @param structure Optional param used as the form struc
   */
  private setFormBuilder(structure: string) {
    const creatorOptions = {
      showEmbededSurveyTab: false,
      showJSONEditorTab: false,
      generateValidJSON: true,
      showTranslationTab: true,
      questionTypes: QUESTION_TYPES,
    };

    this.setCustomTheme();

    this.surveyCreator = new SurveyCreator.SurveyCreator(
      'surveyCreatorContainer',
      creatorOptions
    );
    this.surveyCreator.haveCommercialLicense = true;
    this.surveyCreator.text = structure;
    this.surveyCreator.saveSurveyFunc = this.saveMySurvey;
    this.surveyCreator.showToolbox = 'right';
    this.surveyCreator.showPropertyGrid = 'right';
    this.surveyCreator.rightContainerActiveItem('toolbox');
    if (!this.form.structure) {
      this.surveyCreator.survey.showQuestionNumbers = 'off';
    }
    this.surveyCreator.toolbox.changeCategories(
      QUESTION_TYPES.map((x) => ({
        name: x,
        category: this.translate.instant(
          'pages.formBuilder.questionsCategories.core'
        ),
      }))
    );

    // Notify parent that form structure has changed
    this.surveyCreator.onModified.add((survey: any) => {
      console.log(typeof survey);
      this.formChange.emit(survey.text);
    });
    this.surveyCreator.survey.onUpdateQuestionCssClasses.add(
      (survey: Survey.SurveyModel, options: any) => this.onSetCustomCss(options)
    );
    this.surveyCreator.onTestSurveyCreated.add((sender: any, opt: any) => {
      console.log(typeof opt);
      opt.survey.onUpdateQuestionCssClasses.add((_: any, opt2: any) =>
        this.onSetCustomCss(opt2)
      );
    });

    // === CORE QUESTIONS FOR CHILD FORM ===
    // Skip if form is core
    if (!this.form.core) {
      const coreFields =
        this.form.fields?.filter((x) => x.isCore).map((x) => x.name) || [];
      // Remove core fields adorners
      this.surveyCreator.onElementAllowOperations.add(
        (sender: any, opt: any) => {
          const obj = opt.obj;
          if (!obj || !obj.page) {
            return;
          }
          // If it is a core field
          if (coreFields.includes(obj.valueName)) {
            // Disable deleting, editing, changing type and changing if required or not
            opt.allowDelete = false;
            opt.allowChangeType = false;
            opt.allowChangeRequired = false;
            opt.allowAddToToolbox = false;
            opt.allowCopy = false;
            opt.allowShowEditor = false;
            opt.allowShowHideTitle = false;
            opt.allowDragging = true;
          }
        }
      );
      // Block core fields edition
      this.surveyCreator.onShowingProperty.add((sender: any, opt: any) => {
        const obj = opt.obj;
        if (!obj || !obj.page) {
          return;
        }
        // If it is a core field
        if (
          coreFields.includes(obj.valueName) &&
          !CORE_QUESTION_ALLOWED_PROPERTIES.includes(opt.property.name)
        ) {
          opt.canShow = false;
        }
      });
      // Highlight core fields
      this.addCustomClassToCoreFields(coreFields);
    }

    // Scroll to question when adde
    this.surveyCreator.onQuestionAdded.add((sender: any, opt: any) => {
      const name = opt.question.name;
      setTimeout(() => {
        const el = document.querySelector('[data-name="' + name + '"]');
        el?.scrollIntoView({ behavior: 'smooth' });
        this.surveyCreator.showQuestionEditor(opt.question);
      });
    });

    // add the rendering of custom properties
    this.surveyCreator.survey.onAfterRenderQuestion.add(
      renderGlobalProperties(this.referenceDataService)
    );
    this.surveyCreator.onTestSurveyCreated.add((sender: any, opt: any) =>
      opt.survey.onAfterRenderQuestion.add(
        renderGlobalProperties(this.referenceDataService)
      )
    );
    // this.surveyCreator.survey.locale = this.translate.currentLang; // -> set the defaultLanguage property also
  }

  /**
   * Add new class to questions considered as core fields
   *
   * @param coreFields list of core fields
   */
  private addCustomClassToCoreFields(coreFields: string[]): void {
    this.surveyCreator.survey.onAfterRenderQuestion.add(
      (survey: Survey.SurveyModel, options: any) => {
        if (coreFields.includes(options.question.valueName)) {
          options.htmlElement.children[0].className += ` ${CORE_FIELD_CLASS}`;
        }
      }
    );
  }

  /**
   * Set a theme for the form builder depending on the environment
   */
  setCustomTheme(): void {
    const defaultThemeColorsSurvey = Survey.StylesManager.ThemeColors.default;
    defaultThemeColorsSurvey['$main-color'] = this.environment.theme.primary;
    defaultThemeColorsSurvey['$main-hover-color'] =
      this.environment.theme.primary;

    const defaultThemeColorsEditor =
      SurveyCreator.StylesManager.ThemeColors.default;
    defaultThemeColorsEditor['$primary-color'] = this.environment.theme.primary;
    defaultThemeColorsEditor['$secondary-color'] =
      this.environment.theme.primary;
    defaultThemeColorsEditor['$primary-hover-color'] =
      this.environment.theme.primary;
    defaultThemeColorsEditor['$selection-border-color'] =
      this.environment.theme.primary;

    Survey.StylesManager.applyTheme();
    SurveyCreator.StylesManager.applyTheme();
  }

  /**
   * Custom SurveyJS method, save the form when edited.
   */
  saveMySurvey = () => {
    this.validateValueNames()
      .then(() => {
        this.save.emit(this.surveyCreator.text);
      })
      .catch((error) => {
        this.snackBar.openSnackBar(error.message, { error: true });
      });
  };

  /**
   * Makes sure that value names are existent and snake case, to not cause backend problems.
   */
  private async validateValueNames(): Promise<void> {
    const survey = new Survey.SurveyModel(this.surveyCreator.JSON);
    survey.pages.forEach((page: Survey.PageModel) => {
      page.questions.forEach((question: Survey.Question) =>
        this.setQuestionNames(question, page)
      );
      // Search for duplicated value names
      const duplicatedFields = difference(
        page.questions,
        uniqBy(page.questions, 'valueName')
      );
      if (duplicatedFields.length > 0) {
        throw new Error(
          this.translate.instant(
            'pages.formBuilder.errors.dataFieldDuplicated',
            {
              name: duplicatedFields[0].valueName,
            }
          )
        );
      }
    });
    this.surveyCreator.JSON = survey.toJSON();
  }

  /**
   * Convert a string to snake_case. Overrides the snakeCase function of lodash
   * by first checking if the text is not already in snake case
   *
   * @param text The text to convert
   * @returns The text in snake_case
   */
  private toSnakeCase(text: string): string {
    if (this.isSnakeCase(text)) {
      return text;
    }
    return snakeCase(text);
  }

  /**
   * Checks if a string is already in snake case
   *
   * @param text The text to check
   * @returns True if the text is in snake case, false otherwise
   */
  private isSnakeCase(text: string): any {
    return text.match(/^[a-z]+[a-z0-9_]+$/);
  }

  /**
   * Recursively set the question names of the form.
   *
   * @param question The question of the form whose name we need to set
   * @param page The page of the form
   */
  private setQuestionNames(
    question: Survey.Question,
    page: Survey.PageModel
  ): void {
    // create the valueName of the element in snake case
    if (!question.valueName) {
      if (question.title) {
        question.valueName = this.toSnakeCase(question.title);
      } else if (question.name) {
        question.valueName = this.toSnakeCase(question.name);
      } else {
        throw new Error(
          this.translate.instant('pages.formBuilder.errors.missingName', {
            page: page.name,
          })
        );
      }
    } else {
      if (!this.isSnakeCase(question.valueName)) {
        throw new Error(
          this.translate.instant('pages.formBuilder.errors.snakecase', {
            name: question.valueName,
            page: page.name,
          })
        );
      }
    }
    // if choices object exists, checks for duplicate values
    if (question.choices) {
      const values = question.choices.map(
        (choice: { value: string; text: string }) => choice.value || choice
      );
      const distinctValues = [...new Set(values)];

      if (values.length > distinctValues.length) {
        throw new Error(
          this.translate.instant(
            'pages.formBuilder.errors.choices.valueDuplicated',
            {
              question: question.valueName,
            }
          )
        );
      }
    }
    if (question.getType() === 'multipletext') {
      question.items.forEach((item: any) => {
        if (!item.name && !item.title) {
          throw new Error(
            this.translate.instant(
              'pages.formBuilder.errors.multipletext.missingName',
              {
                question: question.valueName,
              }
            )
          );
        }
        item.name = this.toSnakeCase(item.name);
      });
    }
    if (question.getType() === 'matrix') {
      question.columns.forEach(
        (x: any) => (x.value = this.toSnakeCase(x.value || x.text || x))
      );
      question.rows.forEach(
        (x: any) => (x.value = this.toSnakeCase(x.value || x.text || x))
      );
    }
    if (question.getType() === 'matrixdropdown') {
      question.columns.forEach((x: any) => {
        x.name = this.toSnakeCase(x.name || x.title || x);
        x.title = x.title || x.name || x;
      });
      question.rows.forEach((x: any) => {
        x.value = this.toSnakeCase(x.value || x.text || x);
      });
    }
    if (['resource', 'resources'].includes(question.getType())) {
      if (question.relatedName) {
        question.relatedName = this.toSnakeCase(question.relatedName);
      } else {
        throw new Error(
          this.translate.instant(
            'components.formBuilder.errors.missingRelatedName',
            {
              question: question.name,
              page: page.name,
            }
          )
        );
      }

      if (question.addRecord && !question.addTemplate) {
        throw new Error(
          this.translate.instant(
            'components.formBuilder.errors.missingTemplate',
            {
              question: question.name,
              page: page.name,
            }
          )
        );
      }

      // Error if the user selected Display As Grid without adding an available field.
      if (question.displayAsGrid && !question.gridFieldsSettings) {
        throw new Error(
          this.translate.instant(
            'components.formBuilder.errors.missingGridField',
            {
              question: question.name,
              page: page.name,
            }
          )
        );
      }
    }
    // Check that at least an application is selected in the properties of users and owner question
    if (['users', 'owner'].includes(question.getType())) {
      if (!question.applications) {
        throw new Error(
          this.translate.instant('pages.formBuilder.errors.selectApplication', {
            question: question.name,
            page: page.name,
          })
        );
      }
    }
  }

  /**
   * Add custom CSS classes to the survey elements.
   *
   * @param options survey options.
   */
  private onSetCustomCss(options: any): void {
    const classes = options.cssClasses;
    classes.content += 'safe-qst-content';
  }
}
