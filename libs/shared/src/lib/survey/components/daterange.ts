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
  // registers icon-daterange in the SurveyJS library
  SvgRegistry.registerIconFromSvg(
    'icon-daterange',
    '<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V10h14v9zm0-11H5V5h14v3z"/><path d="M7 12h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/></svg>'
  );

  const component = {
    name: 'daterange',
    title: 'Date Range',
    iconName: 'icon-daterange',
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
    /**
     * Set default date min and date max
     *
     * @param question The current resource question
     */
    onLoaded(question: Question): void {
      const data = question.toJSON();
      if (!data.dateMin) {
        question.dateMin = new Date();
      }

      if (!data.dateMax) {
        question.dateMax = new Date(new Date().getTime() + 24 * 60 * 60 * 1000); // one day later before the current
        question.update;
      }
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
