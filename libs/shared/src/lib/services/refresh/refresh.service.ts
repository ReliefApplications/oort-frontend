import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

/**
 * Interface for refresh events
 */
export interface RefreshEvent {
  type:
    | 'record-updated'
    | 'record-created'
    | 'record-deleted'
    | 'widget-refresh';
  data?: {
    formId?: string;
    recordId?: string | string[];
    resourceId?: string;
  };
}

/**
 * Shared refresh service to notify components when data needs to be refreshed
 */
@Injectable({
  providedIn: 'root',
})
export class RefreshService {
  /** Subject for refresh events */
  private refreshSubject = new Subject<RefreshEvent>();

  /** Observable for components to subscribe to */
  public refresh$: Observable<RefreshEvent> =
    this.refreshSubject.asObservable();

  /**
   * Trigger a refresh event
   *
   * @param type Type of refresh event
   * @param data Optional data associated with the event
   */
  triggerRefresh(
    type: RefreshEvent['type'],
    data?: RefreshEvent['data']
  ): void {
    this.refreshSubject.next({ type, data });
  }

  /**
   * Trigger a record update refresh
   *
   * @param formId Form ID
   * @param recordId Record ID(s)
   * @param resourceId Optional resource ID
   */
  triggerRecordUpdate(
    formId?: string,
    recordId?: string | string[],
    resourceId?: string
  ): void {
    this.triggerRefresh('record-updated', { formId, recordId, resourceId });
  }

  /**
   * Trigger a record creation refresh
   *
   * @param formId Form ID
   * @param recordId Record ID
   * @param resourceId Optional resource ID
   */
  triggerRecordCreated(
    formId?: string,
    recordId?: string,
    resourceId?: string
  ): void {
    this.triggerRefresh('record-created', { formId, recordId, resourceId });
  }

  /**
   * Trigger a widget refresh
   */
  triggerWidgetRefresh(): void {
    this.triggerRefresh('widget-refresh');
  }
}
