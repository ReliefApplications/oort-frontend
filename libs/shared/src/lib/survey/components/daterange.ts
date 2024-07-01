import {
  ComponentCollection,
  JsonMetadata,
  Serializer,
  SvgRegistry,
} from 'survey-core';
import { Question, QuestionText } from '../types';
import { DomService } from '../../services/dom/dom.service';
import { CustomPropertyGridComponentTypes } from './utils/components.enum';
import { registerCustomPropertyEditor } from './utils/component-register';
import { DateRangeComponent } from './date-range/date-range.component';

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
      // hides the input element
      const element = el.getElementsByTagName('input')[0].parentElement;
      if (element) element.style.display = 'none';

      const data = question.toJSON();

      // check if it has date min and date max before render
      if (data.dateMin && data.dateMax) {
        const dateMinMilliseconds = new Date(data.dateMin).getTime(); // Get the time in milliseconds since the Unix epoch
        const dateMaxMilliseconds = new Date(data.dateMax).getTime(); // Get the time in milliseconds since the Unix epoch

        // check if date max is later than date min
        if (dateMaxMilliseconds > dateMinMilliseconds) {
          // render the DateRangeComponent
          const daterange = domService.appendComponentToBody(
            DateRangeComponent,
            el
          );
          const instance: DateRangeComponent = daterange.instance;

          instance.dateMin = data.dateMin;
          instance.dateMax = data.dateMax;

          // inits the map with the value of the question
          if (question.value) instance.data = question.value;

          // updates the question value when the range changes
          instance.dateChange.subscribe((res) => {
            question.value = res;
          });
        }
      }
    },
  };
  componentCollectionInstance.add(component);
};
