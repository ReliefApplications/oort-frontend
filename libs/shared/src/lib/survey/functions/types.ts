import { Apollo } from 'apollo-angular';
import { Record } from '../../models/record.model';
import { Form } from '../../models/form.model';
import { AuthService } from '../../services/auth/auth.service';
import { TranslateService } from '@ngx-translate/core';

export type GlobalOptions = {
  apollo: Apollo;
  authService: AuthService;
  translateService: TranslateService;
  record?: Record;
  form?: Form;
};
