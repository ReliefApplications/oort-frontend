import { AfterRenderQuestionEvent, SurveyModel } from 'survey-core';
import * as OthersProperties from './global-properties/others';
import * as ReferenceDataProperties from './global-properties/reference-data';
import { Injector } from '@angular/core';

/**
 * Render custom properties which are applied to every questions, or to
 * multiple widgets
 *
 * @param injector Angular injector
 * @returns A function which takes the survey instance and some options as args
 */
export const renderGlobalProperties =
  (injector: Injector) =>
  (_: SurveyModel, options: AfterRenderQuestionEvent) => {
    OthersProperties.render(options.question);
    ReferenceDataProperties.render(options.question, injector);
  };
