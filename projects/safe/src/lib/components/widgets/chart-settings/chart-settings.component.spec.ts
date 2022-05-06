import { HttpClientModule } from '@angular/common/http';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { environment } from 'projects/back-office/src/environments/environment';
import {
  TranslateModule,
  TranslateService,
  TranslateFakeLoader,
  TranslateLoader,
} from '@ngx-translate/core';

import { SafeChartSettingsComponent } from './chart-settings.component';

describe('SafeChartSettingsComponent', () => {
  let component: SafeChartSettingsComponent;
  let fixture: ComponentFixture<SafeChartSettingsComponent>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        providers: [
          FormBuilder,
          { provide: 'environment', useValue: environment },
          TranslateService,
        ],
        declarations: [SafeChartSettingsComponent],
        imports: [
          HttpClientModule,
          TranslateModule.forRoot({
            loader: {
              provide: TranslateLoader,
              useClass: TranslateFakeLoader,
            },
          }),
        ],
      }).compileComponents();
    })
  );

  beforeEach(() => {
    fixture = TestBed.createComponent(SafeChartSettingsComponent);
    component = fixture.componentInstance;
    component.tile = {
      settings: {
        title: '',
        chart: {
          type: {
            name: '',
            icon: '',
            class: null,
          },
        },
      },
    };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
