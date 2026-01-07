import { Pipe, PipeTransform } from '@angular/core';
import { GridDataResult } from '@progress/kendo-angular-grid';
import { DisplayInlineActionPipe } from '../display-inline-action/display-inline-action.pipe';

/**
 * Interface for action button
 */
interface ActionButton {
  name: string;
  show: boolean;
  inline: boolean;
  filterForm?: any;
  onlyIfCanUpdate?: boolean;
}

/**
 * Pipe to filter inline actions based on grid data
 */
@Pipe({
  name: 'inlineActions',
  standalone: true,
})
export class InlineActionsPipe implements PipeTransform {
  /** Instance of DisplayInlineActionPipe to reuse its logic */
  private displayInlineActionPipe = new DisplayInlineActionPipe();

  /**
   * Filters inline actions based on their visibility and applicability to the grid data
   *
   * @param buttons Available action buttons (inline & classic in same array)
   * @param gridData Current grid data
   * @returns Filtered inline action buttons
   */
  transform(buttons: ActionButton[] | undefined, gridData: GridDataResult) {
    return (
      buttons?.filter(
        (b) =>
          b.show &&
          b.inline &&
          gridData.data.some((row) =>
            this.displayInlineActionPipe.transform(b, row)
          )
      ) || []
    );
  }
}
