import { Pipe, PipeTransform } from '@angular/core';
import { applyFilters } from '../../../map/filter';

/**
 * Interface for inline action button
 */
interface InlineAction {
  filterForm?: any;
  onlyIfCanUpdate?: boolean;
}

/**
 * Pipe to determine if an inline action should be displayed for a given data item
 */
@Pipe({
  name: 'displayInlineAction',
  standalone: true,
})
export class DisplayInlineActionPipe implements PipeTransform {
  /**
   * Determines if the inline action button should be displayed for the given data item
   *
   * @param button Action
   * @param dataItem Data item
   * @returns Whether to display the action
   */
  transform(button: InlineAction, dataItem: Record<string, unknown>): unknown {
    return (
      applyFilters(
        dataItem,
        button.filterForm ?? {
          logic: 'and',
          filters: [],
        }
      ) && (button.onlyIfCanUpdate ? dataItem.canUpdate : true)
    );
  }
}
