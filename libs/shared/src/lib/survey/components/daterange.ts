import {
  ComponentCollection,
  JsonMetadata,
  Serializer,
  SvgRegistry,
} from 'survey-core';
import { Question } from '../types';
import { DomService } from '../../services/dom/dom.service';
import { CustomPropertyGridComponentTypes } from './utils/components.enum';
import { registerCustomPropertyEditor } from './utils/component-register';

/**
 * Inits the geospatial component.
 *
 * @param domService DOM service.
 * @param componentCollectionInstance ComponentCollection
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
      step: 0.5,
    },
    category: 'Custom Questions',
    onInit: (): void => {
      const serializer: JsonMetadata = Serializer;
      // initial date
      serializer.addProperty('daterange', {
        name: 'dateMin',
        type: CustomPropertyGridComponentTypes.dateTypeDisplayer,
        category: 'Custom Questions',
        visibleIndex: 8,
        dependsOn: 'inputType',
        onPropertyEditorUpdate: (obj: any, propertyEditor: any) => {
          if (!!obj && !!obj.inputType) {
            propertyEditor.inputType = obj.inputType;
          }
        },
        onSetValue: (obj: any, value: any) => {
          obj.setPropertyValue('dateMin', value);
          obj.setPropertyValue('min', value);
        },
      });
      registerCustomPropertyEditor(
        CustomPropertyGridComponentTypes.dateTypeDisplayer
      );
    },
    onAfterRender: (question: Question, el: HTMLElement): void => {
      console.log(question);
      console.log(el);
      // hides the input element
      // const element = el.getElementsByTagName('input')[0].parentElement;
      // if (element) element.style.display = 'none';

      // render the GeospatialMapComponent
      // const map = domService.appendComponentToBody(GeospatialMapComponent, el);
      // const instance: GeospatialMapComponent = map.instance;

      // // inits the map with the value of the question
      // if (question.value) instance.data = question.value;

      // // Set geo fields
      // instance.fields = getGeoFields(question);

      // // Listen to change on geofields
      // question.registerFunctionOnPropertyValueChanged('geoFields', () => {
      //   instance.fields = question.geoFields;
      // });

      // // updates the question value when the map changes
      // instance.mapChange.subscribe((res) => {
      //   question.value = res;
      // });
    },
  };
  componentCollectionInstance.add(component);
};
