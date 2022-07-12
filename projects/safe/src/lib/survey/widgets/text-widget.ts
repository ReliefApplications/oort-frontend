import { DomService } from '../../services/dom.service';
import {
  DatePickerComponent,
  DateTimePickerComponent,
  TimePickerComponent,
} from '@progress/kendo-angular-dateinputs';
import * as SurveyCreator from 'survey-creator';
import { EmbeddedViewRef } from '@angular/core';
import { ButtonCategory } from '../../components/ui/button/button-category.enum';
import { SafeButtonComponent } from '../../components/ui/button/button.component';
import { ButtonSize } from '../../components/ui/button/button-size.enum';
import {
  JsonMetadata,
  Question,
  QuestionText,
  SurveyModel,
} from 'survey-knockout';

type DateInputFormat = 'date' | 'datetime' | 'datetime-local' | 'time';

/**
 * Custom definition for overriding the text question. Allowed support for dates.
 *
 * @param Survey Survey library
 * @param domService Shared DOM service
 */
export const init = (Survey: any, domService: DomService): void => {
  const widget = {
    name: 'text-widget',
    widgetIsLoaded: (): boolean => true,
    isFit: (question: Question): boolean => question.getType() === 'text',
    init: (): void => {
      const serializer: JsonMetadata = Survey.Serializer;
      // hide the min and max property for date, datetime and time types
      serializer.getProperty('text', 'min').visibleIf = (obj: QuestionText) =>
        ['number', 'month', 'week'].includes(obj.inputType || '');
      serializer.getProperty('text', 'max').visibleIf = (obj: QuestionText) =>
        ['number', 'month', 'week'].includes(obj.inputType || '');
      // create new min and max properties for date, datetime and time types
      serializer.addProperty('text', {
        name: 'dateMin',
        type: 'date',
        category: 'general',
        visibleIndex: 8,
        dependsOn: 'inputType',
        visibleIf: (obj: QuestionText) =>
          ['date', 'datetime', 'datetime-local', 'time'].includes(
            obj.inputType || ''
          ),
        onPropertyEditorUpdate: (obj: QuestionText, propertyEditor: any) => {
          if (!!obj && !!obj.inputType) {
            propertyEditor.inputType = obj.inputType;
          }
        },
        onSetValue: (obj: QuestionText, value: any) => {
          obj.setPropertyValue('dateMin', value);
          obj.setPropertyValue('min', value);
        },
      });
      serializer.addProperty('text', {
        name: 'dateMax',
        type: 'date',
        category: 'general',
        visibleIndex: 9,
        dependsOn: 'inputType',
        visibleIf: (obj: QuestionText) =>
          ['date', 'datetime', 'datetime-local', 'time'].includes(
            obj.inputType || ''
          ),
        onPropertyEditorUpdate: (obj: QuestionText, propertyEditor: any) => {
          if (!!obj && !!obj.inputType) {
            propertyEditor.inputType = obj.inputType;
          }
        },
        onSetValue: (obj: QuestionText, value: any) => {
          obj.setPropertyValue('dateMax', value);
          obj.setPropertyValue('max', value);
        },
      });
      // register the editor for type "date" with kendo date picker
      const dateEditor = {
        render: (editor: any, htmlElement: HTMLElement) => {
          const question = editor.object as QuestionText;
          const updatePickerInstance = () => {
            htmlElement.querySelector('.k-widget')?.remove(); // .k-widget class is shared by the 3 types of picker
            const pickerInstance = createPickerInstance(
              question.inputType as DateInputFormat,
              htmlElement
            );
            if (pickerInstance) {
              if (question[editor.property.name as keyof QuestionText]) {
                pickerInstance.value = getDateDisplay(
                  question[editor.property.name as keyof QuestionText],
                  question.inputType
                );
              }
              pickerInstance.registerOnChange((value: Date | null) => {
                if (value) {
                  editor.onChanged(setDateValue(value, question.inputType));
                } else {
                  editor.onChanged(null);
                }
              });
            }
          };
          question.registerFunctionOnPropertyValueChanged(
            'inputType',
            updatePickerInstance,
            // eslint-disable-next-line no-underscore-dangle
            editor.property_.name // a unique key to distinguish multiple date properties
          );
          // Init
          updatePickerInstance();
        },
      };
      SurveyCreator.SurveyPropertyEditorFactory.registerCustomEditor(
        'date',
        dateEditor
      );
    },
    isDefaultRender: true,
    afterRender: (question: QuestionText, el: HTMLInputElement): void => {
      // add kendo date pickers for text inputs with dates types
      const updateTextInput = () => {
        el.parentElement?.querySelector('.k-widget')?.remove(); // .k-widget class is shared by the 3 types of picker
        if (
          ['date', 'datetime', 'datetime-local', 'time'].includes(
            question.inputType
          )
        ) {
          const pickerInstance = createPickerInstance(
            question.inputType as DateInputFormat,
            el.parentElement
          );
          if (pickerInstance) {
            if (question.value) {
              pickerInstance.value = getDateDisplay(
                question.value,
                question.inputType
              );
            }
            if (question.min) {
              pickerInstance.min = getDateDisplay(
                question.min,
                question.inputType
              );
            }
            if (question.max) {
              pickerInstance.max = getDateDisplay(
                question.max,
                question.inputType
              );
            }
            pickerInstance.readonly = question.isReadOnly;
            pickerInstance.disabled = question.isReadOnly;
            pickerInstance.registerOnChange((value: Date | null) => {
              if (value) {
                question.value = setDateValue(value, question.inputType);
              } else {
                question.value = null;
              }
            });
            el.style.display = 'none';
          }
        } else {
          el.style.display = 'initial';
        }
      };
      question.registerFunctionOnPropertyValueChanged(
        'inputType',
        updateTextInput,
        el.id // a unique key to distinguish fields
      );
      // Init
      updateTextInput();

      // Adding an open url icon for urls inputs
      if (question.inputType === 'url') {
        const parentElement = el.parentElement;
        if (parentElement) {
          // Generate the dynamic component with its parameters
          const button = domService.appendComponentToBody(
            SafeButtonComponent,
            parentElement
          );
          const instance: SafeButtonComponent = button.instance;
          instance.isIcon = true;
          instance.icon = 'open_in_new';
          instance.size = ButtonSize.SMALL;
          instance.category = ButtonCategory.TERTIARY;
          instance.variant = 'default';
          // we override the css of the component
          const domElem = (button.hostView as EmbeddedViewRef<any>)
            .rootNodes[0] as HTMLElement;
          (domElem.firstChild as HTMLElement).style.minWidth = 'unset';
          (domElem.firstChild as HTMLElement).style.backgroundColor = 'unset';
          (domElem.firstChild as HTMLElement).style.color = 'black';

          // Set the default styling of the parent
          parentElement.style.display = 'flex';
          parentElement.style.alignItems = 'center';
          parentElement.style.flexDirection = 'row';
          parentElement.style.pointerEvents = 'auto';
          parentElement.style.justifyContent = 'space-between';
          parentElement.title =
            'The URL should start with "http://" or "https://"';

          // Create an <a> HTMLElement only used to verify the validity of the URL
          const urlTester = document.createElement('a');
          if (
            el.value &&
            !(el.value.startsWith('https://') || el.value.startsWith('http://'))
          ) {
            urlTester.href = 'https://' + el.value;
          } else {
            urlTester.href = el.value || '';
          }
          instance.disabled =
            !urlTester.host || urlTester.host === window.location.host;

          (question.survey as SurveyModel).onValueChanged.add(
            (__: any, opt: any) => {
              if (opt.question.name === question.name) {
                if (
                  opt.question.value &&
                  !(
                    opt.question.value.startsWith('https://') ||
                    opt.question.value.startsWith('http://')
                  )
                ) {
                  urlTester.href = 'https://' + opt.question.value;
                } else {
                  urlTester.href = opt.question.value || '';
                }
                instance.disabled =
                  !urlTester.host || urlTester.host === window.location.host;
              }
            }
          );

          button.instance.emittedEventSubject.subscribe((eventType: string) => {
            if (
              eventType === 'click' &&
              urlTester.host &&
              urlTester.host !== window.location.host
            ) {
              window.open(urlTester.href, '_blank', 'noopener,noreferrer');
            }
          });
        }
      }
    },
  };

  /**
   * Get date for input display.
   *
   * @param value question value
   * @param inputType question input type
   * @returns formatted date
   */
  const getDateDisplay = (value: any, inputType: string): Date => {
    const date = new Date(value);
    if (inputType === 'time') {
      return new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
    } else {
      return date;
    }
  };

  /**
   * Set date for question / parameter value
   *
   * @param value input value
   * @param inputType question input type
   * @returns formatted date
   */
  const setDateValue = (value: Date, inputType: string): Date | string => {
    if (inputType === 'time') {
      // for time fields, translate the date to UTC
      return new Date(
        Date.UTC(1970, 0, 1, value.getHours(), value.getMinutes())
      );
    } else {
      return value.toISOString();
    }
  };

  /**
   * It creates a date, datetime or time picker instance based on the input type
   *
   * @param inputType - The type of the input element.
   * @param element - The element that the directive is attached to.
   * @returns The picker instance, or null if the type is not allowed
   */
  const createPickerInstance = (
    inputType: DateInputFormat,
    element: any
  ):
    | DatePickerComponent
    | DateTimePickerComponent
    | TimePickerComponent
    | null => {
    switch (inputType) {
      case 'date':
        const datePicker = domService.appendComponentToBody(
          DatePickerComponent,
          element
        );
        const datePickerInstance: DatePickerComponent = datePicker.instance;
        datePickerInstance.format = 'dd/MM/yyyy';
        return datePickerInstance;
      case 'datetime':
      case 'datetime-local':
        const dateTimePicker = domService.appendComponentToBody(
          DateTimePickerComponent,
          element
        );
        const dateTimePickerInstance: DateTimePickerComponent =
          dateTimePicker.instance;
        dateTimePickerInstance.format = 'dd/MM/yyyy HH:mm';
        return dateTimePickerInstance;
      case 'time':
        const timePicker = domService.appendComponentToBody(
          TimePickerComponent,
          element
        );
        const timePickerInstance: TimePickerComponent = timePicker.instance;
        timePickerInstance.format = 'HH:mm';
        return timePickerInstance;
      default:
        return null;
    }
  };

  Survey.CustomWidgetCollection.Instance.addCustomWidget(
    widget,
    'customwidget'
  );
};
