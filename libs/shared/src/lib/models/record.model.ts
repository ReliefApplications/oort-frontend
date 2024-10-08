import { DraftRecord } from './draft-record.model';
import { Form } from './form.model';
import { Resource } from './resource.model';
import { User } from './user.model';

/** Model for version attributes. */
interface Version {
  id?: string;
  createdAt?: Date;
  data?: string;
  createdBy?: User;
}

/** Model for Record object. */
export interface Record {
  id?: string;
  incrementalId?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  deleted?: boolean;
  data?: any;
  form?: Form;
  resource?: Resource;
  versions?: Version[];
  createdBy?: User;
  modifiedBy?: User;
  canUpdate?: boolean;
  canDelete?: boolean;
  koboId?: string;
  validationErrors?: { question: string; errors: string[] }[];
}

/** Model for record graphql query response */
export interface RecordQueryResponse {
  record: Record;
}

/** Model for add record graphql mutation response */
export interface AddRecordMutationResponse {
  addRecord: Record;
}

/** Model for add draft record graphql mutation response */
export interface AddDraftRecordMutationResponse {
  addDraftRecord: Record;
}

/** Model for edit record graphql mutation response */
export interface EditRecordMutationResponse {
  editRecord: Record;
}

/** Model for edit draft record graphql mutation response */
export interface EditDraftRecordMutationResponse {
  editDraftRecord: DraftRecord;
}

/** Model for delete record graphql mutation response */
export interface DeleteRecordMutationResponse {
  deleteRecord: Record;
}

/** Model for record id and data graphql query response */
export interface RecordIdAndDataQueryResponse {
  record: Pick<Record, 'id' | 'data'>;
}

/** Model for restore record graphql mutation response */
export interface RestoreRecordMutationResponse {
  restoreRecord: Record;
}

/** Model for convert record graphql mutation response */
export interface ConvertRecordMutationResponse {
  convertRecord: Record;
}

/** Model for edit records graphql mutation response */
export interface EditRecordsMutationResponse {
  editRecords: Record[];
}

/** Model for edit records graphql mutation response */
export interface DeleteRecordsMutationResponse {
  deleteRecords: number;
}

/** Model for generate records graphql mutation response */
export interface GenerateRecordsMutationResponse {
  generateRecords: Record[];
}

/** Model for add records from kobo graphql mutation response */
export interface AddRecordsFromKoboMutationResponse {
  addRecordsFromKobo: boolean;
}
