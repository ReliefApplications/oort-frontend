import {
  AfterViewChecked,
  Directive,
  ElementRef,
  inject,
  Renderer2,
} from '@angular/core';
import { GridComponent } from '@progress/kendo-angular-grid';

/**
 * Directive to add a data-field attribute to Kendo grid columns
 * How to use:
 * - Add the directive to your Kendo grid:
 *   <kendo-grid autoFieldLabels>...</kendo-grid>
 *
 * This will automatically add a data-field attribute to each cell in the grid,
 * corresponding to the field name defined in the grid's column configuration.
 */
@Directive({
  selector: 'kendo-grid[autoFieldLabels]',
  standalone: true,
})
export class GridDataFieldAttributeDirective implements AfterViewChecked {
  /** Element reference */
  private el = inject(ElementRef);
  /** Renderer to manipulate the DOM */
  private renderer = inject(Renderer2);
  /** Kendo Grid component */
  private grid = inject(GridComponent);

  ngAfterViewChecked(): void {
    // Get all columns and rows
    const columns = this.grid.columns.toArray();
    const rows = this.el.nativeElement.querySelectorAll('.k-grid-table tr');

    rows.forEach((row: HTMLElement) => {
      const cells = row.querySelectorAll('td');

      cells.forEach((td: HTMLElement, index: number) => {
        const column: any = columns.find((col) => col.leafIndex === index);
        if (column && column.field) {
          // Set the data-field attribute on the cell directly
          this.renderer.setAttribute(td, 'data-field', column.field);
        }
      });
    });
  }
}
