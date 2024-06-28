import {
  ComponentCollection,
  JsonMetadata,
  Serializer,
  SurveyError,
  SvgRegistry,
} from 'survey-core';
import { Question, QuestionText } from '../types';
import { DomService } from '../../services/dom/dom.service';
import { CustomPropertyGridComponentTypes } from './utils/components.enum';
import { registerCustomPropertyEditor } from './utils/component-register';

/**
 * Inits the geospatial component.
 *
 * @param domService DOM service.
 * @param componentCollectionInstance ComponentCollection
 * @param translateService Angular translate service
 */
export const init = (
  domService: DomService,
  componentCollectionInstance: ComponentCollection
): void => {
  // registers icon-geospatial in the SurveyJS library
  SvgRegistry.registerIconFromSvg(
    'daterange',
    '<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px"> <path d="M0 0h24v24H0V0z" fill="none" /> <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM10 5.47l4 1.4v11.66l-4-1.4V5.47zm-5 .99l3-1.01v11.7l-3 1.16V6.46zm14 11.08l-3 1.01V6.86l3-1.16v11.84z" /></svg>'
  );

  const component = {
    name: 'daterange',
    title: 'Date Range',
    iconName: 'icon-geospatial',
    questionJSON: {
      name: 'daterange',
      type: 'text',
      inputType: 'range',
      step: 1,
      default: 1,
      min: 1,
    },
    category: 'Custom Questions',
    onInit: (): void => {
      const serializer: JsonMetadata = Serializer;
      // min date
      serializer.addProperty('daterange', {
        name: 'dateMin',
        type: CustomPropertyGridComponentTypes.dateTypeDisplayer,
        category: 'Custom questions',
        visibleIndex: 1,
        isRequired: true,
        onPropertyEditorUpdate: (obj: QuestionText, propertyEditor: any) => {
          propertyEditor.inputType = 'date';
        },
        onSetValue: (obj: QuestionText, value: any) => {
          obj.setPropertyValue('dateMin', value);
          // obj.addError(new SurveyError('This is a custom error message'));
          // console.log(obj.hasErrors());
        },
      });
      // max date
      serializer.addProperty('daterange', {
        name: 'dateMax',
        type: CustomPropertyGridComponentTypes.dateTypeDisplayer,
        category: 'Custom questions',
        visibleIndex: 2,
        isRequired: true,
        onPropertyEditorUpdate: (obj: QuestionText, propertyEditor: any) => {
          propertyEditor.inputType = 'date';
        },
        onSetValue: (obj: QuestionText, value: any) => {
          obj.setPropertyValue('dateMax', value);
        },
      });
      // register the editor for type "date" with kendo date picker
      registerCustomPropertyEditor(
        CustomPropertyGridComponentTypes.dateTypeDisplayer
      );
    },
    onAfterRender: (question: Question, el: HTMLElement): void => {
      const data = question.toJSON();
      // console.log(data);
      const dateMin = data.dateMin;
      const date = new Date(dateMin); // Parse the ISO string to a Date object
      // console.log('date = ', date);
      const milliseconds = date.getTime(); // Get the time in milliseconds since the Unix epoch
      const minutes = Math.floor(milliseconds / (1000 * 60)); // Convert milliseconds to minutes

      const dateMax = data.dateMax;
      const date2 = new Date(dateMax); // Parse the ISO string to a Date object
      // console.log('date2 = ', date2);
      const milliseconds2 = date2.getTime(); // Get the time in milliseconds since the Unix epoch
      const minutes2 = Math.floor(milliseconds2 / (1000 * 60)); // Convert milliseconds to minutes

      const diff = (minutes2 - minutes) / (60 * 24) + 1;

      // Set the max property dynamically
      const inputElement = el.querySelector('input[type="range"]');
      if (inputElement) {
        inputElement.setAttribute('max', diff.toString());
      }
    },
  };
  componentCollectionInstance.add(component);
};
