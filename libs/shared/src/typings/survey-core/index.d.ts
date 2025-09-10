/* eslint-disable jsdoc/require-jsdoc */
import { QuestionCustomModel, Event } from 'survey-core';
import 'survey-core';

declare module 'survey-core' {
  // Question/Panel extends SurveyElement, so no need to redeclare the tooltip in those;
  interface SurveyElement {
    tooltip?: string;
  }

  interface QuestionTextModel {
    dateMin?: Date;
    dateMax?: Date;
  }

  interface QuestionCommentModel {
    allowEdition?: boolean;
  }

  // This is the base class for dropdown, checkbox, radiogroup, etc.
  interface QuestionSelectBase {
    referenceData?: string;
    referenceDataDisplayField?: string;
    isPrimitiveValue?: boolean;
    referenceDataFilterFilterFromQuestion?: string;
    referenceDataFilterForeignField?: string;
    referenceDataFilterFilterCondition?: string;
    referenceDataFilterLocalField?: string;
    referenceDataChoicesLoaded?: boolean;
  }

  // Augmenting MatrixDropdownColumn from survey-core
  interface MatrixDropdownColumn {
    referenceData?: string;
    referenceDataDisplayField?: string;
    isPrimitiveValue?: boolean;
    referenceDataFilterFilterFromQuestion?: string;
    referenceDataFilterForeignField?: string;
    referenceDataFilterFilterCondition?: string;
    referenceDataFilterLocalField?: string;
    referenceDataChoicesLoaded?: boolean;
  }

  interface QuestionUsers extends QuestionCustomModel {
    applications?: any;
    inviteUsers?: boolean;
    availableRoles?: string[];
  }

  interface QuestionResource extends QuestionCustomModel {
    resource?: string;
    displayField: null | string;
    relatedName?: string;
    addRecord?: boolean;
    alwaysCreateRecord?: boolean;
    canSearch?: boolean;
    addTemplate?: any;
    placeholder?: string;
    prefillWithCurrentRecord?: boolean;
    selectQuestion?: any;
    contentQuestion: QuestionDropdownModel;
    gridFieldsSettings?: any;
    filterCondition: string;
    filterBy: string;
    staticValue: string;
    customFilter: string;
    displayAsGrid: boolean;
    remove?: boolean;
    template?: string;
    draftData?: any;
    canOnlyCreateRecords?: boolean;
  }

  interface QuestionOwner extends QuestionCustomModel {
    applications?: string | string[];
    contentQuestion: SurveyCoreQuestionSelectBase;
  }

  // Augmenting base Question (properties applicable to most question types)
  interface Question {
    valueExpression?: string;
    clearIf?: string;
    validateOnValueChange?: boolean;
    omitField?: boolean;
    omitOnXlsxTemplate?: boolean;
  }

  // Augmenting SurveyModel (properties for the survey object itself)
  interface SurveyModel {
    openOnPageByQuestionValue?: string;
    openOnPage?: string;
    hidePagesTab?: boolean;
    hideNavigationButtons?: boolean;
    showCloseButtonOnModal?: boolean;
    confirmOnModalClose?: boolean;
    saveButtonText?: string;
    showDeleteButtonOnModal?: boolean;
    autoSave?: boolean;
    canBeCommented?: boolean;
    showPercentageProgressBar?: boolean;
    defaultLanguage?: string;
    allowUploadRecords?: boolean;
    generateNewRecordOid?: boolean;
    onDispose: Event<() => void, SurveyModel, undefined>;
  }

  // Augmenting PanelModel (properties for panels)
  interface PanelModel {
    elementClasses?: string;
  }

  // Augmenting QuestionPanelDynamicModel (properties for dynamic panels)
  interface QuestionPanelDynamicModel {
    allowAddPanelExpression?: string;
    allowRemovePanelExpression?: string;
    startOnLastElement?: boolean;
    sortBySubQuestion?: string;
    sortDirection?: 'asc' | 'desc';
    allowImport?: boolean;
  }

  // Augmenting QuestionMatrixModel (properties for matrix questions)
  interface QuestionMatrixModel {
    copyRowsFromAnotherMatrix?: string | null;
  }

  // Augmenting QuestionMatrixDropdownModel (properties for matrix dropdown questions)
  interface QuestionMatrixDropdownModel {
    copyRowsFromAnotherMatrix?: string | null;
    copyColumnsFromAnotherMatrix?: string | null;
  }

  // Augmenting QuestionMatrixDynamicModel (properties for dynamic matrix questions)
  interface QuestionMatrixDynamicModel {
    allowImport?: boolean;
    copyColumnsFromAnotherMatrix?: string | null;
  }
}
