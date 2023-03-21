import { Component, OnInit, Inject } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import {
  MatLegacyDialogRef as MatDialogRef,
  MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA,
} from '@angular/material/legacy-dialog';
import { Channel } from '@oort-front/safe';

/**
 * Edit channel component, act as modal.
 */
@Component({
  selector: 'app-edit-channel-modal',
  templateUrl: './edit-channel-modal.component.html',
  styleUrls: ['./edit-channel-modal.component.scss'],
})
export class EditChannelModalComponent implements OnInit {
  // === REACTIVE FORM ===
  roleForm: UntypedFormGroup = new UntypedFormGroup({});

  /**
   * Edit channel component
   *
   * @param formBuilder Angular form builder
   * @param dialogRef Material dialog ref
   * @param data Injected dialog data
   * @param data.channel channel to edit
   */
  constructor(
    private formBuilder: UntypedFormBuilder,
    public dialogRef: MatDialogRef<EditChannelModalComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      channel: Channel;
    }
  ) {}

  /** Load data and build the form. */
  ngOnInit(): void {
    this.roleForm = this.formBuilder.group({
      title: [this.data.channel.title, Validators.required],
    });
  }

  /** Close the modal without sending any data. */
  onClose(): void {
    this.dialogRef.close();
  }
}