import {
  ChoicesRestfull,
  ItemValue,
  JsonMetadata,
  Serializer,
  SurveyModel,
  surveyLocalization,
  MatrixDropdownColumn,
  QuestionMatrixDropdownModel,
  QuestionMatrixDynamicModel,
  QuestionSelectBase,
  Question,
  IJsonPropertyInfo,
} from 'survey-core';
import { ReferenceDataService } from '../../services/reference-data/reference-data.service';
import { CustomPropertyGridComponentTypes } from '../components/utils/components.enum';
import { registerCustomPropertyEditor } from '../components/utils/component-register';
import { isEqual, isNil, omit, uniqWith } from 'lodash';
import { SurveyQuestionEditorDefinition } from 'survey-creator-core';

type EditableColumnsMatrix =
  | QuestionMatrixDropdownModel
  | QuestionMatrixDynamicModel;

/** Matrix queastion type to add reference data sources */
export const EDITABLE_COLUMNS_MATRIX_TYPES = [
  'matrixdropdown',
  'matrixdynamic',
];

/** Caregory title for reference data options */
export const REF_DATA_SECTION_TITLE = 'Choices from Reference data' as const;

/**
 * Sets the choices on the default value modal editor for a reference data dropdown
 *
 * @param _sender The sender survey
 * @param options The options
 */
export const updateModalChoicesAndValue = (_sender: any, options: any) => {
  if (options.obj.visibleChoices?.length > 0) {
    // Populate editor choices from actual question choices
    options.popupEditor.question.setPropertyValue(
      'choices',
      options.obj.visibleChoices
    );

    if (isNil(options.obj.defaultValue)) {
      return;
    }

    // Set default value if exists
    options.popupEditor.question.setPropertyValue(
      'value',
      options.obj.isPrimitiveValue
        ? options.obj.defaultValue
        : // Gets rid of surveyJS pos artifact
          omit(new ItemValue(options.obj.defaultValue).id as any, 'pos')
    );
  }
};

/**
 * Check if a question is of select type
 *
 * @param question The question to check
 * @returns A boolean indicating if the question is a select type
 */
export const isSelectQuestion = (question: Question): boolean =>
  Serializer.isDescendantOf(question.getType(), 'selectbase');

/**
 * Check if a question is of select type
 *
 * @param question The question to check
 * @returns A boolean indicating if the question is a matrixdropdowncolumn type
 */
export const isMatrixQuestion = (question: Question): boolean =>
  EDITABLE_COLUMNS_MATRIX_TYPES.includes(question.getType());

/**
 * Remove duplicated options from items
 *
 * @param element Question or column element
 * @param items List of choices
 * @returns List of unique choices
 */
const removeDuplicateOptions = (element: any, items: ItemValue[]) => {
  if (!items || items.length === 0 || !element.removeDuplicateOptions) {
    return [];
  }

  return uniqWith(
    items,
    (a, b) => (a.title ?? a.value) === (b.title ?? b.value)
  );
};

/**
 * Update question choices
 *
 * @param referenceDataService Shared reference data service
 * @param question Question
 * @param column Column, optional, only applies to matrix
 */
