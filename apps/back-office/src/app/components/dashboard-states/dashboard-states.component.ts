import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import {
  DashboardService,
  DashboardState,
  StateType,
  UnsubscribeComponent,
} from '@oort-front/shared';
import { takeUntil } from 'rxjs';
import { isNil } from 'lodash';

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
export class DashboardStatesComponent
  extends UnsubscribeComponent
  implements OnInit
{
  /** List of states */
  public states: DashboardState[] = [];
  public statesElements: DashboardStateElement[] = [];
  /** Columns to display on table */
  public displayedColumns = ['name', 'value', 'type'];
  // TODO: check if need 'actions' columns to allow rename states
  /** Reactive Form */
  public form!: ReturnType<typeof this.createForm>;

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
    this.dashboardService.states$.subscribe((states: DashboardState[]) => {
      console.log('states$.subscribe', states);
      this.states = states;
      this.statesElements = this.setTableElements(states);
      console.log('this.statesElements', this.statesElements);
    });
  }

  ngOnInit(): void {
    this.form = this.createForm();

    // Listen to automaticallyMapSelected control updates
    this.form?.controls.automaticallyMapSelected.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: any) => {
        if (!isNil(value)) {
          this.dashboardService.automaticallyMapSelected.next(value);
        }
      });

    // Listen to automaticallyMapView control updates
    this.form?.controls.automaticallyMapView.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: any) => {
        if (!isNil(value)) {
          this.dashboardService.automaticallyMapView.next(value);
        }
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

  /**
   * Create the form group
   *
   * @returns Form group
   */
  private createForm() {
    return this.fb.group({
      automaticallyMapSelected: this.fb.control(
        this.dashboardService.automaticallyMapSelected.getValue()
      ),
      automaticallyMapView: this.fb.control(
        this.dashboardService.automaticallyMapView.getValue()
      ),
    });
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
