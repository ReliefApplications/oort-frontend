import { Question, SurveyModel } from 'survey-core';
import { GlobalOptions } from './types';

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
  const [questionName] = params;
  if (!this.question._initDone) {
    this.survey.onAfterRenderSurvey.add(() => {
      if (this.question._initDone) {
        return;
      }
      this.question._initDone = true;
      this.question.value = this.survey.data[questionName];
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
