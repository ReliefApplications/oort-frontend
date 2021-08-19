import { Record } from '../models/record.model';
import { SafeAuthService } from '../services/auth.service';

export default function addCustomFunctions(Survey: any, authService: SafeAuthService, record?: Record | undefined): void {
  Survey.FunctionFactory.Instance.register('createdAt', () => record ? new Date(Number(record.createdAt) || '') : new Date());
  Survey.FunctionFactory.Instance.register('modifiedAt', () => record ? new Date(Number(record.modifiedAt) || '') : new Date());
  Survey.FunctionFactory.Instance.register('createdBy', () => {
    if (record) {
      return record.createdBy?.name || '';
    } else {
      return authService.userValue?.name || '';
    }
  });
  Survey.FunctionFactory.Instance.register('id', () => record ? record.id : 'unknown id');
  Survey.FunctionFactory.Instance.register('weekday', (params: Date[]) => (new Date(params[0])).getDay());
  Survey.FunctionFactory.Instance.register('addDays', (params: any[]) => {
      const result = new Date(params[0]);
      result.setDate(result.getDate() + Number(params[1]));
      return result;
  });
}
