import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Resource } from '@oort-front/shared';
import { conversionMap } from './conversion-fields-type-mapping';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

/** Interface for the table element */
interface TableResourceElement {
  resource: Resource;
}

/** Conversion fields component */
@Component({
  selector: 'app-conversion-fields',
  templateUrl: './conversion-fields.component.html',
  styleUrls: ['./conversion-fields.component.scss'],
})
export class ConversionFieldsComponent implements OnInit {
  @Input() resource!: Resource;
  @Input() disabled = false;
  @Input() resources!: TableResourceElement[];

  @Output() convertEvent = new EventEmitter<object>();

  public fields = new Array<string>();

  public conversionForm!: FormGroup;

  /**
   * Constructor for the conversion fields component
   *
   * @param fb The form builder
   * @param translate The translate service
   */
  constructor(private fb: FormBuilder, private translate: TranslateService) {}

  public popArrayActions = [
    {
      value: 'first',
      action: this.translate.instant('components.conversion.actions.first'),
    },
    {
      value: 'last',
      action: this.translate.instant('components.conversion.actions.last'),
    },
    {
      value: 'all',
      action: this.translate.instant('components.conversion.actions.all'),
    },
  ];

  public failedConversionActions = [
    {
      value: 'ignore',
      action: this.translate.instant('components.conversion.actions.ignore'),
    },
    {
      value: 'delete',
      action: this.translate.instant('components.conversion.actions.delete'),
    },
    {
      value: 'cancel',
      action: this.translate.instant('components.conversion.actions.cancel'),
    },
  ];

  ngOnInit() {
    this.fields = this.resource.fields.filter((field: any) => !field.generated);
    this.conversionForm = this.createConversionForm();
    this.conversionForm.get('selectedType')?.valueChanges.subscribe(() => {
      if (this.conversionForm.get('selectedConvertibleType')?.value) {
        this.conversionForm.get('selectedConvertibleType')?.reset();
        this.resetActions();
      }
    });
    this.conversionForm
      .get('selectedConvertibleType')
      ?.valueChanges.subscribe((value) => {
        this.resetActions();
        if (value) {
          this.setActionsValidators(
            'popArray',
            'selectedPopArrayAction',
            value
          );
        }
      });
  }

  /**
   * Get the fields names
   *
   * @returns the fields names
   */
  public getFieldsNames(): string[] {
    return this.fields.map((field: any) => field.name);
  }

  /**
   * Get all the types
   *
   * @returns the types
   */
  public getAllTypes(): string[] {
    return Object.keys(conversionMap);
  }

  /**
   * Get the convertible types
   *
   * @returns the convertible types
   */
  public getConvertibleTypes(): string[] {
    if (!conversionMap[this.conversionForm.value.selectedType]) {
      return [];
    }
    return conversionMap[this.conversionForm.value.selectedType]
      .convertibleTypes;
  }

  /**
   * Get the display name in the conversion map
   *
   * @param type The type
   * @returns The type display name
   */
  public getDisplayName(type: string): string {
    if (!conversionMap[type]) {
      return type;
    }
    return conversionMap[type].displayName;
  }

  /**
   * onClick event for the button
   */
  public onClick() {
    this.convertEvent.emit(this.conversionForm.value);
  }

  /**
   * Create the conversion form
   *
   * @returns the conversion form
   */
  private createConversionForm() {
    return this.fb.group({
      currentResource: new FormControl(this.resource.id),
      selectedField: new FormControl('', Validators.required),
      selectedType: new FormControl('', Validators.required),
      selectedConvertibleType: new FormControl('', Validators.required),
      selectedFailedConversionAction: new FormControl('', Validators.required),
      selectedPopArrayAction: new FormControl(''),
    });
  }

  /**
   * Check if the action is required
   *
   * @param action The action
   * @returns True or false accordingly
   */
  public checkActionRequirement(action: string): boolean {
    if (
      this.conversionForm.get('selectedConvertibleType')?.value &&
      this.conversionForm.get('selectedType')?.value
    ) {
      if (
        (
          conversionMap[this.conversionForm.get('selectedType')?.value] as any
        ).confirmation[action]?.includes(
          this.conversionForm.get('selectedConvertibleType')?.value
        )
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Reset the actions validators
   */
  private resetActions() {
    this.conversionForm.get('selectedPopArrayAction')?.clearValidators();
    this.conversionForm.get('selectedPopArrayAction')?.updateValueAndValidity();
  }

  /**
   * Set the actions validators when they are needed
   *
   * @param action Action to validate
   * @param formControl The form control
   * @param value The value
   */
  private setActionsValidators(
    action: string,
    formControl: string,
    value: string
  ) {
    if (
      (
        conversionMap[this.conversionForm.get('selectedType')?.value] as any
      ).confirmation[action]?.includes(value)
    ) {
      this.conversionForm.get(formControl)?.setValidators(Validators.required);
    }
  }
}
