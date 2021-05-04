import {Apollo} from 'apollo-angular';
import { Component, ComponentFactory, ComponentFactoryResolver, ComponentRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { GetFormByIdQueryResponse, GetRecordDetailsQueryResponse, GET_FORM_BY_ID, GET_RECORD_DETAILS } from '../../../graphql/queries';
import { DeleteRecordMutationResponse, DELETE_RECORD } from '../../../graphql/mutations';
import { extractColumns } from '../../../utils/extractColumns';
import { SafeDownloadService, SafeRecordHistoryComponent } from '@safe/builder';
import { environment } from '../../../../environments/environment';
import { SafeLayoutService } from '@safe/builder';

@Component({
  selector: 'app-form-records',
  templateUrl: './form-records.component.html',
  styleUrls: ['./form-records.component.scss']
})
export class FormRecordsComponent implements OnInit {

  // === DATA ===
  public loading = true;
  public id = '';
  public form: any;
  displayedColumns: string[] = [];
  dataSource: any[] = [];
  public showSidenav = true;

  // === HISTORY COMPONENT TO BE INJECTED IN LAYOUT SERVICE ===
  public factory?: ComponentFactory<any>;

  constructor(
    private apollo: Apollo,
    private route: ActivatedRoute,
    private downloadService: SafeDownloadService,
    private resolver: ComponentFactoryResolver,
    private layoutService: SafeLayoutService,
  ) { }

  /*  Load the records, using the form id passed as a parameter.
  */
  ngOnInit(): void {
    this.factory = this.resolver.resolveComponentFactory(SafeRecordHistoryComponent);
    this.id = this.route.snapshot.paramMap.get('id') || '';
    if (this.id !== null) {
      this.apollo.watchQuery<GetFormByIdQueryResponse>({
        query: GET_FORM_BY_ID,
        variables: {
          id: this.id,
          display: false
        }
      }).valueChanges.subscribe(res => {
        this.form = res.data.form;
        this.dataSource = this.form.records;
        this.setDisplayedColumns();
        this.loading = res.loading;
      });
    }
  }

  /*  Modify the list of columns.
  */
  private setDisplayedColumns(): void {
    const columns: any[] = [];
    const structure = JSON.parse(this.form.structure);
    if (structure && structure.pages) {
      for (const page of JSON.parse(this.form.structure).pages) {
        extractColumns(page, columns);
      }
    }
    columns.push('_actions');
    this.displayedColumns = columns;
  }

  /*  Delete a record if authorized.
  */
  deleteRecord(id: any, e: any): void {
    e.stopPropagation();
    this.apollo.mutate<DeleteRecordMutationResponse>({
      mutation: DELETE_RECORD,
      variables: {
        id
      }
    }).subscribe(res => {
      this.dataSource = this.dataSource.filter( x => {
        return x.id !== id;
      });
    });
  }

   /* Opens the history of the record on the right side of the screen.
  */
   public onViewHistory(id: string): void {
    this.apollo.query<GetRecordDetailsQueryResponse>({
      query: GET_RECORD_DETAILS,
      variables: {
        id
      }
    }).subscribe(res => {
      this.layoutService.setRightSidenav({
        factory: this.factory,
        inputs: {
          record: res.data.record,
          revert: (item: any, dialog: any) => {
            console.log('action !');
          }
        },
      });
    });
  }

  onDownload(): void {
    const url = `${environment.API_URL}/download/form/records/${this.id}`;
    const fileName = `${this.form.name}.csv`;
    this.downloadService.getFile(url, 'text/csv;charset=utf-8;', fileName);
  }
}
