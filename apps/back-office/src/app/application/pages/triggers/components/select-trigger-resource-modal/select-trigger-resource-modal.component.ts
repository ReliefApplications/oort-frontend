import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  FormBuilder,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { ResourceSelectComponent } from '@oort-front/shared';
import { ButtonModule, DialogModule } from '@oort-front/ui';

/**
 * Modal to select a resource before creating a trigger.
 */
@Component({
  standalone: true,
  selector: 'app-select-trigger-resource-modal',
  templateUrl: './select-trigger-resource-modal.component.html',
  styleUrls: ['./select-trigger-resource-modal.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    DialogModule,
    ButtonModule,
    ResourceSelectComponent,
  ],
})
export class SelectTriggerResourceModalComponent {
  /** Form with selected resource id */
  public form = this.fb.group({
    resource: [null as string | null, Validators.required],
  });

  /**
   * Constructor
   *
   * @param fb Form builder
   */
  constructor(private fb: FormBuilder) {}
}
