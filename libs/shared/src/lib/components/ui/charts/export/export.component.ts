import { Component, Inject, OnInit } from '@angular/core';
import { DIALOG_DATA } from '@angular/cdk/dialog';
import { EXPORT_SETTINGS } from '../../../widgets/chart-settings/constants';

/** The data for the dialogs input */
interface DialogData {
  export: {
    format: string;
  };
}

/** Component for exporting data */
@Component({
  selector: 'shared-export',
  templateUrl: './export.component.html',
  styleUrls: ['./export.component.scss'],
})
export class ExportComponent implements OnInit {
  // === EXPORT MENU SELECTION ===
  /** Export settings */
  public export = EXPORT_SETTINGS;

  /**
   * Constructor for the export component
   *
   * @param data The dialog data
   */
  constructor(@Inject(DIALOG_DATA) public data: DialogData) {}

  ngOnInit(): void {
    this.export = this.data.export;
  }
}
