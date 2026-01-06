import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Triggers, TriggersType } from '../../triggers.types';
import { CustomNotification } from '@oort-front/shared';
import { get } from 'lodash';

type TriggerTableElement = {
  name: string;
  type: Triggers;
  trigger: CustomNotification;
};

/**
 * Triggers list component.
 */
@Component({
  selector: 'app-triggers-list',
  templateUrl: './triggers-list.component.html',
  styleUrls: ['./triggers-list.component.scss'],
})
export class TriggersListComponent implements OnChanges {
  /** Triggers list */
  @Input() triggersList: CustomNotification[] = [];
  /** Disabled flag */
  @Input() disabled = false;
  /** Current application id */
  @Input() applicationId!: string;

  /** Event emitter for edit trigger */
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onEdit = new EventEmitter<{
    trigger: CustomNotification;
    type: TriggersType;
  }>();
  /** Event emitter for edit trigger */
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onDuplicate = new EventEmitter<{
    trigger: CustomNotification;
    type: TriggersType;
  }>();
  /** Event emitter for delete trigger */
  // eslint-disable-next-line @angular-eslint/no-output-on-prefix
  @Output() onDelete = new EventEmitter<{
    trigger: CustomNotification;
  }>();
  /** Event emitter for opening filter modal */
  @Output() openFilter = new EventEmitter<CustomNotification>();

  /** Triggers */
  public triggers = new Array<TriggerTableElement>();
  /** Displayed columns */
  public displayedColumns: string[] = [
    'name',
    'type',
    'trigger',
    'lastExecution',
    'actions',
  ];
  /** Triggers enum */
  public TriggersEnum = Triggers;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.triggersList) {
      this.triggers = this.setTableElements(this.triggersList);
    }
  }

  /**
   * Open filter modal of the selected trigger
   *
   * @param trigger Selected trigger
   */
  public onOpenFilter(trigger: CustomNotification): void {
    this.openFilter.emit(trigger);
  }

  /**
   * Serialize list of table elements from triggers
   *
   * @param triggersList triggers to serialize
   * @returns serialized elements
   */
  private setTableElements(
    triggersList: CustomNotification[]
  ): TriggerTableElement[] {
    return triggersList.map((x: CustomNotification) => this.setTableElement(x));
  }

  /**
   * Serialize single table element from trigger
   *
   * @param trigger resource to serialize
   * @returns serialized element
   */
  private setTableElement(trigger: CustomNotification): TriggerTableElement {
    return {
      name: trigger.name ?? 'Nameless trigger',
      type: trigger.onRecordCreation
        ? Triggers.onRecordCreation
        : trigger.onRecordUpdate
        ? Triggers.onRecordUpdate
        : Triggers.cronBased,
      trigger: {
        ...trigger,
        id: get(trigger, '_id', ''), // not provided by default by the API
      },
    };
  }
}
