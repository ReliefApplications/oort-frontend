import {
  AfterViewInit,
  Component,
  inject,
  Inject,
  Injector,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { PageModel, SurveyModel, Question } from 'survey-core';
import { SurveyCreatorModel } from 'survey-creator-core';
import { SurveyCreatorModule } from 'survey-creator-angular';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { FormService } from '../../../services/form/form.service';
import { CommonModule } from '@angular/common';
import { FormBuilderModule } from '../../form-builder/form-builder.module';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule, SnackbarService, TooltipModule } from '@oort-front/ui';
import { DialogModule, AlertModule } from '@oort-front/ui';
import { renderGlobalProperties } from '../../../survey/render-global-properties';
import { FormHelpersService } from '../../../services/form-helper/form-helper.service';
import { CustomQuestionTypes } from '../../../survey/custom-question-types';
import { SurveyCustomJSONEditorPlugin } from '../../form-builder/custom-json-editor/custom-json-editor.component';
import { updateModalChoicesAndValue } from '../../../survey/global-properties/reference-data';
// Add new languages
import 'survey-core/i18n/french';
import 'survey-core/i18n/spanish';
import {
  CORE_QUESTION_ALLOWED_PROPERTIES,
  DEFAULT_STRUCTURE,
  NAVIGATION_PROPERTIES,
  QUESTION_TYPES,
} from './filter-builder-modal.const';
import { CUSTOM_THEME } from '../../../survey/form-builder.theme';

/**
 * Data passed to initialize the filter builder
 */
interface DialogData {
  surveyStructure: any;
}

/**
 * Filter builder component
 */
@Component({
  standalone: true,
  selector: 'shared-filter-builder-modal',
  templateUrl: './filter-builder-modal.component.html',
  styleUrls: [
    '../../../style/survey.scss',
    './filter-builder-modal.component.scss',
  ],
  imports: [
    CommonModule,
    FormBuilderModule,
    TranslateModule,
    TooltipModule,
    DialogModule,
    AlertModule,
    SurveyCreatorModule,
    ButtonModule,
  ],
})
export class FilterBuilderModalComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  /** Survey creator instance */
  surveyCreator!: SurveyCreatorModel;
  /** Injector */
  private injector = inject(Injector);

  /**
   * Dialog component to build the filter
   *
   * @param formService Shared form service
   * @param dialogRef reference to the dialog component
   * @param data data passed to initialize the filter builder
   * @param formHelpersService Shared form helper service.
   * @param snackBar Service that will be used to display the snackbar.
   */
  constructor(
    private formService: FormService,
    private dialogRef: DialogRef<FilterBuilderModalComponent>,
    @Inject(DIALOG_DATA) public data: DialogData,
    private formHelpersService: FormHelpersService,
    private snackBar: SnackbarService
  ) {}

  ngOnInit(): void {
    // Initialize survey creator instance with selected custom questions
    this.formService.initialize({
      customQuestions: [
        CustomQuestionTypes.RESOURCE,
        CustomQuestionTypes.RESOURCES,
        CustomQuestionTypes.USERS,
      ],
    });
  }

  ngAfterViewInit(): void {
    this.setFormBuilder();
  }

  /**
   * Creates the form builder and sets up all the options.
   */
  private setFormBuilder() {
    const creatorOptions = {
      showEmbededSurveyTab: false,
      showJSONEditorTab: false,
      generateValidJSON: true,
      showTranslationTab: false,
      questionTypes: QUESTION_TYPES,
    };
    this.surveyCreator = new SurveyCreatorModel(creatorOptions);

    this.surveyCreator.applyCreatorTheme(CUSTOM_THEME);

    new SurveyCustomJSONEditorPlugin(this.surveyCreator);

    // this.surveyCreator.text = '';
    this.surveyCreator.showToolbox = true;
    this.surveyCreator.toolboxLocation = 'right';
    this.surveyCreator.showSidebar = true;
    this.surveyCreator.sidebarLocation = 'right';
    this.surveyCreator.haveCommercialLicense = true;
    this.surveyCreator.saveSurveyFunc = this.saveMySurvey;
    this.surveyCreator.allowChangeThemeInPreview = false;

    // Block core fields edition
    this.surveyCreator.onShowingProperty.add((sender: any, opt: any) => {
      // Disable navigation properties
      if (NAVIGATION_PROPERTIES.includes(opt.property.name)) {
        opt.canShow = false;
      }

      // opt: { obj: any, property: Survey.JsonObjectProperty, canShow: boolean and more...}
      const obj = opt.obj;
      if (!obj || !obj.page) {
        return;
      }

      // If it is a core field
      if (!CORE_QUESTION_ALLOWED_PROPERTIES.includes(opt.property.name)) {
        opt.canShow = false;
      }
    });
    // Reset property grid to let it handle onShowingProperty event (cf doc)
    this.surveyCreator.JSON = {};

    // Set content
    const survey = new SurveyModel(
      this.data?.surveyStructure || DEFAULT_STRUCTURE
    );
    this.surveyCreator.JSON = survey.toJSON();

    // add the rendering of custom properties
    this.surveyCreator.survey.onAfterRenderQuestion.add(
      renderGlobalProperties(this.injector) as any
    );
    (this.surveyCreator.onTestSurveyCreated as any).add(
      (sender: any, opt: any) =>
        opt.survey.onAfterRenderQuestion.add(
          renderGlobalProperties(this.injector)
        )
    );

    this.surveyCreator.onPropertyGridShowModal.add(updateModalChoicesAndValue);
  }

  /**
   * Custom SurveyJS method, save the survey when edited.
   */
  saveMySurvey = () => {
    this.validateValueNames()
      .then((canCreate: boolean) => {
        if (canCreate) {
          this.dialogRef.close(this.surveyCreator.text as any);
        }
      })
      .catch((error) => {
        this.snackBar.openSnackBar(error.message, {
          error: true,
          duration: 15000,
        });
      });
  };

  /**
   * Makes sure that value names are existent and snake case, to not cause backend problems.
   *
   * @returns if the validation is approved and can create the survey
   */
  private async validateValueNames(): Promise<boolean> {
    const survey = new SurveyModel(this.surveyCreator.JSON);
    const canCreate: boolean = survey.pages.every((page: PageModel) =>
      page.questions.every(
        // Created the valueName for every question. If valueName exists but with wrong format,
        // raise an error and don't create survey
        (question: Question) =>
          this.formHelpersService.setValueName(question, page)
      )
    );
    this.surveyCreator.JSON = survey.toJSON();
    return canCreate;
  }

  ngOnDestroy(): void {
    //Once we destroy the dashboard filter survey, set the survey creator with the custom questions config
    this.formService.initialize();
  }
}
