import { ICreatorTheme, registerCreatorTheme } from 'survey-creator-core';

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

/**
 * Custom theme for SurveyJS creator
 */
export const CUSTOM_THEME: ICreatorTheme = {
  themeName: 'oort',
  cssVariables: {
    // '--sjs-layer-1-background-500': '#FFFFFFFF',
    //     '--sjs-layer-1-background-400': '#E6EBF9FF',
    //     '--sjs-layer-1-foreground-100': '#122243FF',
    //     '--sjs-layer-1-foreground-50': '#0E205580',
    //     '--sjs-layer-3-background-500': '#EAF0FBFF',
    //     '--sjs-layer-3-foreground-100': '#273859FF',
    //     '--sjs-layer-3-foreground-50': '#26335880',
    //     '--sjs-layer-2-background-500': '#F2F6FDFF',
    //     '--sjs-layer-2-background-400': '#DAE2F7FF',
    '--sjs-special-haze': '#0177D540',
    '--sjs-border-25': '#C2CEE6FF',
    '--sjs-border-10': '#CDD7EAFF',
    '--sjs-primary-background-500': '#0177D5FF',
    '--sjs-primary-background-10': '#0177D51A',
    '--sjs-primary-background-400': '#0160ABFF',
    '--sjs-primary-foreground-100': '#FFFFFFFF',
    '--sjs-primary-foreground-25': '#FFFFFF40',
    '--sjs-secondary-background-500': '#E4A429FF',
    '--sjs-secondary-background-25': '#E4A42940',
    '--sjs-secondary-background-10': '#E4A4291A',
    '--sjs-secondary-foreground-100': '#FFFFFFFF',
    '--sjs-secondary-forecolor-25': '#FFFFFF40',
    '--sjs-semantic-red-background-500': '#D6378AFF',
    '--sjs-semantic-red-background-10': '#D6378A1A',
    '--sjs-semantic-red-foreground-100': '#FFFFFFFF',
    '--sjs-semantic-green-background-500': '#19B394FF',
    '--sjs-semantic-green-background-10': '#19B3941A',
    '--sjs-semantic-green-foreground-100': '#FFFFFFFF',
    '--sjs-semantic-blue-background-500': '#437FD9FF',
    '--sjs-semantic-blue-background-10': '#437FD91A',
    '--sjs-semantic-blue-foreground-100': '#FFFFFFFF',
    '--sjs-semantic-yellow-background-500': '#FF9814FF',
    '--sjs-semantic-yellow-background-10': '#FF98141A',
    '--sjs-semantic-yellow-foreground-100': '#FFFFFFFF',
    '--sjs-semantic-white-background-500': '#FFFFFFFF',
    '--sjs-code-gray-700': '#B6B6B6FF',
    '--sjs-code-blue-500': '#326FCAFF',
    '--sjs-code-gray-300': '#505050FF',
    '--sjs-code-green-500': '#08997CFF',
    '--sjs-code-red-500': '#F41B50FF',
    '--sjs-code-purple-500': '#C22FA2FF',
    '--sjs-code-yellow-500': '#F58D06FF',
    '--sjs-code-gray-500': '#8A8A8AFF',
    '--sjs-special-background': '#F1F4F6',
    '--sjs-layer-1-foreground-75': '#0177D5FF',
    '--sjs-layer-3-background-400': '#D3DDF5FF',
    '--sjs-special-glow': '#27385933',
    '--sjs-special-shadow': '#27385940',
    '--sjs-layer-3-foreground-75': '#0177D5FF',
    '--sjs-layer-2-foreground-100': '#273859FF',
    '--sjs-layer-2-foreground-75': '#0177D5FF',
    '--sjs-layer-2-foreground-50': '#26335880',
    '--sjs-border-25-overlay': '#00000026',
    '--sjs-secondary-background-400': '#C88D21FF',
  },
};

registerCreatorTheme(CUSTOM_THEME);