const updateChoices = (
  referenceDataService: ReferenceDataService,
  question: Question,
  column?: any
) => {
  // Element using reference data
  const targetElement = column || question;

  if (
    !targetElement.referenceData ||
    !targetElement.referenceDataDisplayField
  ) {
    // Element is not using reference data, or isn't correctly configured
    return;
  }

  const targetColName = column ? column.name : null;

  if (column && (!question?.cells || !(question.cells instanceof Map))) {
    console.warn(
      `[RefData] updateChoices: Matrix ${question?.name} 'cells' map not found or not a Map. Cannot update choices for column ${targetColName}. Ensure survey.onMatrixAfterCellRender is populating it.`
    );
    return;
  }

  const filterIsRowBased = !!(
    column && column.referenceDataFilterFilterFromQuestion?.startsWith('row.')
  );
  let foreignColNameForRowFilter: string | null = null;
  if (filterIsRowBased) {
    foreignColNameForRowFilter =
      column.referenceDataFilterFilterFromQuestion.substring(4);
  }

  let filterSourceRefDataID = '';
  if (filterIsRowBased && foreignColNameForRowFilter) {
    const foreignColumnDef = question.columns.find(
      (c: any) => c.name === foreignColNameForRowFilter
    );
    if (foreignColumnDef) {
      filterSourceRefDataID = foreignColumnDef.referenceData || '';
    } else {
      console.warn(
        `[RefData] Foreign column definition '${foreignColNameForRowFilter}' not found in matrix '${question.name}'.`
      );
    }
  } else if (targetElement.referenceDataFilterFilterFromQuestion) {
    const survey = question.survey as SurveyModel;
    const foreignQuestion = survey
      ?.getAllQuestions()
      .find(
        (x) => x.name === targetElement.referenceDataFilterFilterFromQuestion
      ) as QuestionSelectBase;
    filterSourceRefDataID = foreignQuestion?.referenceData || '';
  }

  const displayOptions = {
    displayField: targetElement.referenceDataDisplayField,
    sortByField: targetElement.referenceDataSortBy,
    sortDirection: targetElement.referenceDataSortDirection || 'asc',
    tryLoadTranslations: targetElement.referenceDataTryLoadTranslations,
    lang: question.survey.getLocale(),
  };

  if (filterIsRowBased && foreignColNameForRowFilter && targetColName) {
    const rowProcessingPromises: Promise<void>[] = [];

    const foreignColFilter = foreignColNameForRowFilter;
    question.visibleRows?.forEach((row: any) => {
      const rowData = row.value;
      const rowName = row.rowName;

      if (!rowData || !rowName) {
        console.warn(
          `[RefData] Skipping row in ${targetColName}: missing rowData or rowName. Row:`,
          row
        );
        return;
      }

      const foreignValue = rowData[foreignColFilter];

      const cellFilter = {};
      if (
        filterSourceRefDataID &&
        column.referenceDataFilterForeignField &&
        column.referenceDataFilterLocalField &&
        column.referenceDataFilterFilterCondition &&
        !isNil(foreignValue)
      ) {
        Object.assign(cellFilter, {
          foreignReferenceData: filterSourceRefDataID,
          foreignField: column.referenceDataFilterForeignField,
          foreignValue: foreignValue,
          localField: column.referenceDataFilterLocalField,
          operator: column.referenceDataFilterFilterCondition,
        });
      }

      const promise = referenceDataService
        .getChoices(
          column.referenceData,
          displayOptions,
          column.isPrimitiveValue,
          cellFilter as any
        )
        .then((choices) => {
          const choiceItems = choices.map((c) => new ItemValue(c));
          const cellKey = `${rowName}:${targetColName}`;
          const matrixCell = question.cells.get(cellKey);

          if (matrixCell && matrixCell.question) {
            const cellQuestion = matrixCell.question as QuestionSelectBase;
            cellQuestion.choices = removeDuplicateOptions(
              targetElement,
              choiceItems
            );
          }

          const currentCellValue = rowData[targetColName];
          let newCellValue = currentCellValue;
          if (column.isPrimitiveValue) {
            if (
              currentCellValue !== null &&
              currentCellValue !== undefined &&
              !choices.find((c) => isEqual(c.value, currentCellValue))
            ) {
              newCellValue = null;
            }
          } else {
            if (currentCellValue !== null && currentCellValue !== undefined) {
              const valueItem = new ItemValue(currentCellValue);
              const foundChoice = choiceItems.find((c) =>
                isEqual(c.id, omit(valueItem.id as any, 'pos'))
              );
              newCellValue = foundChoice ? foundChoice.value : null;
            } else {
              newCellValue = null;
            }
          }
          if (!isEqual(currentCellValue, newCellValue)) {
            row.setValue(targetColName, newCellValue);
          }
        })
        .catch((error) => {
          console.error(
            `[RefData] Error fetching/processing choices for row ${rowName}, col ${targetColName}:`,
            error
          );
        });
      rowProcessingPromises.push(promise.catch(() => undefined));
    });

    // Execute all promises
    Promise.all(rowProcessingPromises)
      .then(() => {
        if (
          question.survey &&
          typeof (question.survey as any).render === 'function'
        ) {
          (question.survey as any).render();
        }
      })
      .catch((error) => {
        console.error(
          `[RefData] Error in Promise.all for row processing (Matrix: ${question.name}):`,
          error
        );
      });
  } else {
    // Non-row-based filter or simple select question
    let generalFilter;
    if (targetElement.referenceDataFilterFilterFromQuestion) {
      const survey = question.survey as SurveyModel;
      const foreignQuestion = survey
        ?.getAllQuestions()
        .find(
          (x: any) =>
            x.name === targetElement.referenceDataFilterFilterFromQuestion
        ) as QuestionSelectBase;
      const foreignValue = foreignQuestion?.value;
      if (filterSourceRefDataID && !isNil(foreignValue)) {
        generalFilter = {
          foreignReferenceData: filterSourceRefDataID,
          foreignField: targetElement.referenceDataFilterForeignField,
          foreignValue: foreignValue,
          localField: targetElement.referenceDataFilterLocalField,
          operator: targetElement.referenceDataFilterFilterCondition,
        };
      }
    }

    referenceDataService
      .getChoices(
        targetElement.referenceData,
        displayOptions,
        targetElement.isPrimitiveValue,
        generalFilter
      )
      .then((choices) => {
        const choiceItems = choices.map((c) => new ItemValue(c));

        if (targetColName) {
          // Non-row-filtered matrix column
          column.choices = removeDuplicateOptions(targetElement, choiceItems);

          question.visibleRows?.forEach((row: any) => {
            const rowData = row.value;
            if (!rowData) return;
            const currentCellValue = rowData[targetColName];
            let newCellValue = currentCellValue;
            if (column.isPrimitiveValue) {
              if (
                currentCellValue !== null &&
                currentCellValue !== undefined &&
                !choices.find((c) => isEqual(c.value, currentCellValue))
              ) {
                newCellValue = null;
              }
            } else {
              if (currentCellValue !== null && currentCellValue !== undefined) {
                const valueItem = new ItemValue(currentCellValue);
                const foundChoice = choiceItems.find((c) =>
                  isEqual(c.id, omit(valueItem.id as any, 'pos'))
                );
                newCellValue = foundChoice ? foundChoice.value : null;
              } else {
                newCellValue = null;
              }
            }
            if (!isEqual(currentCellValue, newCellValue)) {
              row.setValue(targetColName, newCellValue);
            }
          });
          // Refresh survey
          if (
            question.survey &&
            typeof (question.survey as any).render === 'function'
          ) {
            (question.survey as any).render();
          }
        } else {
          // Simple select question
          question.choices = removeDuplicateOptions(targetElement, choiceItems);
          // Value reconciliation for the select question itself
          const currentValue = question.value;
          let newSelectValue = currentValue;
          if (question.isPrimitiveValue) {
            if (
              currentValue !== null &&
              currentValue !== undefined &&
              !choices.find((c) => isEqual(c.value, currentValue))
            ) {
              newSelectValue = null;
            }
          } else {
            if (currentValue !== null && currentValue !== undefined) {
              const valueItem = new ItemValue(currentValue);
              const foundChoice = choiceItems.find((c) =>
                isEqual(c.id, omit(valueItem.id as any, 'pos'))
              );
              newSelectValue = foundChoice ? foundChoice.value : null;
            } else {
              newSelectValue = null;
            }
          }
          if (!isEqual(currentValue, newSelectValue)) {
            question.value = newSelectValue;
          }
        }
      })
      .catch((error) => {
        console.error(
          `[RefData] Error fetching choices for element ${targetElement.name}:`,
          error
        );
      });
  }
};

