import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notification } from '../../../models/notification.model';
import { IconModule } from '@oort-front/ui';
import { TranslateModule } from '@ngx-translate/core';
import { DateModule } from '../../../pipes/date/date.module';
import { NotificationService } from '../../../services/notification/notification.service';
import { UnsubscribeComponent } from '../../utils/unsubscribe/unsubscribe.component';
import { takeUntil } from 'rxjs';

/**
 * Notification item component
 */
@Component({
  selector: 'shared-notification-item',
  standalone: true,
  imports: [CommonModule, IconModule, TranslateModule, DateModule],
  templateUrl: './notification-item.component.html',
  styleUrls: ['./notification-item.component.scss'],
})
export class NotificationItemComponent
  extends UnsubscribeComponent
  implements OnInit
{
  /** Notification to display */
  @Input() notification!: Notification;
  /** Whether the notification content can be displayed */
  public canDisplayContent = false;
  /** Notification service */
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    this.canDisplayContent = typeof this.notification.content === 'string';
  }

  /**
   * On notification click
   */
  onClick() {
    if (this.notification.redirect && this.notification.redirect.active) {
      this.notificationService.onNotificationRedirect(this.notification);
    }
  }

  /**
   * Marks notification as seen when clicking on the read button
   *
   * @param event prevent modal closing
   */
  onRead(event: Event): void {
    event.stopPropagation();
    this.notificationService
      .markAsSeen([this.notification.id ?? ''])
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.notification.read = true;
      });
  }
}
