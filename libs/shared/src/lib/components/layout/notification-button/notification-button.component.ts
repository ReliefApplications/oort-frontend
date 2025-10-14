import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule, MenuModule, TooltipModule } from '@oort-front/ui';
import { IndicatorsModule } from '@progress/kendo-angular-indicators';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationMenuComponent } from '../notification-menu/notification-menu.component';
import {
  Notification,
  NotificationsQueryResponse,
  NotificationSubscriptionResponse,
} from '../../../models/notification.model';
import { Apollo, QueryRef } from 'apollo-angular';
import { UnsubscribeComponent } from '../../utils/unsubscribe/unsubscribe.component';
import { takeUntil } from 'rxjs';
import { updateQueryUniqueValues } from '../../../utils/update-queries';
import { NOTIFICATION_SUBSCRIPTION } from './graphql/subscriptions';
import { GET_NOTIFICATIONS } from './graphql/queries';

/** Pagination: number of items per query */
const ITEMS_PER_PAGE = 10;

/**
 * Notification button component.
 */
@Component({
  selector: 'shared-notification-button',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    TooltipModule,
    MenuModule,
    IndicatorsModule,
    TranslateModule,
    NotificationMenuComponent,
  ],
  templateUrl: './notification-button.component.html',
  styleUrls: ['./notification-button.component.scss'],
})
export class NotificationButtonComponent
  extends UnsubscribeComponent
  implements OnInit
{
  /** Loaded notifications */
  public notifications: Notification[] = [];
  /** Count of unread notifications */
  public unreadNotificationsCount = 0;
  /** Notifications query */
  public notificationsQuery!: QueryRef<NotificationsQueryResponse>;
  /** Current page info */
  public pageInfo = {
    endCursor: '',
    hasNextPage: false,
  };
  /** Loading indicator */
  public loading = true;
  /** Apollo client */
  private apollo = inject(Apollo);

  ngOnInit(): void {
    // Get list of notifications
    this.notificationsQuery =
      this.apollo.watchQuery<NotificationsQueryResponse>({
        query: GET_NOTIFICATIONS,
        variables: {
          first: ITEMS_PER_PAGE,
        },
      });

    this.notificationsQuery.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ data, loading }) => {
        this.notifications = updateQueryUniqueValues(
          data.notifications.edges.map((edge) => edge.node),
          this.notifications
        ).sort((x, y) => {
          return Number(y.createdAt) - Number(x.createdAt);
        });
        this.unreadNotificationsCount = data.notifications.totalCount;
        this.pageInfo = data.notifications.pageInfo;
        this.loading = loading;
      });

    // Subscribe to new notifications
    this.apollo
      .subscribe<NotificationSubscriptionResponse>({
        query: NOTIFICATION_SUBSCRIPTION,
      })
      .subscribe(({ data }) => {
        if (data && data.notification) {
          // prevent new notification duplication
          if (this.notifications[0]?.id !== data.notification.id) {
            this.notifications.unshift(data.notification);
          }
        }
      });
  }

  /**
   * Fetch more notifications
   */
  fetchMore() {
    this.loading = true;
    this.notificationsQuery
      .fetchMore({
        variables: {
          first: ITEMS_PER_PAGE,
          afterCursor: this.pageInfo.endCursor,
        },
      })
      .then(({ data, loading }) => {
        this.notifications = updateQueryUniqueValues(
          data.notifications.edges.map((edge) => edge.node),
          this.notifications
        ).sort((x, y) => {
          return Number(y.createdAt) - Number(x.createdAt);
        });
        this.unreadNotificationsCount = data.notifications.totalCount;
        this.pageInfo = data.notifications.pageInfo;
        this.loading = loading;
      });
  }
}