/**
 * Initialize question choices
 *
 * @param referenceDataService Shared reference data service
 * @param question Question
 * @param column Column, optional, only applies to matrix
 */
const initChoices = (
  referenceDataService: ReferenceDataService,
  question: Question,
  column?: any
) => {
  // Element using reference data
  const targetElement = column || question;

  const propsToWatch = [
    'referenceData',
    'referenceDataDisplayField',
    'isPrimitiveValue',
    'referenceDataFilterFilterFromQuestion',
    'referenceDataFilterForeignField',
    'referenceDataFilterFilterCondition',
    'referenceDataFilterLocalField',
  ];
  propsToWatch.forEach((prop) => {
    // Listen to property changes on column if provided, else, on question
    targetElement.registerFunctionOnPropertyValueChanged(prop, () => {
      updateChoices(referenceDataService, question, column);
    });
  });

  if (question.survey) {
    // Subscribe to locale changes to update the choices
    (question.survey as SurveyModel).onLocaleChangedEvent.add(() => {
      updateChoices(referenceDataService, question, column);
    });
  }

  const survey = question.survey as SurveyModel;
  // Check if definitionToListenOn is a column within questionForContext (which should be a matrix)
  const isColumnBeingInitialized = isMatrixQuestion(question) && !isNil(column);

  if (
    isColumnBeingInitialized &&
    targetElement.referenceDataFilterFilterFromQuestion?.startsWith('row.')
  ) {
    const foreignColName =
      targetElement.referenceDataFilterFilterFromQuestion.substring(4);

    // Attach listener to the survey, but specific to this matrixInstance and column dependency
    // Use a flag on the survey or matrix to prevent duplicate listeners if initChoices is called multiple times
    // for the same matrix/column pair (though the Set below for columns should mostly prevent this specific case)
    const listenerKey = `_refDataListener_${question.name}_${column.name}_to_${foreignColName}`;
    if (survey && !(survey as any)[listenerKey]) {
      survey.onMatrixCellValueChanged.add((_, options) => {
        if (
          options.question === question &&
          options.columnName === foreignColName
        ) {
          updateChoices(referenceDataService, question, column);
        }
      });
      (survey as any)[listenerKey] = true;
    }
  } else if (targetElement.referenceDataFilterFilterFromQuestion) {
    // Dependency on a non-row based question (another question in the survey)
    const foreignQuestion = survey
      ?.getAllQuestions()
      .find(
        (x: any) =>
          x.name === targetElement.referenceDataFilterFilterFromQuestion
      ) as QuestionSelectBase | undefined;

    foreignQuestion?.registerFunctionOnPropertyValueChanged('value', () => {
      updateChoices(referenceDataService, question, column);
    });
  }
};

