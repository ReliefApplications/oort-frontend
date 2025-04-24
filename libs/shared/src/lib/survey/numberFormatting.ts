import { Serializer, SurveyModel, settings } from 'survey-core';

// ===============================================================
// HELPER FUNCTIONS
// ===============================================================

/**
 * Format a number with thousand separators
 *
 * @param value - The number to format
 * @returns The formatted number as a string
 */
export const formatNumber = (value: any): string => {
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return value;
};

/**
 * Helper function to get a CSS selector for a matrix cell
 *
 * @param options - The matrix cell options object
 * @returns A CSS selector string or null if no valid selector could be created
 */
function getCellSelector(options: any): string | null {
  let selector = '';

  // Build selector from available attributes
  if (options.matrix && options.matrix.name) {
    selector += `[data-name="${options.matrix.name}"]`;
  }

  if (options.row && options.row.name) {
    selector += ` [data-row="${options.row.name}"]`;
  } else if (options.rowName) {
    selector += ` [data-row="${options.rowName}"]`;
  }

  if (options.column && options.column.name) {
    selector += ` [data-column="${options.column.name}"]`;
  } else if (options.columnName) {
    selector += ` [data-column="${options.columnName}"]`;
  }

  if (options.cell && options.cell.id) {
    selector += ` [data-cell="${options.cell.id}"]`;
  } else if (options.cellQuestion && options.cellQuestion.id) {
    selector += ` [data-cell="${options.cellQuestion.id}"]`;
  }

  return selector || null;
}

// ===============================================================
// MATRIX CELL PROCESSORS
// ===============================================================

/**
 * Process matrix inputs to enable thousand separators
 */
const processMatrixCells = () => {
  // Process matrix display cells
  const matrixCells = document.querySelectorAll(
    '.sv-table__cell .sv-string-viewer, .sv_matrix_cell .sv-string-viewer, .sv-matrix-cell__text, .sv-matrix-cell .sv-string-viewer'
  );

  matrixCells.forEach((cell) => {
    const cellText = cell.textContent;
    if (!cellText) return;

    // Format numbers with thousand separators
    const numValue = parseFloat(cellText.replace(/,/g, ''));
    if (!isNaN(numValue)) {
      const formattedValue = formatNumber(numValue);
      if (formattedValue !== cellText) {
        cell.textContent = formattedValue;
      }
    }
  });

  // Process matrix input fields
  const matrixInputs = document.querySelectorAll(
    '.sv_matrix_cell input[type="number"], .sv-table__cell input[type="number"], td input[type="number"], .sv-matrix-cell input[type="number"]'
  );

  matrixInputs.forEach((inputEl: Element) => {
    const inputHtml = inputEl as HTMLInputElement;
    if (!inputHtml.value || inputHtml.dataset.processed === 'true') return;

    // Convert to text type and mark as processed
    inputHtml.type = 'text';
    inputHtml.dataset.isNumeric = 'true';
    inputHtml.dataset.processed = 'true';

    // Check for left alignment
    const cell = inputHtml.closest('td');
    const isLeftAligned =
      cell?.classList.contains('align-left') ||
      cell?.hasAttribute('data-align-left') ||
      inputHtml.closest('[data-align-left="true"]') !== null;

    if (isLeftAligned) {
      inputHtml.dataset.alignLeft = 'true';
      return;
    }

    // Apply thousand separators and setup value handling
    const numValue = parseFloat(inputHtml.value);
    if (!isNaN(numValue)) {
      // Store raw value
      inputHtml.dataset.rawValue = inputHtml.value;

      // Format display value
      inputHtml.value = formatNumber(numValue);

      // Show raw value on focus
      inputHtml.addEventListener('focus', () => {
        inputHtml.value = inputHtml.dataset.rawValue || '';
      });

      // Format with separators on blur
      inputHtml.addEventListener('blur', () => {
        const rawValue = inputHtml.value.replace(/,/g, '');
        inputHtml.dataset.rawValue = rawValue;

        if (rawValue && !isNaN(parseFloat(rawValue))) {
          inputHtml.value = formatNumber(parseFloat(rawValue));
        }
      });

      // Update raw value on input
      inputHtml.addEventListener('input', () => {
        inputHtml.dataset.rawValue = inputHtml.value;
      });
    }
  });
};

