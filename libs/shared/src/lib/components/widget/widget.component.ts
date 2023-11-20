import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  HostBinding,
  OnInit,
  OnDestroy,
  Inject,
  TemplateRef,
  ElementRef,
} from '@angular/core';
import { ChartComponent } from '../widgets/chart/chart.component';
import { EditorComponent } from '../widgets/editor/editor.component';
import { GridWidgetComponent } from '../widgets/grid/grid.component';
import { MapWidgetComponent } from '../widgets/map/map.component';
import { SummaryCardComponent } from '../widgets/summary-card/summary-card.component';
import { v4 as uuidv4 } from 'uuid';
import get from 'lodash/get';
import { RestService } from '../../services/rest/rest.service';
import { DOCUMENT } from '@angular/common';
import { ShadowDomService } from '@oort-front/ui';

/** Component for the widgets */
@Component({
  selector: 'shared-widget',
  templateUrl: './widget.component.html',
  styleUrls: ['./widget.component.scss'],
})
export class WidgetComponent implements OnInit, OnDestroy {
  /** Current widget definition */
  @Input() widget: any;
  // todo: rename or delete
  /** Is widget in fullscreen mode */
  @Input() header = true;
  /** Can user update widget */
  @Input() canUpdate = false;
  /** Template to display on the left of widget header */
  @Input() headerLeftTemplate?: TemplateRef<any>;
  /** Template to display on the right of widget header */
  @Input() headerRightTemplate?: TemplateRef<any>;
  /** Is fullscreen mode activated */
  @Input() fullscreen = false;
  /** Edit widget event emitter */
  @Output() edit: EventEmitter<any> = new EventEmitter();
  /** Change step workflow event emitter */
  @Output() changeStep: EventEmitter<number> = new EventEmitter();
  /** Id of the ticket. Visible in the dom */
  @HostBinding()
  id = `widget-${uuidv4()}`;
  /** Reference to widget inner component */
  @ViewChild('widgetContent')
  widgetContentComponent!:
    | ChartComponent
    | GridWidgetComponent
    | MapWidgetComponent
    | EditorComponent
    | SummaryCardComponent;
  /** Html element containing widget custom style */
  private customStyle?: HTMLStyleElement;

  /** @returns would component block navigation */
  get canDeactivate() {
    if (this.widgetContentComponent instanceof GridWidgetComponent) {
      return this.widgetContentComponent.canDeactivate;
    } else {
      return true;
    }
  }

  /** @returns should widget show header, based on widget settings */
  get showHeader() {
    return get(this.widget, 'settings.widgetDisplay.showHeader') ?? true;
  }

  /** @returns should widget show border, based on widget settings */
  get showBorder() {
    return get(this.widget, 'settings.widgetDisplay.showBorder') ?? true;
  }

  /** @returns should widget use padding, based on widget settings */
  get usePadding() {
    return get(this.widget, 'settings.widgetDisplay.usePadding') ?? true;
  }

  /**
   * Widget component
   *
   * @param restService Shared rest service
   * @param document document
   * @param elementRef reference to element
   * @param shadowDomService shadow dom service to handle the current host of the component
   */
  constructor(
    private restService: RestService,
    @Inject(DOCUMENT) private document: Document,
    public elementRef: ElementRef,
    private shadowDomService: ShadowDomService
  ) {}

  ngOnInit(): void {
    // Get style from widget definition
    const style = get(this.widget, 'settings.widgetDisplay.style') || '';
    if (style) {
      const scss = `#${this.id} {
        ${style}
      }`;
      // Compile to css ( we store style as scss )
      this.restService
        .post('style/scss-to-css', { scss }, { responseType: 'text' })
        .subscribe((css) => {
          this.customStyle = this.document.createElement('style');
          this.customStyle.appendChild(this.document.createTextNode(css));
          if (this.shadowDomService.isShadowRoot) {
            // Add it to shadow root
            this.shadowDomService.currentHost.appendChild(this.customStyle);
          } else {
            // Add to head of document
            const head = this.document.getElementsByTagName('head')[0];
            head.appendChild(this.customStyle);
          }
        });
    }
  }

  ngOnDestroy(): void {
    if (this.customStyle) {
      if (this.shadowDomService.isShadowRoot) {
        // If shadow root, remove style from it
        this.shadowDomService.currentHost.removeChild(this.customStyle);
      } else {
        // Remove style from head if exists, to avoid too many styles to be active at same time
        this.document
          .getElementsByTagName('head')[0]
          .removeChild(this.customStyle);
      }
    }
  }
}
