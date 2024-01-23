import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Resource } from '@oort-front/shared';
import { conversionMap } from './conversion-fields-type-mapping';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
  ValidationErrors,
} from '@angular/forms';

interface TableResourceElement {
  resource: Resource;
}

@Component({
  selector: 'app-conversion-fields',
  templateUrl: './conversion-fields.component.html',
  styleUrls: ['./conversion-fields.component.scss'],
})
export class ConversionFieldsComponent {
  @Input() resource!: Resource;
  @Input() disabled = false;
  @Input() resources!: Array<TableResourceElement>;

  @Output() convertEvent = new EventEmitter<Object>();

  public fields = new Array<string>();

  public conversionForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  public popArrayActions = [
    { value: 'first', action: 'Keep first element' },
    { value: 'last', action: 'Keep last element' },
    { value: 'all', action: 'Keep all elements, split by comma' },
  ];

  public failedConversionActions = [
    { value: 'ignore', action: 'Ignore record and proceed' },
    { value: 'delete', action: 'Delete value and proceed' },
    { value: 'cancel', action: 'Cancel conversion' },
  ];

  ngOnInit() {
    this.fields = this.resource.fields.filter((field: any) => !field.generated);
    this.conversionForm = this.createConversionForm();
    this.conversionForm.get('selectedType')?.valueChanges.subscribe((value) => {
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

  public getFieldsNames(): string[] {
    return this.fields.map((field: any) => field.name);
  }

  public getAllTypes(): string[] {
    return Object.keys(conversionMap);
  }

  public getConvertibleTypes(): string[] {
    if (!conversionMap[this.conversionForm.value.selectedType]) {
      return [];
    }
    return conversionMap[this.conversionForm.value.selectedType]
      .convertibleTypes;
  }

  public getDisplayName(type: string): string {
    if (!conversionMap[type]) {
      return type;
    }
    return conversionMap[type].displayName;
  }

  public onClick() {
    this.convertEvent.emit(this.conversionForm.value);
  }

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

  private resetActions() {
    this.conversionForm.get('selectedPopArrayAction')?.clearValidators();
    this.conversionForm.get('selectedPopArrayAction')?.updateValueAndValidity();
  }

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