/**
 * Format matrix cell text displays with thousand separators
 */
const directFormatMatrixCells = () => {
  // Target all matrix cells
  document
    .querySelectorAll('.sv-matrix-cell, .sv-table__cell, td.sv_matrix_cell')
    .forEach((cell) => {
      // Skip cells marked for left alignment
      if (
        cell.classList.contains('align-left') ||
        cell.hasAttribute('data-align-left') ||
        cell.classList.contains('sv-matrixdropdown__cell--align-left')
      ) {
        return;
      }

      // Find text nodes directly in the cell
      const textNodes = Array.from(cell.childNodes).filter(
        (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
      );

      textNodes.forEach((node) => {
        const text = node.textContent?.trim();
        if (!text) return;

        // Format numeric text with thousand separators
        const numValue = parseFloat(text.replace(/,/g, ''));
        if (!isNaN(numValue)) {
          const formattedValue = formatNumber(numValue);
          if (formattedValue !== text) {
            // Replace with formatted display
            const span = document.createElement('span');
            span.classList.add('sv-formatted-number');
            span.style.textAlign = 'right';
            span.style.display = 'block';
            span.style.fontFamily = 'monospace';
            span.style.paddingRight = '8px';
            span.textContent = formattedValue;
            node.parentNode?.replaceChild(span, node);
          }
        }
      });
    });
};

// ===============================================================
// MAIN INITIALIZATION
// ===============================================================

/**
 * Initializes number formatting for a survey
 *
 * @param survey - The SurveyModel instance to initialize formatting for
 */
export const initNumberFormatting = (survey: SurveyModel): void => {
  // === Register custom properties ===

  // Add alignLeft property for numeric questions
  Serializer.addProperty('text', {
    name: 'alignLeft:boolean',
    displayName: 'Align numeric value to the left (no separators)',
    category: 'layout',
    visibleIndex: 10,
    dependsOn: 'inputType',
    visibleIf: (obj: any) => obj.inputType === 'number',
    default: false,
  });

  // Add alignLeft property for matrix columns
  Serializer.addProperty('matrixdropdowncolumn', {
    name: 'alignLeft:boolean',
    displayName: 'Align numeric value to the left (no separators)',
    category: 'layout',
    visibleIndex: 10,
    default: false,
  });

  // === Add CSS for number formatting ===
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    /* Right-aligned numeric inputs */
    input[type="number"],
    .sv_q_text_number,
    .sd-input--number,
    input[data-is-numeric="true"]:not([data-align-left="true"]),
    .sv_q_expression,
    .sv_matrix_cell input[type="number"],
    .sv-table__cell input[type="number"],
    .sv-matrix-cell input[type="number"] {
      text-align: right !important;
      font-family: monospace !important;
      padding-right: 8px !important;
    }
    
    /* Left-aligned numeric inputs (when specified) */
    input[data-align-left="true"] {
      text-align: left !important;
      font-family: monospace !important;
      padding-left: 8px !important;
    }
    
    /* Right-aligned expressions */
    .sv_q_expression span {
      display: inline-block;
      width: 100%;
      text-align: right;
    }
    
    /* Right-aligned matrix cells */
    .sv-table__cell .sv-string-viewer, 
    .sv_matrix_cell .sv-string-viewer,
    .sv-matrix-cell__text,
    .sv-matrix-cell .sv-string-viewer,
    .sv-table__cell--text,
    .sv-formatted-number {
      display: block;
      text-align: right !important;
      font-family: monospace !important;
      padding-right: 8px !important;
    }
    
    /* Matrix cell alignment */
    td.sv_matrix_cell,
    .sv-table__cell {
      text-align: right !important; 
    }
    
    /* Override for left-aligned cells */
    [data-column="yearColumn"] td,
    [data-column="yearColumn"] input,
    td[data-align-left="true"],
    .sv-matrixdropdown__cell--align-left {
      text-align: left !important;
    }
  `;
  document.head.appendChild(styleElement);

  // === Event handlers ===

  // Format numbers in expressions
  survey.onTextMarkdown.add((survey, options) => {
    if (options.html || !options.text) return;
    const value = parseFloat(options.text);
    if (!isNaN(value)) {
      options.html = formatNumber(value);
    }
  });

  // Set alignment for matrix cells
  survey.onMatrixCellCreated.add((survey, options) => {
    if (options.cell && options.column) {
      const column = options.column as any;
      if (column.alignLeft === true) {
        const cellSelector = getCellSelector(options);
        if (cellSelector) {
          document.querySelectorAll(cellSelector).forEach((element) => {
            element.setAttribute('data-align-left', 'true');
            element.classList.add('align-left');
          });
        }
      }
    }
  });

  // Format matrix cell values
  survey.onMatrixCellValueChanged.add((survey, options) => {
    setTimeout(() => {
      if (typeof options.value === 'number') {
        const cellSelector = getCellSelector(options);
        if (!cellSelector) return;

        const cellElements = document.querySelectorAll(cellSelector);
        if (cellElements.length === 0) return;

        cellElements.forEach((cellElement) => {
          // Skip left-aligned cells
          const column = options.column as any;
          if (column && column.alignLeft) {
            return;
          }

          // Format input field
          const input = cellElement.querySelector('input');
          if (input && input.type === 'number') {
            input.type = 'text';
            input.dataset.isNumeric = 'true';
            input.value = formatNumber(options.value);
          } else {
            // Format text display
            const textElements =
              cellElement.querySelectorAll('.sv-string-viewer');
            textElements.forEach((el: Element) => {
              el.textContent = formatNumber(options.value);
            });
          }
        });
      }
    }, 0);
  });

  // === Set up automatic processing ===

  // Observe DOM for dynamically added matrix cells
  const observer = new MutationObserver(() => {
    processMatrixCells();
    directFormatMatrixCells();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Process cells after survey render
  survey.onAfterRenderSurvey.add(() => {
    setTimeout(() => {
      processMatrixCells();
      directFormatMatrixCells();
    }, 100);
  });

  // Process cells after page change
  survey.onCurrentPageChanged.add(() => {
    setTimeout(() => {
      processMatrixCells();
      directFormatMatrixCells();
    }, 100);
  });

  // === Handle numeric inputs ===
  survey.onAfterRenderQuestion.add((sender, options) => {
    if (
      options.question.getType() === 'text' &&
      options.question.inputType === 'number'
    ) {
      const inputEl = options.htmlElement.querySelector('input[type="number"]');
      if (!inputEl) return;

      const inputHtml = inputEl as HTMLInputElement;

      // Convert to text input for formatting
      inputHtml.type = 'text';
      inputHtml.dataset.isNumeric = 'true';

      // Handle left-aligned fields separately
      if (options.question.alignLeft) {
        inputHtml.dataset.alignLeft = 'true';
        return; // Skip thousand separators
      }

      // Set up values and hidden field
      let rawValue = inputHtml.value;

      // Create hidden input to store raw numeric value
      const hiddenInput = document.createElement('input');
      hiddenInput.type = 'hidden';
      hiddenInput.name = inputHtml.name;
      hiddenInput.value = rawValue;
      inputHtml.parentNode?.appendChild(hiddenInput);

      // Format initial display
      if (rawValue && !isNaN(parseFloat(rawValue))) {
        inputHtml.value = formatNumber(parseFloat(rawValue));
      }

      // Show raw value when editing
      inputHtml.addEventListener('focus', () => {
        if (rawValue) {
          inputHtml.value = rawValue;
        }
      });

      // Format display value when not editing
      inputHtml.addEventListener('blur', () => {
        rawValue = inputHtml.value.replace(/,/g, '');
        hiddenInput.value = rawValue;

        if (options.question.value !== parseFloat(rawValue)) {
          options.question.value = parseFloat(rawValue);
        }

        if (rawValue && !isNaN(parseFloat(rawValue))) {
          inputHtml.value = formatNumber(parseFloat(rawValue));
        }
      });

      // Keep track of raw value
      inputHtml.addEventListener('input', () => {
        rawValue = inputHtml.value;
        hiddenInput.value = rawValue;
      });
    }
  });
};

/**
 * Configures global survey settings for number formatting
 */
export const configureGlobalNumberFormatting = (): void => {
  settings.readOnlyCommentRenderMode = 'div';
};
