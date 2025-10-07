import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  GeofieldsListboxComponent,
  ApplicationDropdownComponent,
  AuthService,
  ReferenceDataDropdownComponent,
  ResourceAvailableFieldsComponent,
  ResourceCustomFiltersComponent,
  ResourceDropdownComponent,
  ResourceSelectTextComponent,
  TestServiceDropdownComponent,
} from '@oort-front/shared';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../environments/environment';
import { CldrIntlService, IntlService } from '@progress/kendo-angular-intl';
import { Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Root component of back-office.
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit, OnDestroy {
  /** Static component declaration of survey custom components for the property grid editor in order to avoid removal on tree shake for production build */
  static declaration = [
    ApplicationDropdownComponent,
    GeofieldsListboxComponent,
    ReferenceDataDropdownComponent,
    ResourceAvailableFieldsComponent,
    ResourceCustomFiltersComponent,
    ResourceDropdownComponent,
    ResourceSelectTextComponent,
    TestServiceDropdownComponent,
  ];
  /** Application title */
  title = 'back-office';

  // Add destroy subject for unsubscription
  private destroy$ = new Subject<void>();

  /**
   * Root component of back-office
   *
   * @param authService Shared authentication service
   * @param translate Angular translate service
   * @param kendoIntl Kendo Intl Service
   * @param document The document object
   */
  constructor(
    private authService: AuthService,
    private translate: TranslateService,
    private kendoIntl: IntlService,
    @Inject(DOCUMENT) private document: Document
  ) {
    // Update the document language attribute when the language changes
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ lang }) => {
        this.document.documentElement.lang = lang;
      });

    this.translate.addLangs(environment.availableLanguages);
    this.translate.setDefaultLang(environment.availableLanguages[0]);
    (this.kendoIntl as CldrIntlService).localeId =
      environment.availableLanguages[0];
  }

  /**
   * Configuration of the Authentication behavior
   */
  ngOnInit(): void {
    this.authService.initLoginSequence();
  }

  // Clean up subscriptions to prevent memory leaks
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}