/**
 * Add support for custom properties to the survey
 *
 * @param referenceDataService Reference data service
 */
export const init = (referenceDataService: ReferenceDataService): void => {
  // declare the serializer
  const serializer: JsonMetadata = Serializer;

  // Hide the choices from the property grid if choices from reference data is used
  serializer.getProperty('selectbase', 'choices').visibleIf = (
    obj: Question
  ): boolean => !obj.referenceData;

  for (const type of ['tagbox', 'dropdown', 'matrixdropdowncolumn']) {
    const showMode = type === 'matrixdropdowncolumn' ? 'form' : undefined;

    const visibleIfRefData = (obj: null | QuestionSelectBase) =>
      Boolean(
        obj?.referenceData ??
          (obj?.locOwner as MatrixDropdownColumn)?.referenceData
      );

    /**
     * Set's property values for both select type question and matrix columns
     *
     * @param this JSON property
     * @param obj the survey element that triggered the onSetValue
     * @param value new property value
     */
    const setPropertyValue = function (
      this: IJsonPropertyInfo,
      obj: QuestionSelectBase | MatrixDropdownColumn,
      value: string
    ) {
      // Clear ChoicesRestfull, if present
      const choicesByUrlProp = obj.getPropertyByName('choicesByUrl');
      if (choicesByUrlProp) {
        const newChoicesRestfull = new ChoicesRestfull();
        newChoicesRestfull.setData([]);
        obj.setPropertyValue('choicesByUrl', newChoicesRestfull);
      }

      const propName = this.name.split(':')[0];
      const parent =
        'parentQuestion' in obj
          ? (obj.parentQuestion as EditableColumnsMatrix)
          : null;

      if (parent && isMatrixQuestion(parent)) {
        const col = parent.getColumnByName(obj.name);
        col.setPropertyValue(propName, value);
      } else {
        try {
          const prop = obj.getPropertyByName(propName);
          prop && obj.setPropertyValue(propName, value);
        } catch (e) {
          const newPropValue = obj.getPropertyValue(propName);
          if (newPropValue !== value) {
            console.error(`Error setting property ${propName} value: ${e}`);
          }
        }
      }
    };

    serializer.addProperty(type, {
      name: 'referenceData',
      showMode,
      category: REF_DATA_SECTION_TITLE,
      type: CustomPropertyGridComponentTypes.referenceDataDropdown,
      visibleIndex: 1,
      onSetValue: setPropertyValue,
    });

    registerCustomPropertyEditor(
      CustomPropertyGridComponentTypes.referenceDataDropdown
    );

    const loadReferenceDataChoices = (
      obj: MatrixDropdownColumn | QuestionSelectBase,
      choicesCallback: (choices: any[]) => void
    ) => {
      if (!obj?.referenceData) {
        return choicesCallback([]);
      }
      referenceDataService
        .loadReferenceData(obj.referenceData)
        .then((referenceData) =>
          choicesCallback(referenceData.fields?.map((x) => x?.name ?? x) || [])
        );
    };

    serializer.addProperty(type, {
      displayName: 'Display field',
      name: 'referenceDataDisplayField',
      showMode,
      category: REF_DATA_SECTION_TITLE,
      isRequired: true,
      dependsOn: 'referenceData',
      visibleIf: visibleIfRefData,
      visibleIndex: 2,
      choices: loadReferenceDataChoices,
      onSetValue: setPropertyValue,
    });

    serializer.addProperty(type, {
      displayName: 'Sort by',
      showMode,
      name: 'referenceDataSortBy',
      category: REF_DATA_SECTION_TITLE,
      dependsOn: 'referenceData',
      visibleIf: visibleIfRefData,
      visibleIndex: 3,
      choices: loadReferenceDataChoices,
      onSetValue: setPropertyValue,
    });

    serializer.addProperty(type, {
      displayName: 'Sort direction',
      showMode,
      name: 'referenceDataSortDirection',
      type: 'dropdown',
      category: REF_DATA_SECTION_TITLE,
      dependsOn: 'referenceData',
      visibleIf: visibleIfRefData,
      visibleIndex: 4,
      choices: [
        { value: 'asc', text: 'Ascending' },
        { value: 'desc', text: 'Descending' },
      ],
      onSetValue: setPropertyValue,
    });

    serializer.addProperty(type, {
      displayName: 'Is primitive value',
      showMode,
      name: 'isPrimitiveValue',
      type: 'boolean',
      category: REF_DATA_SECTION_TITLE,
      dependsOn: 'referenceData',
      visibleIf: visibleIfRefData,
      visibleIndex: 5,
      default: true,
      onSetValue: setPropertyValue,
    });

    serializer.addProperty(type, {
      displayName: 'Try loading translations',
      showMode,
      name: 'referenceDataTryLoadTranslations',
      type: 'boolean',
      category: REF_DATA_SECTION_TITLE,
      dependsOn: 'referenceData',
      visibleIf: visibleIfRefData,
      visibleIndex: 6,
      default: false,
      onSetValue: setPropertyValue,
    });

    serializer.addProperty(type, {
      displayName: 'Filter from question',
      name: 'referenceDataFilterFilterFromQuestion',
      showMode,
      type: 'dropdown',
      category: REF_DATA_SECTION_TITLE,
      dependsOn: 'referenceData',
      visibleIf: visibleIfRefData,
      visibleIndex: 7,
      choices: (
        obj: null | QuestionSelectBase,
        choicesCallback: (choices: any[]) => void
      ) => {
        const defaultOption = new ItemValue(
          '',
          surveyLocalization.getString('pe.conditionSelectQuestion')
        );
        const survey = obj?.getSurvey?.() as SurveyModel;
        if (!survey) return choicesCallback([defaultOption]);
        const questions = survey
          .getAllQuestions()
          .filter((question) => isSelectQuestion(question) && question !== obj)
          .map((question) => question as QuestionSelectBase)
          .filter((question) => question.referenceData);

        const qItems = questions.map((q) => {
          const text = q.locTitle.renderedHtml || q.name;
          return new ItemValue(q.name, text);
        });

        // Make it so we can filter by another column in the same row
        const columns =
          (obj?.colOwnerValue?.columns as MatrixDropdownColumn[]) || [];
        qItems.push(
          ...columns
            .filter((c) => c.referenceData && c.name !== obj?.name)
            .map(
              (c) =>
                new ItemValue(`row.${c.name}`, `Row - ${c.title || c.name}`)
            )
        );

        qItems.sort((el1, el2) => el1.text.localeCompare(el2.text));
        qItems.unshift(defaultOption);
        choicesCallback(qItems);
      },
      onSetValue: setPropertyValue,
    });

    const visibleIfFilterFromQuestion = (obj: null | QuestionSelectBase) =>
      Boolean(
        obj?.referenceDataFilterFilterFromQuestion ??
          (obj?.locOwner as MatrixDropdownColumn)
            ?.referenceDataFilterFilterFromQuestion
      );

    serializer.addProperty(type, {
      displayName: 'Foreign field',
      showMode,
      name: 'referenceDataFilterForeignField',
      category: REF_DATA_SECTION_TITLE,
      isRequired: true,
      dependsOn: 'referenceDataFilterFilterFromQuestion',
      visibleIf: visibleIfFilterFromQuestion,
      visibleIndex: 8,
      choices: (
        obj: null | QuestionSelectBase,
        choicesCallback: (choices: any[]) => void
      ) => {
        if (!obj?.referenceDataFilterFilterFromQuestion) {
          return choicesCallback([]);
        }

        const foreignColumn = (
          (obj?.colOwnerValue?.columns as MatrixDropdownColumn[]) || []
        ).find(
          (c) => `row.${c.name}` === obj.referenceDataFilterFilterFromQuestion
        );

        const foreignQuestion = (obj.getSurvey() as SurveyModel)
          .getAllQuestions()
          .find((q) => q.name === obj.referenceDataFilterFilterFromQuestion) as
          | QuestionSelectBase
          | undefined;

        const foreignRefData =
          foreignColumn?.referenceData ?? foreignQuestion?.referenceData;

        if (foreignRefData) {
          referenceDataService
            .loadReferenceData(foreignRefData)
            .then((referenceData) =>
              choicesCallback(
                referenceData.fields?.map((x) => x?.name ?? x) || []
              )
            );
        }
      },
      onSetValue: setPropertyValue,
    });

    serializer.addProperty(type, {
      displayName: 'Filter condition',
      name: 'referenceDataFilterFilterCondition',
      showMode,
      category: REF_DATA_SECTION_TITLE,
      isRequired: true,
      dependsOn: 'referenceDataFilterFilterFromQuestion',
      visibleIf: visibleIfFilterFromQuestion,
      visibleIndex: 9,
      choices: [
        { value: 'eq', text: '==' },
        { value: 'neq', text: '!=' },
        { value: 'gte', text: '>=' },
        { value: 'gt', text: '>' },
        { value: 'lte', text: '<=' },
        { value: 'lt', text: '<' },
        { value: 'contains', text: 'contains' },
        { value: 'doesnotcontain', text: 'does not contain' },
        { value: 'iscontained', text: 'is contained in' },
        { value: 'isnotcontained', text: 'is not contained in' },
      ],
      onSetValue: setPropertyValue,
    });

    serializer.addProperty(type, {
      displayName: 'Local field',
      name: 'referenceDataFilterLocalField',
      category: REF_DATA_SECTION_TITLE,
      showMode,
      isRequired: true,
      dependsOn: 'referenceDataFilterFilterFromQuestion',
      visibleIf: visibleIfFilterFromQuestion,
      visibleIndex: 10,
      choices: (
        obj: null | QuestionSelectBase,
        choicesCallback: (choices: any[]) => void
      ) => {
        if (obj?.referenceData) {
          referenceDataService
            .loadReferenceData(obj.referenceData)
            .then((referenceData) =>
              choicesCallback(
                referenceData.fields?.map((x) => x?.name ?? x) || []
              )
            );
        }
      },
      onSetValue: setPropertyValue,
    });

    serializer.addProperty(type, {
      name: 'removeDuplicateOptions:boolean',
      category: REF_DATA_SECTION_TITLE,
      showMode,
      dependsOn: 'referenceData',
      visibleIf: visibleIfRefData,
      visibleIndex: 11,
      onSetValue: setPropertyValue,
      default: true,
    });
  }

  registerCustomPropertyEditor(
    CustomPropertyGridComponentTypes.referenceDataDropdown
  );

  SurveyQuestionEditorDefinition.definition[
    'matrixdropdowncolumn'
  ].properties?.push(
    'referenceData',
    'referenceDataDisplayField',
    'referenceDataSortBy',
    'referenceDataSortDirection',
    'isPrimitiveValue',
    'referenceDataTryLoadTranslations',
    'referenceDataFilterFilterFromQuestion',
    'referenceDataFilterForeignField',
    'referenceDataFilterFilterCondition',
    'referenceDataFilterLocalField'
  );
};

