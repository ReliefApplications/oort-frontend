import { Question, SurveyModel } from 'survey-core';
import { GlobalOptions } from './types';
import { isArray, isNull } from 'lodash';

/**
 * Registration of new custom functions for the survey.
 *
 * @param this Survey instance
 * @param this.question Question instance
 * @param this.survey this survey
 * @param params Params passed to the function
 * @returns The question value
 */
function onInit(
  this: { question: Question; survey: SurveyModel },
  params: any[]
) {
  if (!this.question._initDone && !isNull(params[0])) {
    this.survey.onAfterRenderSurvey.add(() => {
      this.question._initDone = true;
      this.question.value = isArray(this.question.value) ? params : params[0];
    });
  }
  return this.question.value;
}

/**
 * Generator for the custom function onInit.
 *
 * @param _ Global options
 * @returns The custom function onInit
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default (_: GlobalOptions) => onInit;
