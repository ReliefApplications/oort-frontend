import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

/**
 * Modal to select a resource before creating a trigger.
 */
@Component({
  selector: 'app-select-trigger-resource-modal',
  templateUrl: './select-trigger-resource-modal.component.html',
  styleUrls: ['./select-trigger-resource-modal.component.scss'],
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
