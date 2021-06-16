import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import {ADD_RECORD, AddRecordMutationResponse} from '../graphql/mutations';
import {Apollo} from 'apollo-angular';

@Injectable({
  providedIn: 'root'
})
export class SafeDownloadService {

  public baseUrl: string;

  constructor(
    @Inject('environment') environment: any,
    private http: HttpClient,
    private apollo: Apollo
  ) {
    this.baseUrl = environment.API_URL;
  }

  /**
   * Download file from the server
   * @param path download path to append to base url
   * @param type type of the file
   * @param fileName name of the file
   * @param options (optional) request options
   */
  getFile(path: string, type: string, fileName: string, options?: any): void {
    const url = path.startsWith('http') ? path : `${this.baseUrl}/${path}`;
    const token = localStorage.getItem('msal.idtoken');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
    this.http.get(url, { ...options, responseType: 'blob', headers }).subscribe((res) => {
      const blob = new Blob([res], { type });
      this.saveFile(fileName, blob);
    });
  }

  private saveFile(fileName: string, blob: Blob): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.append(link);
    link.click();
    setTimeout(() => link.remove(), 0);
  }

  updateRecords(path: string, idForm: any): void {
    const url = path.startsWith('http') ? path : `${this.baseUrl}/${path}`;
    const token = localStorage.getItem('msal.idtoken');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    });
    this.http.get(url, {headers}).subscribe(res => {
      console.log(res);
      let records: any = [];
      records = res;

      for (const r of records){
        console.log(r);
        const mutation = this.apollo.mutate<AddRecordMutationResponse>({
          mutation: ADD_RECORD,
          variables: {
            form: idForm,
            data: r
          }
        });
        mutation.subscribe((resAdd: any) => {
          if (resAdd.errors) {
            console.log('*** ERROR ***');
            console.log(resAdd.errors);
          } else {
            console.log('*** WORK ***');
            console.log(res);
          }
        });
      }

      // const mutation = this.apollo.mutate<AddRecordMutationResponse>({
      //       mutation: ADD_RECORD,
      //       variables: {
      //         form: idForm,
      //         data: records
      //       }
      // });
      // mutation.subscribe((resAdd: any) => {
      //   if (resAdd.errors) {
      //     console.log('*** ERROR ***');
      //     console.log(resAdd.errors);
      //   } else {
      //     console.log('*** WORK ***');
      //     console.log(res);
      //   }
      // });
    });
  }
}
