import { Component } from '@angular/core';

/**
 * Modal to update resource incremental id shape.
 */
@Component({
  selector: 'app-id-shape-modal',
  templateUrl: './id-shape-modal.component.html',
  styleUrls: ['./id-shape-modal.component.scss'],
})
export class IdShapeModalComponent {
  /**
   * Parse the ID expression and return an example of the expression
   *
   * @param expression The expression to parse
   * @param padding Padding for the incremental id
   * @returns An object with the validity of the expression and an example of the expression
   */
  public parseIDExpression(
    expression: string,
    padding: number
  ): { valid: boolean; example: string | null } {
    expression = expression.trim();
    // The expression must include {incremental}
    if (!expression.includes('{incremental}')) {
      return {
        valid: false,
        example: null,
      };
    }
    let res = expression;

    const randomId = Math.floor(Math.random() * 1000) + 1;
    const year = new Date().getFullYear();
    const formInitial = 'F';
    const formName = 'FORM_NAME';

    // Replace all instances of {incremental} with the randomId padded with 0s
    res = res.replace(
      /{incremental}/g,
      randomId.toString().padStart(padding, '0')
    );

    // Replace all instances of {year} with the current year
    res = res.replace(/{year}/g, year.toString());

    // Replace all instances of {formInitial} with the first letter of the form name
    res = res.replace(/{formInitial}/g, formInitial);

    // Replace all instances of {formName} with the form name
    res = res.replace(/{formName}/g, formName);

    return {
      valid: true,
      example: res,
    };
  }
}
