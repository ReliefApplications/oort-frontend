import { ComponentType } from '@angular/cdk/portal';
import {
  ApplicationRef,
  ComponentRef,
  Inject,
  Injectable,
  TemplateRef,
  createComponent,
} from '@angular/core';
import { SnackbarComponent } from './snackbar.component';
import { SnackBarConfig } from './interfaces/snackbar.interfaces';
import { DOCUMENT } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

/** Default snackbar definition */
const DEFAULT_SNACKBAR = {
  error: false,
  duration: 5000,
  data: null,
};

/**
 * UI Snackbar service
 */
@Injectable({
  providedIn: 'root',
})
export class SnackbarService {
  /** Shadow DOM */
  public shadowDom!: any;

  /**
   * Shared snackbar service.
   * Snackbar is a brief notification that appears for a short time as a popup.
   *
   * @param document Document token containing current browser document
   * @param translate TranslateService token containing the translation service
   * @param app Application reference
   */
  constructor(
    @Inject(DOCUMENT) private document: Document,
    private translate: TranslateService,
    private app: ApplicationRef
  ) {}

  /**
   * Attach the snackbar to the document's body and add the component to the applications change detector ref
   *
   * @param snackBar SnackbarComponent component reference
   */
  private updateView(snackBar: ComponentRef<SnackbarComponent>) {
    // not sure everything is needed there
    const appendBody = this.shadowDom ?? this.document.body;
    this.app.attachView(snackBar.hostView);
    this.app.tick();
    appendBody.appendChild(snackBar.location.nativeElement);
    snackBar.changeDetectorRef.detectChanges();
  }

  /**
   * Creates a snackbar message on top of the layout.
   *
   * @param message text message to display.
   * @param config additional configuration of the message ( duration / color / error ).
   * @returns snackbar message reference.
   */
  public openSnackBar(message: string, config?: SnackBarConfig): any {
    config = {
      ...DEFAULT_SNACKBAR,
      ...config,
    };
    const snackBar = createComponent(SnackbarComponent, {
      environmentInjector: this.app.injector,
    });
    snackBar.instance.open(message, config);
    this.updateView(snackBar);
    return snackBar;
  }

  /**
   * Creates a snackbar including a component on top of the layout.
   *
   * @param component component to show inside the snackbar.
   * @param config additional configuration of the message ( duration / color / error ).
   * @returns snackbar message reference.
   */
  public openComponentSnackBar(
    component: ComponentType<any>,
    config?: SnackBarConfig
  ): any {
    config = {
      ...DEFAULT_SNACKBAR,
      ...config,
    };
    const snackBar = createComponent(SnackbarComponent, {
      environmentInjector: this.app.injector,
    });
    snackBar.instance.openFromComponent(component, config);
    this.updateView(snackBar);
    return snackBar;
  }

  /**
   * Creates a snackbar including a component on top of the layout.
   *
   * @param template component template to show inside the snackbar.
   * @param config additional configuration of the message ( duration / color / error ).
   * @returns snackbar message reference.
   */
  public openTemplateSnackBar(
    template: TemplateRef<any>,
    config?: SnackBarConfig
  ): any {
    config = {
      ...DEFAULT_SNACKBAR,
      ...config,
    };
    const snackBar = createComponent(SnackbarComponent, {
      environmentInjector: this.app.injector,
    });
    snackBar.instance.openFromTemplate(template, config);
    this.updateView(snackBar);
    return snackBar;
  }
}
