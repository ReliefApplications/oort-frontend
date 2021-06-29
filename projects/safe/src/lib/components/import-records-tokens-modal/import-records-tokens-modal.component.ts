import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {SafeDownloadService} from '../../services/download.service';

@Component({
  selector: 'safe-import-records-tokens-modal',
  templateUrl: './import-records-tokens-modal.component.html',
  styleUrls: ['./import-records-tokens-modal.component.css']
})

export class ImportRecordsTokensModalComponent implements OnInit {

  // public body: { formId: string; accessToken: string };
  public body: any;
  public cardDisplay: boolean;
  public spinnerDisplay: boolean;
  public doneButton: boolean;

  constructor(public dialogRef: MatDialogRef<ImportRecordsTokensModalComponent>,
              private downloadService: SafeDownloadService,
              @Inject(MAT_DIALOG_DATA) public data: any) {
    this.body = {};
    this.cardDisplay = false;
    this.spinnerDisplay = false;
    this.doneButton = false;
  }

  ngOnInit(): void {
    // this.data = {};
  }

  async importRecords(accesToken: string): Promise<void> {

    if (accesToken !== undefined){
      this.spinnerDisplay = true;
      this.doneButton = true;

      this.body.formId = this.data.elt.uid;
      this.body.accessToken = accesToken;
      const path = `upload/records/update/${this.data.elt.id}`;
      await this.downloadService.updateRecords(path, this.body);

      console.log('3');

      this.spinnerDisplay = false;
      this.cardDisplay = true;
    }
    // console.log('this.data: importRecords');
    // console.log(this.data);
    // this.data.accessToken = accesToken;
    // return this.dialogRef.close(this.data);
  }
}
