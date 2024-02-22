import { Inject, Injectable } from '@angular/core';
import {
  CreateDashboardWithContextMutationResponse,
  Dashboard,
  DashboardState,
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
import { v4 as uuidv4 } from 'uuid';
import { TranslateService } from '@ngx-translate/core';
import { ApplicationService } from '../application/application.service';

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
  public states = new BehaviorSubject<DashboardState[]>([]);

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
   *  @param applicationService Shared application service
   * @param translate Angular translate service
   */
  constructor(
    @Inject('environment') environment: any,
    private apollo: Apollo,
    private route: ActivatedRoute,
    private applicationService: ApplicationService,
    private translate: TranslateService
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
    // Load dashboard states, if any
    this.states.next(dashboard.states ?? []);
  }

  /**
   * Closes the dashboard.
   */
  closeDashboard(): void {
    this.dashboard.next(null);
    // Reset dashboard states
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
   * Save the dashboard states changes in the database.
   *
   * @param id dashboard id
   * @param states dashboard states
   */
  private saveDashboardStates(id: string, states: any): void {
    this.apollo
      .mutate<EditDashboardMutationResponse>({
        mutation: EDIT_DASHBOARD,
        variables: {
          id,
          states,
        },
      })
      .subscribe({
        next: ({ errors }) => {
          this.applicationService.handleEditionMutationResponse(
            errors,
            this.translate.instant('common.dashboard.one')
          );
          if (!errors) {
            this.openDashboard({
              ...this.dashboard.getValue(),
              states,
            });
          }
        },
      });
  }

  /**
   * Add or update a dashboard state .
   *
   * @param value state value, only necessary if creating a new state
   * @param id state id to identify existing state
   * @returns the new state id, or nothing if updating an existing state
   */
  public setDashboardState(value: any, id?: string): void | string {
    console.log('setDashboardState', value, id);
    const dashboard = this.dashboard.getValue();
    if (!dashboard?.id) return;

    const states = this.states.getValue();
    if (id) {
      const oldStateIndex = states.findIndex(
        (state: DashboardState) => state.id === id
      );
      if (oldStateIndex !== -1) {
        states[oldStateIndex] = {
          ...states[oldStateIndex],
          value,
        };
        this.states.next(states);
        return;
      }
    }
    // Create id to the new state
    id = `state-${uuidv4()}`;
    const name = 'STATE-' + (states.length + 1);
    const newState: DashboardState = {
      name,
      value,
      id,
    };
    states.push(newState);
    this.states.next(states);
    // To save new dashboards
    this.saveDashboardStates(dashboard?.id, states);
    return id;
  }
}
