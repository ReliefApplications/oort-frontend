import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationItemComponent } from '../notification-item/notification-item.component';
import { Notification } from '../../../models/notification.model';

/**
 * Notification list component
 */
@Component({
  selector: 'shared-notification-list',
  standalone: true,
  imports: [CommonModule, NotificationItemComponent],
  templateUrl: './notification-list.component.html',
  styleUrls: ['./notification-list.component.scss'],
})
export class NotificationListComponent {
  /** List of notifications to display */
  @Input() notifications: Notification[] = [];
}
