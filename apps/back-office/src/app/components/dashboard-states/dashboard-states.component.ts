import { Component } from '@angular/core';
import {
  DashboardService,
  DashboardState,
  StateType,
} from '@oort-front/shared';

/**
 * Dashboard states component.
 */
@Component({
  selector: 'app-dashboard-states',
  templateUrl: './dashboard-states.component.html',
  styleUrls: ['./dashboard-states.component.scss'],
})
export class DashboardStatesComponent {
  public states: DashboardState[] = [];

  /**
   * Dashboard states component.
   *
   * @param dashboardService Shared dashboard service
   */
  constructor(private dashboardService: DashboardService) {
    this.dashboardService.states$.subscribe((states: DashboardState[]) => {
      console.log('states$.subscribe', states);
      this.states = states;
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
    this.dashboardService.addDashboardState(StateType.VARIABLE, 'state1', 30);
  }
}
