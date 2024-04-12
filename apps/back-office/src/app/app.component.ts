import { Component, OnInit } from '@angular/core';
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
  MixpanelService,
} from '@oort-front/shared';
import { TranslateService } from '@ngx-translate/core';
import { environment } from '../environments/environment';
import { CldrIntlService, IntlService } from '@progress/kendo-angular-intl';

/**
 * Root component of back-office.
 */
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
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

  /**
   * Root component of back-office
   *
   * @param authService Shared authentication service
   * @param translate Angular translate service
   * @param kendoIntl Kendo Intl Service
   * @param mixpanelService This is the service used to register logs
   */
  constructor(
    private authService: AuthService,
    private translate: TranslateService,
    private kendoIntl: IntlService,
    private mixpanelService: MixpanelService
  ) {
    this.translate.addLangs(environment.availableLanguages);
    this.translate.setDefaultLang(environment.availableLanguages[0]);
    (this.kendoIntl as CldrIntlService).localeId =
      environment.availableLanguages[0];
  }

  /**
   * Configuration of the Authentication behavior
   */
  ngOnInit(): void {
    this.mixpanelService.init();
    this.authService.initLoginSequence();
  }
}