/**
 * Render the custom properties
 *
 * @param questionElement The question element
 * @param referenceDataService The reference data service
 */
export const render = (
  questionElement: Question,
  referenceDataService: ReferenceDataService
): void => {
  // Main logic for applying to questionElement
  if (isSelectQuestion(questionElement) && questionElement.referenceData) {
    const qAsSelect = questionElement as QuestionSelectBase & {
      _refDataInitialized?: boolean;
    };
    if (!qAsSelect._refDataInitialized) {
      // Simple flag to prevent re-init
      initChoices(referenceDataService, qAsSelect); // For select, context and definition are the same
      updateChoices(referenceDataService, qAsSelect); // Initial choice load
      qAsSelect._refDataInitialized = true;
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    qAsSelect.clearIncorrectValuesCallback = () => {};
  } else if (isMatrixQuestion(questionElement)) {
    const matrix = questionElement as EditableColumnsMatrix;
    // Ensure referenceDataChoicesInitialized is a Set on the matrix object
    if (!matrix.referenceDataChoicesInitialized) {
      matrix.referenceDataChoicesInitialized = new Set<string>();
    }

    // Loop through matrix columns
    matrix.columns.forEach((column: EditableColumnsMatrix) => {
      if (column.referenceData && column.referenceDataDisplayField) {
        if (!matrix.referenceDataChoicesInitialized.has(column.name)) {
          initChoices(referenceDataService, matrix, column);
          updateChoices(referenceDataService, matrix, column);
          matrix.referenceDataChoicesInitialized.add(column.name);
        }
      }
    });
  }
};
