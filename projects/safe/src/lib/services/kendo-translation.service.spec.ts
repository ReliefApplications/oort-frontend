import { TestBed } from '@angular/core/testing';

import { KendoTranslationService } from './kendo-translation.service';

describe('KendoTranslationService', () => {
  let service: KendoTranslationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(KendoTranslationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
