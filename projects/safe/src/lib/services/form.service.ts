import { Inject, Injectable } from '@angular/core';
import * as SurveyKo from 'survey-knockout';
import * as Survey from 'survey-angular';
import { initCreatorSettings } from '../survey/creator';
import { initCustomWidgets } from '../survey/init';
import { Record } from '../models/record.model';
@Injectable({
  providedIn: 'root'
})
export class FormService {

  constructor(@Inject('environment') environment: any) {
    // === CUSTOM WIDGETS / COMPONENTS ===
    initCustomWidgets(SurveyKo, `${environment.API_URL}/graphql`);

    // === CREATOR SETTINGS ===
    initCreatorSettings(SurveyKo);

    // === CUSTOM WIDGETS / COMPONENTS FOR SURVEY ===
    initCustomWidgets(Survey, `${environment.API_URL}/graphql`);
  }
}
