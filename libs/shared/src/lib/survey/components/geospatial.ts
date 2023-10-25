import { JsonMetadata, Question } from 'survey-angular';
import { GeospatialMapComponent } from '../../components/geospatial-map/geospatial-map.component';
import { DomService } from '../../services/dom/dom.service';
import { SurveyPropertyEditorFactory } from 'survey-creator';
import {
  ALL_FIELDS,
  GeofieldsListboxComponent,
} from '../../components/geofields-listbox/geofields-listbox.component';
import { BASEMAPS } from '../../components/ui/map/const/baseMaps';

/**
 * Extract geofields from question ( to match with latest version of the available ones )
 *
 * @param question Geospatial question
 * @returns clean list of selected geofields
 */
const getGeoFields = (question: any) => {
  const rawSelectedFields: any[] = (question.geoFields || []).map(
    (field: any) =>
      typeof field === 'string'
        ? {
            value: field,
            label: ALL_FIELDS.find((x) => x.value === field)?.label || field,
          }
        : field
  );
  return rawSelectedFields.filter((x) =>
    (ALL_FIELDS.map((field) => field.value) as string[]).includes(x.value)
  );
};

/**
 * Inits the geospatial component.
 *
 * @param Survey Survey library.
 * @param domService DOM service.
 */
export const init = (Survey: any, domService: DomService): void => {
  // registers icon-geospatial in the SurveyJS library
  Survey.SvgRegistry.registerIconFromSvg(
    'geospatial',
    '<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 0 24 24" width="18px" fill="#000000"> <path d="M0 0h24v24H0V0z" fill="none" /> <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM10 5.47l4 1.4v11.66l-4-1.4V5.47zm-5 .99l3-1.01v11.7l-3 1.16V6.46zm14 11.08l-3 1.01V6.86l3-1.16v11.84z" /></svg>'
  );

  const component = {
    name: 'geospatial',
    title: 'Geospatial',
    iconName: 'icon-geospatial',
    questionJSON: {
      name: 'geospatial',
      type: 'text',
    },
    category: 'Custom Questions',
    onInit: (): void => {
      const serializer: JsonMetadata = Survey.Serializer;
      // Geospatial type
      serializer.addProperty('geospatial', {
        name: 'geometry',
        type: 'dropdown',
        category: 'general',
        required: true,
        default: 'Point',
        choices: ['Point'],
      });
      // Display geofields
      serializer.addProperty('geospatial', {
        name: 'geoFields',
        category: 'Map Properties',
        type: 'listBox',
        visibleIndex: 2,
        // dependsOn: ['geometry'],
        // visibleIf: (obj: null | any) => !!obj && obj.geometry === 'POINT',
      });

      // Base map
      serializer.addProperty('geospatial', {
        name: 'BaseMap',
        type: 'dropdown',
        category: 'Map Properties',
        visibleIndex: 3,
        default: 'streets',
        choices: BASEMAPS,
      });

      // Default zoom
      serializer.addProperty('geospatial', {
        name: 'DefaultZoom',
        type: 'number',
        category: 'Map Properties',
        visibleIndex: 4,
        default: 0,
      });

      // Latitude
      serializer.addProperty('geospatial', {
        name: 'Latitude',
        type: 'number',
        minValue: -90,
        maxValue: 90,
        category: 'Map Properties',
        visibleIndex: 5,
        default: 0,
      });

      // Longitude
      serializer.addProperty('geospatial', {
        name: 'Longitude',
        type: 'number',
        category: 'Map Properties',
        minValue: -180,
        maxValue: 180,
        visibleIndex: 6,
        default: 0,
      });

      // Tagbox
      const listBoxEditor = {
        render: (editor: any, htmlElement: HTMLElement) => {
          const question = editor.object;
          const listbox = domService.appendComponentToBody(
            GeofieldsListboxComponent,
            htmlElement
          );
          const instance: GeofieldsListboxComponent = listbox.instance;
          instance.selectedFields = getGeoFields(question);
          instance.selectionChange.subscribe((fields) => {
            question.geoFields = fields || [];
          });
        },
      };
      SurveyPropertyEditorFactory.registerCustomEditor(
        'listBox',
        listBoxEditor
      );
    },
    onAfterRender: (question: Question, el: HTMLElement): void => {
      // hides the input element
      const element = el.getElementsByTagName('input')[0].parentElement;
      if (element) element.style.display = 'none';

      // render the GeospatialMapComponent
      const map = domService.appendComponentToBody(GeospatialMapComponent, el);
      const instance: GeospatialMapComponent = map.instance;

      // inits the map with the value of the question
      if (question.value) instance.data = question.value;

      // Set geo fields
      instance.fields = getGeoFields(question);

      // Set base map
      instance.mapSettings.basemap = question.BaseMap;

      // Set default zoom
      instance.mapSettings.initialState = {
        viewpoint: {
          center: {
            latitude: question.Latitude,
            longitude: question.Longitude,
          },
          zoom: question.DefaultZoom,
        },
      };

      // Listen to change on geofields
      question.registerFunctionOnPropertyValueChanged('geoFields', () => {
        instance.fields = question.geoFields;
      });

      // Listen to change on base map
      question.registerFunctionOnPropertyValueChanged('BaseMap', () => {
        instance.mapSettings = {
          ...instance.mapSettings,
          basemap: question.BaseMap,
        };
      });

      // Listen to change on default zoom
      question.registerFunctionOnPropertyValueChanged('DefaultZoom', () => {
        instance.mapSettings = {
          ...instance.mapSettings,
          initialState: {
            ...instance.mapSettings.initialState,
            viewpoint: {
              ...instance.mapSettings.initialState.viewpoint,
              zoom: question.DefaultZoom,
            },
          },
        };
      });

      // Listen to change on latitude
      question.registerFunctionOnPropertyValueChanged('Latitude', () => {
        const viewpoint = {
          ...instance.mapSettings.initialState.viewpoint,
          center: {
            ...instance.mapSettings.initialState.viewpoint.center,
            latitude: question.Latitude,
          },
        };
        instance.mapSettings = {
          ...instance.mapSettings,
          initialState: {
            ...instance.mapSettings.initialState,
            viewpoint,
          },
        };
      });

      // Listen to change on longitude
      question.registerFunctionOnPropertyValueChanged('Longitude', () => {
        const viewpoint = {
          ...instance.mapSettings.initialState.viewpoint,
          center: {
            ...instance.mapSettings.initialState.viewpoint.center,
            longitude: question.Longitude,
          },
        };
        instance.mapSettings = {
          ...instance.mapSettings,
          initialState: {
            ...instance.mapSettings.initialState,
            viewpoint,
          },
        };
      });

      // updates the question value when the map changes
      instance.mapChange.subscribe((res) => {
        question.value = res;
      });
    },
  };
  Survey.ComponentCollection.Instance.add(component);
};
