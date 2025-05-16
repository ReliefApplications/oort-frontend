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
  const updateChoices = (
    matrixOrSelectQuestion: Question,
    columnOrQuestionDefinition: any = matrixOrSelectQuestion
  ) => {
    const removeDuplicateOptions = (items: ItemValue[]) => {
      if (
        !items ||
        items.length === 0 ||
        !columnOrQuestionDefinition.removeDuplicateOptions
      ) {
        return [];
      }

      return uniqWith(
        items,
        (a, b) => (a.title ?? a.value) === (b.title ?? b.value)
      );
    };
    if (
      !columnOrQuestionDefinition.referenceData ||
      !columnOrQuestionDefinition.referenceDataDisplayField
    ) {
      return;
    }

    const isMatrixCol =
      isMatrixQuestion(matrixOrSelectQuestion) &&
      columnOrQuestionDefinition !== matrixOrSelectQuestion;
    const qAsMatrix = isMatrixCol
      ? (matrixOrSelectQuestion as EditableColumnsMatrix)
      : null;
    const qAsSelect = !isMatrixCol
      ? (matrixOrSelectQuestion as QuestionSelectBase)
      : null;

    const targetColName = isMatrixCol ? columnOrQuestionDefinition.name : null;

    if (
      isMatrixCol &&
      (!qAsMatrix?.cells || !(qAsMatrix.cells instanceof Map))
    ) {
      console.warn(
        `[RefData] updateChoices: Matrix ${qAsMatrix?.name} 'cells' map not found or not a Map. Cannot update choices for column ${targetColName}. Ensure survey.onMatrixAfterCellRender is populating it.`
      );
      return;
    }

    const filterIsRowBased = !!(
      isMatrixCol &&
      columnOrQuestionDefinition.referenceDataFilterFilterFromQuestion?.startsWith(
        'row.'
      )
    );
    let foreignColNameForRowFilter: string | null = null;
    if (filterIsRowBased) {
      foreignColNameForRowFilter =
        columnOrQuestionDefinition.referenceDataFilterFilterFromQuestion.substring(
          4
        );
    }

    let filterSourceRefDataID = '';
    if (filterIsRowBased && foreignColNameForRowFilter && qAsMatrix) {
      const foreignColumnDef = qAsMatrix.columns.find(
        (c: any) => c.name === foreignColNameForRowFilter
      );
      if (foreignColumnDef) {
        filterSourceRefDataID = foreignColumnDef.referenceData || '';
      } else {
        console.warn(
          `[RefData] Foreign column definition '${foreignColNameForRowFilter}' not found in matrix '${qAsMatrix.name}'.`
        );
      }
    } else if (
      columnOrQuestionDefinition.referenceDataFilterFilterFromQuestion
    ) {
      const survey = matrixOrSelectQuestion.survey as SurveyModel;
      const foreignQuestion = survey
        ?.getAllQuestions()
        .find(
          (x) =>
            x.name ===
            columnOrQuestionDefinition.referenceDataFilterFilterFromQuestion
        ) as QuestionSelectBase;
      filterSourceRefDataID = foreignQuestion?.referenceData || '';
    }

    const displayOptions = {
      displayField: columnOrQuestionDefinition.referenceDataDisplayField,
      sortByField: columnOrQuestionDefinition.referenceDataSortBy,
      sortDirection:
        columnOrQuestionDefinition.referenceDataSortDirection || 'asc',
      tryLoadTranslations:
        columnOrQuestionDefinition.referenceDataTryLoadTranslations,
      lang: matrixOrSelectQuestion.survey.getLocale(),
    };

    if (
      isMatrixCol &&
      filterIsRowBased &&
      foreignColNameForRowFilter &&
      qAsMatrix &&
      targetColName
    ) {
      const rowProcessingPromises: Promise<void>[] = [];

      const foreignColFilter = foreignColNameForRowFilter;
      qAsMatrix.visibleRows?.forEach((row: any) => {
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
          columnOrQuestionDefinition.referenceDataFilterForeignField &&
          columnOrQuestionDefinition.referenceDataFilterLocalField &&
          columnOrQuestionDefinition.referenceDataFilterFilterCondition &&
          !isNil(foreignValue)
        ) {
          Object.assign(cellFilter, {
            foreignReferenceData: filterSourceRefDataID,
            foreignField:
              columnOrQuestionDefinition.referenceDataFilterForeignField,
            foreignValue: foreignValue,
            localField:
              columnOrQuestionDefinition.referenceDataFilterLocalField,
            operator:
              columnOrQuestionDefinition.referenceDataFilterFilterCondition,
          });
        }

        const promise = referenceDataService
          .getChoices(
            columnOrQuestionDefinition.referenceData,
            displayOptions,
            columnOrQuestionDefinition.isPrimitiveValue,
            cellFilter as any
          )
          .then((choices) => {
            const choiceItems = choices.map((c) => new ItemValue(c));
            const cellKey = `${rowName}:${targetColName}`;
            const matrixCell = qAsMatrix.cells.get(cellKey);

            if (matrixCell && matrixCell.question) {
              const cellQuestion = matrixCell.question as QuestionSelectBase;
              cellQuestion.choices = removeDuplicateOptions(choiceItems);
            }

            const currentCellValue = rowData[targetColName];
            let newCellValue = currentCellValue;
            if (columnOrQuestionDefinition.isPrimitiveValue) {
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

      Promise.all(rowProcessingPromises)
        .then(() => {
          if (
            qAsMatrix.survey &&
            typeof (qAsMatrix.survey as any).render === 'function'
          ) {
            (qAsMatrix.survey as any).render();
          }
        })
        .catch((error) => {
          console.error(
            `[RefData] Error in Promise.all for row processing (Matrix: ${qAsMatrix.name}):`,
            error
          );
        });
    } else {
      // Non-row-based filter or simple select question
      let generalFilter;
      if (columnOrQuestionDefinition.referenceDataFilterFilterFromQuestion) {
        const survey = matrixOrSelectQuestion.survey as SurveyModel;
        const foreignQuestion = survey
          ?.getAllQuestions()
          .find(
            (x: any) =>
              x.name ===
              columnOrQuestionDefinition.referenceDataFilterFilterFromQuestion
          ) as QuestionSelectBase;
        const foreignValue = foreignQuestion?.value;
        if (filterSourceRefDataID && !isNil(foreignValue)) {
          generalFilter = {
            foreignReferenceData: filterSourceRefDataID,
            foreignField:
              columnOrQuestionDefinition.referenceDataFilterForeignField,
            foreignValue: foreignValue,
            localField:
              columnOrQuestionDefinition.referenceDataFilterLocalField,
            operator:
              columnOrQuestionDefinition.referenceDataFilterFilterCondition,
          };
        }
      }

      referenceDataService
        .getChoices(
          columnOrQuestionDefinition.referenceData,
          displayOptions,
          columnOrQuestionDefinition.isPrimitiveValue,
          generalFilter
        )
        .then((choices) => {
          const choiceItems = choices.map((c) => new ItemValue(c));
          if (isMatrixCol && qAsMatrix && targetColName) {
            // Non-row-filtered matrix column
            (columnOrQuestionDefinition as QuestionSelectBase).choices =
              choiceItems;

            qAsMatrix.visibleRows?.forEach((row: any) => {
              const rowData = row.value;
              if (!rowData) return;
              const currentCellValue = rowData[targetColName];
              let newCellValue = currentCellValue;
              if (columnOrQuestionDefinition.isPrimitiveValue) {
                if (
                  currentCellValue !== null &&
                  currentCellValue !== undefined &&
                  !choices.find((c) => isEqual(c.value, currentCellValue))
                ) {
                  newCellValue = null;
                }
              } else {
                if (
                  currentCellValue !== null &&
                  currentCellValue !== undefined
                ) {
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
            if (
              qAsMatrix.survey &&
              typeof (qAsMatrix.survey as any).render === 'function'
            ) {
              (qAsMatrix.survey as any).render();
            }
          } else if (qAsSelect) {
            // Simple select question
            qAsSelect.choices = removeDuplicateOptions(choiceItems);
            // Value reconciliation for the select question itself
            const currentValue = qAsSelect.value;
            let newSelectValue = currentValue;
            if (columnOrQuestionDefinition.isPrimitiveValue) {
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
              qAsSelect.value = newSelectValue;
            }
          }
        })
        .catch((error) => {
          console.error(
            `[RefData] Error fetching choices for element ${columnOrQuestionDefinition.name}:`,
            error
          );
        });
    }
  };

  const initChoices = (
    questionForContext: Question, // Matrix question or the select question itself
    definitionToListenOn: any // Column definition for matrix, or select question itself
  ) => {
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
      definitionToListenOn.registerFunctionOnPropertyValueChanged(prop, () => {
        updateChoices(questionForContext, definitionToListenOn);
      });
    });

    if (questionForContext.survey) {
      (questionForContext.survey as SurveyModel).onLocaleChangedEvent.add(
        () => {
          updateChoices(questionForContext, definitionToListenOn);
        }
      );
    }

    const survey = questionForContext.survey as SurveyModel;
    // Check if definitionToListenOn is a column within questionForContext (which should be a matrix)
    const isColumnBeingInitialized =
      isMatrixQuestion(questionForContext) &&
      definitionToListenOn !== questionForContext;

    if (
      isColumnBeingInitialized &&
      definitionToListenOn.referenceDataFilterFilterFromQuestion?.startsWith(
        'row.'
      )
    ) {
      const foreignColName =
        definitionToListenOn.referenceDataFilterFilterFromQuestion.substring(4);
      const matrixInstance = questionForContext as EditableColumnsMatrix;

      // Attach listener to the survey, but specific to this matrixInstance and column dependency
      // Use a flag on the survey or matrix to prevent duplicate listeners if initChoices is called multiple times
      // for the same matrix/column pair (though the Set below for columns should mostly prevent this specific case)
      const listenerKey = `_refDataListener_${matrixInstance.name}_${definitionToListenOn.name}_to_${foreignColName}`;
      if (survey && !(survey as any)[listenerKey]) {
        survey.onMatrixCellValueChanged.add((_, options) => {
          if (
            options.question === matrixInstance &&
            options.columnName === foreignColName
          ) {
            updateChoices(matrixInstance, definitionToListenOn);
          }
        });
        (survey as any)[listenerKey] = true;
      }
    } else if (definitionToListenOn.referenceDataFilterFilterFromQuestion) {
      // Dependency on a non-row based question (another question in the survey)
      const foreignQuestion = survey
        ?.getAllQuestions()
        .find(
          (x: any) =>
            x.name ===
            definitionToListenOn.referenceDataFilterFilterFromQuestion
        ) as QuestionSelectBase | undefined;

      foreignQuestion?.registerFunctionOnPropertyValueChanged('value', () => {
        updateChoices(questionForContext, definitionToListenOn);
      });
    }
  }; // End of initChoices

  // Main logic for applying to questionElement
  if (isSelectQuestion(questionElement) && questionElement.referenceData) {
    const qAsSelect = questionElement as QuestionSelectBase & {
      _refDataInitialized?: boolean;
    };
    if (!qAsSelect._refDataInitialized) {
      // Simple flag to prevent re-init
      initChoices(qAsSelect, qAsSelect); // For select, context and definition are the same
      updateChoices(qAsSelect, qAsSelect); // Initial choice load
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

    matrix.columns.forEach((colDef: EditableColumnsMatrix) => {
      if (colDef.referenceData && colDef.referenceDataDisplayField) {
        if (!matrix.referenceDataChoicesInitialized.has(colDef.name)) {
          initChoices(matrix, colDef);
          updateChoices(matrix, colDef);
          matrix.referenceDataChoicesInitialized.add(colDef.name);
        }
      }
    });
  }
};
