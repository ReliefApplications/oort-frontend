import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UntypedFormBuilder } from '@angular/forms';
import {
  DialogModule as DialogCdkModule,
  DialogRef,
  DIALOG_DATA,
} from '@angular/cdk/dialog';
import {
  TranslateModule,
  TranslateService,
  TranslateFakeLoader,
  TranslateLoader,
} from '@ngx-translate/core';
import { ChartSettingsComponent } from '../../../../widgets/chart-settings/chart-settings.component';
import { HttpClientModule } from '@angular/common/http';
import { environment } from 'projects/back-office/src/environments/environment';

import { TileDataComponent } from './tile-data.component';

describe('TileDataComponent', () => {
  let component: TileDataComponent;
  let fixture: ComponentFixture<sharedTileDataComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        { provide: DialogRef, useValue: {} },
        {
          provide: DIALOG_DATA,
          useValue: {
            tile: {},
            template: ChartSettingsComponent,
          },
        },
        TranslateService,
        UntypedFormBuilder,
        { provide: 'environment', useValue: environment },
      ],
      declarations: [TileDataComponent],
      imports: [
        DialogCdkModule,
        TranslateModule.forRoot({
          loader: {
            provide: TranslateLoader,
            useClass: TranslateFakeLoader,
          },
        }),
        HttpClientModule,
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(TileDataComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});