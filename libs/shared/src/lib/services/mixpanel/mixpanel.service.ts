import { Inject, Injectable } from '@angular/core';
import * as Mixpanel from 'mixpanel-browser';
import { AuthService } from '../auth/auth.service';
import { Form } from '../../models/form.model';
import { HttpClient } from '@angular/common/http';
import { Record } from '../../models/record.model';

/**
 * Shared mixpanel service. Handles logs events.
 */
@Injectable({
  providedIn: 'root',
})
export class MixpanelService {
  /**
   * Shared mixpanel service. Handles logs events.
   *
   * @param authService This is the service that handles authentication.
   * @param http Http client
   * @param environment environment
   */
  constructor(
    private authService: AuthService,
    private http: HttpClient,
    @Inject('environment') private environment: any
  ) {}

  /**
   * Register login events.
   */
  public init(): void {
    Mixpanel.init(this.environment.mixpanelToken, {
      debug: true,
      track_pageview: true,
      persistence: 'localStorage',
    });
  }

  /**
   * Register creation/update of records events.
   *
   * @param type type of record event. It can be 'Add record' or 'Edit record'
   * @param form form of the record
   * @param record record of the event
   * @param details extra details about the event to be register
   */
  public recordEvent(
    type: 'Add record' | 'Edit record',
    form: Form | string,
    record: Record | string,
    details?: string
  ): void {
    Mixpanel.track(type, {
      $user: this.authService.userValue,
      $form: form,
      $record: record,
      ...(details && { $details: details }),
    });
  }

  /**
   * TODO: Test api and possibility to get data to display on front-end
   * Authentication failing.
   * https://developers.linkapi.solutions/docs/mixpanel
   * https://developer.mixpanel.com/reference/insights-query
   */
  public getEventLogs(): void {
    const apiKey = '868b6b2592744682f6380d8f5f097f54';
    const projectId = '3272751';
    const apiUrl = `https://mixpanel.com/api/2.0/events/properties/values?event=Test&expire=50000&api_key=${apiKey}&project_id=${projectId}`;
    console.log('getEventLogs: ', apiUrl);
    this.http.get<any>(apiUrl).subscribe(
      (data) => {
        console.log('Event Data:', data);
      },
      (error) => {
        console.error('Error fetching event data:', error);
      }
    );
  }
}
