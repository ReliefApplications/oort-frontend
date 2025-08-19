import { Apollo } from 'apollo-angular';
import { Inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { SEE_NOTIFICATIONS } from './graphql/mutations';
import { GET_LAYOUT, GET_RECORD_BY_ID } from './graphql/queries';
import {
  Notification,
  SeeNotificationsMutationResponse,
} from '../../models/notification.model';
import { SnackbarService } from '@oort-front/ui';
import { TranslateService } from '@ngx-translate/core';
import { ResourceQueryResponse } from '../../models/resource.model';
import { clone, get } from 'lodash';
import { Layout } from '../../models/layout.model';
import { Dialog } from '@angular/cdk/dialog';
import { Router } from '@angular/router';
import { RecordQueryResponse } from '../../models/record.model';

/**
 * Shared notification service. Subscribes to Apollo to automatically fetch new notifications.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  /** Current page info */
  public pageInfo = {
    endCursor: '',
  };

  /**
   * Shared notification service. Subscribes to Apollo to automatically fetch new notifications.
   *
   * @param apollo Apollo client
   * @param snackBar shared snackbar service
   * @param dialog Dialog service
   * @param translate Angular translate service
   * @param router Angular router
   * @param environment Angular environment
   */
  constructor(
    private apollo: Apollo,
    private snackBar: SnackbarService,
    private dialog: Dialog,
    private translate: TranslateService,
    private router: Router,
    @Inject('environment') private environment: any
  ) {}

  /**
   * Handles redirection based on notification properties
   *
   * @param notification Notification
   */
  public onNotificationRedirect(notification: Notification): void {
    if (notification.redirect && notification.redirect.active) {
      const redirect = notification.redirect;
      if (redirect.type === 'recordIds' && redirect.recordIds) {
        this.redirectToRecords(notification);
      } else if (redirect.type === 'url' && redirect.url) {
        if (
          redirect.field &&
          redirect.recordIds &&
          redirect.recordIds.length > 0
        ) {
          this.apollo
            .query<RecordQueryResponse>({
              query: GET_RECORD_BY_ID,
              variables: {
                id: redirect.recordIds[0],
              },
            })
            .subscribe(({ data }) => {
              if (data) {
                const fieldValue =
                  get(data, `record.${redirect.field}`) ??
                  get(data, `record.data.${redirect.field}`);
                const redirectUrl = `${redirect.url}?${redirect.field}=${
                  fieldValue ?? ''
                }`;
                const fullUrl =
                  this.environment.module === 'backoffice'
                    ? `applications/${redirectUrl}`
                    : redirectUrl;

                this.router.navigateByUrl(fullUrl);
              }
            });
        } else {
          const fullUrl =
            this.environment.module === 'backoffice'
              ? `applications/${redirect.url}`
              : `${redirect.url}`;
          this.router.navigateByUrl(fullUrl);
        }
      }
    }
  }

  /**
   * Redirect to records modal after clicking on notification with active redirection.
   *
   * @param notification The notification that was clicked on
   */
  public async redirectToRecords(notification: Notification) {
    const redirect = notification.redirect;

    if (redirect && redirect.active && redirect.layout && redirect.resource) {
      if (!redirect.recordIds?.length) {
        // No record id detected
        this.snackBar.openSnackBar(
          this.translate.instant('components.notifications.noRecord'),
          { error: true }
        );
      }

      if (redirect.recordIds?.length === 1) {
        // Open record modal to single record id
        const { RecordModalComponent } = await import(
          '../../components/record-modal/record-modal.component'
        );
        this.dialog.open(RecordModalComponent, {
          data: {
            recordId: redirect.recordIds[0],
          },
          autoFocus: false,
        });
      } else if (redirect.recordIds?.length) {
        // Get layout selected on trigger
        const layout = await this.getNotificationLayout(
          redirect.layout,
          redirect.resource
        );

        if (layout?.query) {
          // Open ResourceGridModalComponent to multiple record ids
          const { ResourceGridModalComponent } = await import(
            '../../components/search-resource-grid-modal/search-resource-grid-modal.component'
          );
          this.dialog.open(ResourceGridModalComponent, {
            data: {
              gridSettings: clone(layout.query),
            },
          });
        } else {
          this.snackBar.openSnackBar(
            this.translate.instant(
              'components.widget.summaryCard.errors.invalidSource'
            ),
            { error: true }
          );
        }
      }
    } else {
      this.snackBar.openSnackBar(
        this.translate.instant('components.notifications.noRedirect'),
        { error: true }
      );
    }
  }

  /**
   * Marks all notifications as seen and remove it from the array of notifications.
   *
   * @param notificationsIds ids of the notifications to mark as seen
   * @returns Mark as seen mutation
   */
  public markAsSeen(notificationsIds: string[]) {
    return this.apollo.mutate<SeeNotificationsMutationResponse>({
      mutation: SEE_NOTIFICATIONS,
      variables: {
        ids: notificationsIds,
      },
    });
  }

  /**
   * Get notification with trigger redirection layout
   *
   * @param layout layout id
   * @param resource resource id
   * @returns Layout object
   */
  private async getNotificationLayout(
    layout: string,
    resource: string
  ): Promise<Layout | undefined> {
    const apolloRes = await firstValueFrom(
      this.apollo.query<ResourceQueryResponse>({
        query: GET_LAYOUT,
        variables: {
          id: layout,
          resource,
        },
      })
    );

    if (get(apolloRes, 'data')) {
      return apolloRes.data.resource.layouts?.edges[0]?.node;
    } else {
      return undefined;
    }
  }
}
