import { Component } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import {
  DashboardService,
  DashboardState,
  UnsubscribeComponent,
} from '@oort-front/shared';
import { takeUntil } from 'rxjs';

/** Interface for the table element */
interface DashboardStateElement {
  state: DashboardState;
}

/**
 * Dashboard states component.
 */
@Component({
  selector: 'app-dashboard-states',
  templateUrl: './dashboard-states.component.html',
  styleUrls: ['./dashboard-states.component.scss'],
})
export class DashboardStatesComponent extends UnsubscribeComponent {
  /** List of states */
  public states: DashboardState[] = [];
  public statesElements: DashboardStateElement[] = [];
  /** Columns to display on table */
  public displayedColumns = ['name', 'value'];
  // TODO: check if need 'actions' columns to allow rename states

  /**
   * Dashboard states component.
   *
   * @param dashboardService Shared dashboard service
   * @param fb This is the service that will be used to build forms.
   */
  constructor(
    private dashboardService: DashboardService,
    private fb: FormBuilder
  ) {
    super();
    this.dashboardService.states$
      .pipe(takeUntil(this.destroy$))
      .subscribe((states: DashboardState[]) => {
        console.log('DashboardStatesComponent states$.subscribe', states);
        this.states = states;
        this.statesElements = this.setTableElements(states);
        console.log('this.statesElements', this.statesElements);
      });
  }

  /**
   * Add new variables state (can be used on the forms fields).
   *
   * @param name state name
   * @param value state value
   */
  public onAdd(name?: string, value?: any): void {
    console.log('onAdd', name, value);
    this.dashboardService.setDashboardState('state1', 30);
  }

  /**
   * Serialize single table element from states
   *
   * @param state state to serialize
   * @returns serialized element
   */
  private setTableElement(state: DashboardState): DashboardStateElement {
    return {
      state,
    };
  }

  /**
   * Serialize list of table elements from states
   *
   * @param states states to serialize
   * @returns serialized elements
   */
  private setTableElements(states: DashboardState[]): DashboardStateElement[] {
    return states.map((x: DashboardState) => this.setTableElement(x));
  }
}
