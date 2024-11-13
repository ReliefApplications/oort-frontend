import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { SIDENAV_WIDTH_PX } from '@oort-front/ui';
import { trigger, transition, style, animate } from '@angular/animations';

/**
 * Navbar used in the main layout.
 * Can be horizontal or vertical.
 */
@Component({
  selector: 'shared-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('0.3s 0.1s ease-in-out', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class NavbarComponent {
  /** Width of the new sidenav */
  public SIDENAV_WIDTH_PX = SIDENAV_WIDTH_PX;
  /** Application layout */
  @Input() appLayout = false;
  /** Does admin has permission to add a page */
  @Input() canAddPage = false;
  /** Should be displayed vertically or horizontally.*/
  @Input() vertical = true;
  /** Navigation groups */
  @Input() navGroups: any[] = [];
  /** Navigation group selected */
  @Input() nav: any;
  /** Application name displayed on top of the navbar */
  @Input() appName = '';
  /** Application logo */
  @Input() appLogo = '';
  /** Variant style for the layout */
  @Input() bottomOptions: any[] = [];
  /** Admin nav items to be displayed on the bottom */
  public adminNavItems: any[] = [];

  /** Event emitted when the navbar items are reordered. */
  @Output() reorder: EventEmitter<any> = new EventEmitter();
  /** Boolean for portview threshold */
  public largeDevice: boolean;
  /** Used to change text color on variant */
  public hovered = '';

  /**
   * Navbar used in the main layout.
   * Can be horizontal or vertical.
   */
  constructor() {
    this.largeDevice = window.innerWidth > 1024;
  }

  /**
   * Handles the click event
   *
   * @param callback Callback that defines the action to perform on click
   * @param event Event that happends with the click
   */
  onClick(callback: () => any, event: any): void {
    callback();
    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Drop event handler. Move item in layout navigation item list.
   *
   * @param event drop event
   * @param group group where the event occurs
   */
  drop(event: any, group: any): void {
    moveItemInArray(group.navItems, event.previousIndex, event.currentIndex);
    this.reorder.emit(group.navItems);
  }

  /**
   * Change the display depending on windows size.
   *
   * @param event Event that implies a change in window size
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.largeDevice = event.target.innerWidth > 1024;
  }
}
