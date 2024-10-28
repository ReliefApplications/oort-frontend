import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Application } from '../../../../models/application.model';
import { User } from 'libs/shared/src/lib/models/user.model';

/**
 * This interface describes the data structure of the status of the application
 */
interface IStatus {
  name: string;
  short: string;
  class: string;
}

/**
 * This component is used to display the summary cards for with the information for each application on the home page
 */
@Component({
  selector: 'shared-application-summary',
  templateUrl: './application-summary.component.html',
  styleUrls: ['./application-summary.component.scss'],
})
export class ApplicationSummaryComponent {
  /** Application input */
  @Input() application!: Application;
  /** Is profile app summary */
  @Input() isProfile = false;
  /** Current user */
  @Input() user!: User;
  /** Preview event emitter */
  @Output() preview = new EventEmitter();
  /** Delete event emitter */
  @Output() delete = new EventEmitter();
  /** Clone event emitter */
  @Output() clone = new EventEmitter();
  /** Edit access event emitter */
  @Output() editAccess = new EventEmitter();
  /** Favorite event emitter */
  @Output() favorite = new EventEmitter();
  /** Statuses */
  statuses: IStatus[] = [
    {
      name: 'active',
      short: 'A',
      class: 'bg-green-550',
    },
    {
      name: 'pending',
      short: 'P',
      class: 'bg-yellow-550',
    },
    {
      name: 'archived',
      short: 'D',
      class: 'bg-red-550',
    },
  ];

  /**
   * Getter for the status of the application
   *
   * @returns the status of the application
   */
  get status(): IStatus | undefined {
    return this.statuses.find((x) => x.name === this.application.status);
  }

  /**
   * The constructor function is a special function that is called when a new instance of the class is
   * created.
   *
   * @param translate the translating service
   */
  constructor(private translate: TranslateService) {
    this.statuses[0].short = translate
      .instant('common.status_active')[0]
      .toUpperCase();
    this.statuses[1].short = translate
      .instant('common.status_pending')[0]
      .toUpperCase();
    this.statuses[2].short = translate
      .instant('common.status_archived')[0]
      .toUpperCase();
  }

  /**
   * Emits the favorite event
   *
   * @param application the application to favorite
   */
  onSelectFavorite(application: Application, event: any): void {
    event?.stopPropagation();
    this.favorite.emit(application);
  }

  /**
   * Gets current user role for current application
   *
   * @returns the role of the current user
   */
  getRole(): string {
    const role = this.user.roles?.find(
      (role) => role.application?.id === this.application.id
    );
    return role?.title || this.translate.instant('common.none');
  }

  /**
   * Gets current position attributes for current application
   *
   * @returns the position attributes of the current user
   */
  getPositionAttributes(): string | undefined {
    return this.user.positionAttributes?.join(', ');
  }
}
