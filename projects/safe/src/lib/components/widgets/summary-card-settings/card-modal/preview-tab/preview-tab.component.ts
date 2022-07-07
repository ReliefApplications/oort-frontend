import { Component, Input, OnChanges } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { Subscription } from 'rxjs';
import {
  GetRecordByIdQueryResponse,
  GET_RECORD_BY_ID,
} from '../../../../../graphql/queries';

/**
 * Component used in the card-modal-settings for previewing the final result.
 */
@Component({
  selector: 'safe-preview-tab',
  templateUrl: './preview-tab.component.html',
  styleUrls: ['./preview-tab.component.scss'],
})
export class SafePreviewTabComponent implements OnChanges {
  @Input() html = '';
  @Input() record?: string;

  private recordSubscription: Subscription | undefined;
  private loadedRecord: any;

  public formatedHtml: string = this.html;

  /**
   * Constructor used by the SafePreviewTab component.
   *
   * @param apollo Service used for getting the record queries.
   */
  constructor(private apollo: Apollo) {}

  /**
   * Detects when the html or record inputs change.
   */
  ngOnChanges(): void {
    if (!this.loadedRecord || this.loadedRecord.id !== this.record) {
      if (this.recordSubscription) {
        this.recordSubscription.unsubscribe();
      }
      if (this.record) {
        this.recordSubscription = this.apollo
          .watchQuery<GetRecordByIdQueryResponse>({
            query: GET_RECORD_BY_ID,
            variables: {
              id: this.record,
            },
          })
          .valueChanges.subscribe((res) => {
            if (res) {
              this.loadedRecord = res.data.record;
              this.formatedHtml = this.replaceRecordFields(
                this.html,
                this.loadedRecord
              );
            } else {
              this.loadedRecord = null;
              this.formatedHtml = this.html;
            }
          });
      }
    } else {
      this.formatedHtml = this.replaceRecordFields(
        this.html,
        this.loadedRecord
      );
    }
  }

  /**
   * Replaces the html resource fields with the resource data.
   *
   * @param html String with the content html.
   * @param record Record object.
   */
  private replaceRecordFields(html: string, record: any): string {
    const fields = this.getFieldsValue(record);
    let formatedHtml = html;
    for (const [key, value] of Object.entries(fields)) {
      if (value) {
        const regex = new RegExp(`@\\bdata.${key}\\b`, 'gi');
        formatedHtml = formatedHtml.replace(regex, value as string);
      }
    }
    return formatedHtml;
  }

  /**
   * Returns an object with the record data keys paired with the values.
   *
   * @param record Record object.
   */
  private getFieldsValue(record: any) {
    const fields: any = {};
    for (const [key, value] of Object.entries(record)) {
      if (!key.startsWith('__') && key !== 'form') {
        if (value instanceof Object) {
          for (const [key2, value2] of Object.entries(value)) {
            if (!key2.startsWith('__')) {
              fields[(key === 'data' ? '' : key + '.') + key2] = value2;
            }
          }
        } else {
          fields[key] = value;
        }
      }
    }
    return fields;
  }
}
