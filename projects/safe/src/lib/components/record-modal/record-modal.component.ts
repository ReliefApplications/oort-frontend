import {Apollo} from 'apollo-angular';
import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { Form } from '../../models/form.model';
import { Record } from '../../models/record.model';
import { v4 as uuidv4 } from 'uuid';
import * as Survey from 'survey-angular';
import { GetRecordByIdQueryResponse, GET_RECORD_BY_ID } from '../../graphql/queries';
import addCustomFunctions from '../../utils/custom-functions';
import { SafeDownloadService } from '../../services/download.service';

@Component({
  selector: 'safe-record-modal',
  templateUrl: './record-modal.component.html',
  styleUrls: ['./record-modal.component.scss']
})
export class SafeRecordModalComponent implements OnInit {

  // === DATA ===
  public loading = true;
  public form?: Form;
  public record: Record = {};
  public modifiedAt: Date | null = null;
  public survey!: Survey.Model;
  public surveyNext: Survey.Model | null = null;

  public containerId: string;
  public containerNextId = '';

  private temporaryFilesStorage: any = {};

  // === SURVEY COLORS
  primaryColor = '#008DC9';

  constructor(
    public dialogRef: MatDialogRef<SafeRecordModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      recordId: string,
      locale?: string,
      compareTo?: any
    },
    private apollo: Apollo,
    public dialog: MatDialog,
    private downloadService: SafeDownloadService
  ) {
    this.containerId = uuidv4();
    if (this.data.compareTo) {
      this.containerNextId = uuidv4();
    }
  }

  ngOnInit(): void {
    const defaultThemeColorsSurvey = Survey
      .StylesManager
      .ThemeColors.default;
    defaultThemeColorsSurvey['$main-color'] = this.primaryColor;
    defaultThemeColorsSurvey['$main-hover-color'] = this.primaryColor;

    Survey
      .StylesManager
      .applyTheme();

    this.apollo.watchQuery<GetRecordByIdQueryResponse>({
      query: GET_RECORD_BY_ID,
      variables: {
        id: this.data.recordId
      }
    }).valueChanges.subscribe(res => {
      this.record = res.data.record;
      this.modifiedAt = this.record.modifiedAt || null;
      this.form = this.record.form;
      this.loading = res.loading;
      addCustomFunctions(Survey, this.record);
      this.survey = new Survey.Model(this.form?.structure);
      this.survey.onClearFiles.add((survey, options) => {
        options.callback('success');
      });
      this.survey.onDownloadFile.add((survey, options) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${this.downloadService.baseUrl}/download/file/${options.content}`);
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('msal.idtoken')}`);
        xhr.onloadstart = () => {
          xhr.responseType = 'blob';
        };
        xhr.onload = () => {
          const file = new File([xhr.response], options.fileValue.name, { type: options.fileValue.type });
          const reader = new FileReader();
          reader.onload = (e) => {
            options.callback('success', e.target?.result);
          };
          reader.readAsDataURL(file);
        };
        xhr.send();
      });
      this.survey.data = this.record.data;
      this.survey.locale = this.data.locale ? this.data.locale : 'en';
      this.survey.mode = 'display';
      this.survey.showNavigationButtons = 'none';
      this.survey.showProgressBar = 'off';
      this.survey.render(this.containerId);

      if (this.data.compareTo) {
        this.surveyNext = new Survey.Model(this.form?.structure);
        this.surveyNext.data = this.data.compareTo.data;
        this.surveyNext.locale = this.data.locale ? this.data.locale : 'en';
        this.surveyNext.mode = 'display';
        this.surveyNext.showNavigationButtons = 'none';
        this.surveyNext.showProgressBar = 'off';
        this.surveyNext.render(this.containerNextId);
      }
    });
  }

  public onShowPage(i: number): void {
    this.survey.currentPageNo = i;
    if (this.data.compareTo && this.surveyNext) {
      this.surveyNext.currentPageNo = i;
    }
  }

  /* Close the modal without sending any data.
  */
  onClose(): void {
    this.dialogRef.close();
  }
}
