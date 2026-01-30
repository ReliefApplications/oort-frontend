/**
 * Array containing the different types of questions.
 * Commented types are not yet implemented.
 */
export const QUESTION_TYPES = [
  'text',
  'checkbox',
  'radiogroup',
  'dropdown',
  'tagbox',
  'comment',
  'rating',
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
];

/**
 * Allowed properties for a core question in a child form.
 */
export const CORE_QUESTION_ALLOWED_PROPERTIES = [
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
 * Navigation tab properties (will be disabled).
 */
export const NAVIGATION_PROPERTIES = [
  'showPreviewBeforeComplete',
  'pagePrevText',
  'pageNextText',
  'completeText',
  'previewText',
  'editText',
  'startSurveyText',
  'showNavigationButtons',
  'showPrevButton',
  'firstPageIsStarted',
  'goNextPageAutomatic',
  'showProgressBar',
  'progressBarType',
  'questionsOnPageMode',
  'showTOC',
];

/**
 * Class name to add to core field question.
 */
export const CORE_FIELD_CLASS = 'core-question';
