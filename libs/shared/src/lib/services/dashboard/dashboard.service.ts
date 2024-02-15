import { Inject, Injectable } from '@angular/core';
import {
  CreateDashboardWithContextMutationResponse,
  Dashboard,
  EditDashboardMutationResponse,
  WIDGET_TYPES,
} from '../../models/dashboard.model';
import {
  EditPageContextMutationResponse,
  PageContextT,
} from '../../models/page.model';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { Apollo } from 'apollo-angular';
import {
  EDIT_DASHBOARD,
  UPDATE_PAGE_CONTEXT,
  CREATE_DASHBOARD_WITH_CONTEXT,
} from './graphql/mutations';
import { ActivatedRoute } from '@angular/router';
import { get } from 'lodash';

/** DashboardState interface */
export interface DashboardState {
  name: string;
  value: any;
  gridId?: string;
}

/**
 * Shared dashboard service. Handles dashboard events.
 * TODO: rename all tiles into widgets
 */
@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  /** List of available widgets */
  public availableWidgets = WIDGET_TYPES;
  /** Current dashboard */
  private dashboard = new BehaviorSubject<Dashboard | null>(null);
  /** Current dashboard states */
  private states = new BehaviorSubject<DashboardState[]>([]);
  /** Automatically map selected grid widget rows to a context */
  public automaticallyMapSelected = new BehaviorSubject<boolean>(false);
  /** Automatically map selected grid widget rows to a context */
  public automaticallyMapView = new BehaviorSubject<boolean>(false);

  /** @returns Current automaticallyMapSelected as observable */
  get automaticallyMapSelected$(): Observable<boolean> {
    return this.automaticallyMapSelected.asObservable();
  }

  /** @returns Current automaticallyMapView as observable */
  get automaticallyMapView$(): Observable<boolean> {
    return this.automaticallyMapView.asObservable();
  }

  /** @returns Current dashboard states as observable */
  get states$(): Observable<DashboardState[]> {
    return this.states.asObservable();
  }

  /** @returns Current dashboard as observable */
  get dashboard$(): Observable<Dashboard | null> {
    return this.dashboard.asObservable();
  }

  /** @returns The id of the currently loaded template record, if any */
  get templateRecord() {
    return this.route.snapshot.queryParamMap.get('id');
  }

  /**
   * Shared dashboard service. Handles dashboard events.
   * TODO: rename all tiles into widgets
   *
   * @param environment environment in which we run the application
   * @param apollo Apollo client
   * @param route Angular route
   */
  constructor(
    @Inject('environment') environment: any,
    private apollo: Apollo,
    private route: ActivatedRoute
  ) {
    this.availableWidgets = WIDGET_TYPES.filter((widget) =>
      get(environment, 'availableWidgets', []).includes(widget.id)
    );
  }

  /**
   * Opens a new dashboard.
   *
   * @param dashboard dashboard to open.
   */
  openDashboard(dashboard: Dashboard): void {
    this.dashboard.next(dashboard);
    // Reset dashboard states
    this.automaticallyMapSelected.next(false);
    this.automaticallyMapView.next(false);
    this.states.next([]);
  }

  /**
   * Closes the dashboard.
   */
  closeDashboard(): void {
    this.dashboard.next(null);
    console.log('closeDashboard');
    // Reset dashboard states
    this.automaticallyMapSelected.next(false);
    this.automaticallyMapView.next(false);
    this.states.next([]);
  }

  /**
   * Finds the settings component from the widget passed as 'tile'.
   *
   * @param tile tile to get settings of.
   * @returns Tile settings template.
   */
  public findSettingsTemplate(tile: any): any {
    const availableTile = this.availableWidgets.find(
      (x) => x.component === tile.component
    );
    return availableTile && availableTile.settingsTemplate
      ? availableTile.settingsTemplate
      : null;
  }

  /**
   * Updates the context of the page.
   *
   * @param context The new context of the page
   * @returns promise the mutation result
   */
  public updateContext(context: PageContextT) {
    const dashboard = this.dashboard.getValue();
    if (!dashboard?.page?.id) return;

    const res = firstValueFrom(
      this.apollo.mutate<EditPageContextMutationResponse>({
        mutation: UPDATE_PAGE_CONTEXT,
        variables: {
          id: dashboard.page.id,
          context,
        },
      })
    );

    res.then(({ data }) => {
      if (data) {
        this.dashboard.next({
          ...dashboard,
          page: {
            ...dashboard.page,
            context,
            contentWithContext: data.editPageContext.contentWithContext,
          },
        });
      }
    });

    return res;
  }

  /**
   * Duplicates a dashboard and adds context to it.
   *
   * @param page Page to copy content from
   * @param context The type of context to be added to the dashboard
   * @param id The id of the context to be added to the dashboard
   * @returns The newly created dashboard
   */
  public createDashboardWithContext(
    page: string,
    context: 'element' | 'record',
    id: string | number
  ) {
    return firstValueFrom(
      this.apollo.mutate<CreateDashboardWithContextMutationResponse>({
        mutation: CREATE_DASHBOARD_WITH_CONTEXT,
        variables: {
          page,
          [context]: id,
        },
      })
    );
  }

  /**
   * Edit dashboard name
   *
   * @param name new name
   * @param callback callback method
   */
  public editName(name: string, callback?: any): void {
    const dashboard = this.dashboard.getValue();
    if (!dashboard?.id) return;
    this.apollo
      .mutate<EditDashboardMutationResponse>({
        mutation: EDIT_DASHBOARD,
        variables: {
          id: dashboard.id,
          name,
        },
      })
      .subscribe(() => {
        if (callback) callback();
      });
  }

  /**
   * Saves the buttons of the dashboard.
   *
   * @param buttons Button actions to save
   */
  public saveDashboardButtons(buttons: Dashboard['buttons']) {
    const dashboard = this.dashboard.getValue();
    if (!dashboard?.id) return;
    buttons = buttons || [];

    this.apollo
      .mutate<EditDashboardMutationResponse>({
        mutation: EDIT_DASHBOARD,
        variables: {
          id: dashboard.id,
          buttons,
        },
      })
      .subscribe(() => {
        this.dashboard.next({
          ...dashboard,
          buttons,
        });
      });
  }

  /**
   * Add or update a dashboard state .
   *
   * @param name state name
   * @param value state value, only necessary if creating a new state
   * @param gridId grid id to identify grid rows state
   */
  public setDashboardState(name: string, value: any, gridId?: string): void {
    console.log('setDashboardState', name, value);
    const states = this.states.getValue();
    if (gridId) {
      const oldStateIndex = states.findIndex(
        (state: DashboardState) => state.gridId === gridId
      );
      if (oldStateIndex !== -1) {
        states[oldStateIndex] = {
          ...states[oldStateIndex],
          value,
        };
        this.states.next(states);
        console.log('this.states', this.states.getValue);
        return;
      }
    }
    const newState: DashboardState = {
      name,
      value,
      ...(gridId && { gridId }),
    };
    console.log('newState', newState);
    states.push(newState);
    this.states.next(states);
  }
}
