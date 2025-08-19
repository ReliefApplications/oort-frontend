import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NotificationListComponent } from '../notification-list/notification-list.component';
import { Notification } from '../../../models/notification.model';
import { ButtonModule, IconModule } from '@oort-front/ui';
import { NotificationService } from '../../../services/notification/notification.service';
import { UnsubscribeComponent } from '../../utils/unsubscribe/unsubscribe.component';
import { takeUntil } from 'rxjs';

/**
 * Notification menu component
 */
@Component({
  selector: 'shared-notification-menu',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ButtonModule,
    IconModule,
    NotificationListComponent,
  ],
  templateUrl: './notification-menu.component.html',
  styleUrls: ['./notification-menu.component.scss'],
})
export class NotificationMenuComponent extends UnsubscribeComponent {
  /** List of notifications */
  @Input() notifications: Notification[] = [];
  /** Count of unread notifications */
  @Input() unreadNotificationsCount = 0;
  /** Is loading */
  @Input() loading = true;
  /** Has more notifications */
  @Input() hasMoreNotifications = false;
  /** Fetch more notifications */
  @Output() fetchMore = new EventEmitter<void>();
  /** Notification service */
  private notificationService = inject(NotificationService);

  /**
   * Marks all notifications as read
   *
   * @param e Click event
   */
  onMarkAllNotificationsAsRead(e: any) {
    e.stopPropagation();
    this.notificationService
      .markAsSeen(this.notifications.map((n) => n.id ?? ''))
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.notifications.forEach((n) => {
          n.read = true;
        });
      });
  }
}
