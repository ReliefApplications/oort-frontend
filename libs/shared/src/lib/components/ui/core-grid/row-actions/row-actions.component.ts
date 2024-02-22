import { Component, EventEmitter, Input, Output } from '@angular/core';
import { rowActions } from '../grid/grid.component';
import { get, intersection } from 'lodash';

/** Translation keys for each of the row action types */
const ACTIONS_TRANSLATIONS: Record<(typeof rowActions)[number], string> = {
  update: 'common.update',
  delete: 'common.delete',
  history: 'common.history',
  convert: 'models.record.convert',
  remove: 'components.widget.settings.grid.actions.remove',
};

/** Component for grid row actions */
@Component({
  selector: 'shared-grid-row-actions',
  templateUrl: './row-actions.component.html',
  styleUrls: ['./row-actions.component.scss'],
})
export class GridRowActionsComponent {
  /** Item to be shown */
  @Input() item: any;

  /** Actions */
  @Input() actions = {
    update: false,
    delete: false,
    history: false,
    convert: false,
    remove: false,
  };

  /** Tells if only one action is enabled, if it should be displayed as a single button */
  @Input() singleActionAsButton = false;

  /** Event emitter for the action event */
  @Output() action = new EventEmitter();

  /** @returns A boolean indicating if the component must be shown */
  get display(): boolean {
    return (
      this.actions.history ||
      this.actions.remove ||
      (this.item.canDelete && this.actions.delete) ||
      (this.item.canUpdate && (this.actions.update || this.actions.convert))
    );
  }

  /** @returns The number of actions active for the row */
  get availableActions() {
    return intersection(
      Object.keys(this.actions).filter((key: string) =>
        get(this.actions, key, false)
      ),
      rowActions
    ).map((action: string) => ({
      action,
      translationKey:
        ACTIONS_TRANSLATIONS[action as (typeof rowActions)[number]],
    }));
  }
}
