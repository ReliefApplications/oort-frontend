import {
  Component,
  Input,
  Output,
  EventEmitter,
  HostListener,
} from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';

/**
 * Available variants for the style of this component
 * Use 'original' to get the default look
 * Use 'new' to get the oort revamp look (TODO: Horizontal compatibility)
 */
type SidenavVariantsTypes = 'original' | 'new';

/**
 * Navbar used in the main layout.
 * Can be horizontal or vertical.
 */
@Component({
  selector: 'shared-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
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
  /** Variant style for the layout */
  @Input() variant: SidenavVariantsTypes = 'original';
  /** Variant style for the layout */
  @Input() bottomOptions: any[] = [];

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
