import { Component, Input, OnChanges } from '@angular/core';
import { FormQueryResponse, UnsubscribeComponent } from '@oort-front/shared';
import { dataGenerationMap } from './data-generation-fields-type-mapping';
import {
  FormBuilder,
  FormGroup,
  FormControl,
  Validators,
  FormArray,
} from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { Apollo, QueryRef } from 'apollo-angular';
import { GET_FORM_STRUCTURE } from './graphql/queries';
import { GENERATE_RECORDS } from './graphql/mutations';
import { Model } from 'survey-core';
import { FormBuilderService } from './../../../../../../../../libs/shared/src/lib/services/form-builder/form-builder.service';
import { takeUntil, firstValueFrom } from 'rxjs';
import { indexOf } from 'lodash';
import { GenerateRecordsMutationResponse } from './../../../../../../../../libs/shared/src/lib/models/record.model';
import { SnackbarService } from '@oort-front/ui';

/** Conversion fields component */
@Component({
  selector: 'app-data-generation-fields',
  templateUrl: './data-generation-fields.component.html',
  styleUrls: ['./data-generation-fields.component.scss'],
})
/** Data generation class component */
export class DataGenerationFieldsComponent
  extends UnsubscribeComponent
  implements OnChanges
{
  /** Form id input */
  @Input() formId!: string;

  /** Form */
  private formStructureQuery!: QueryRef<FormQueryResponse>;
  private formStructure: any = {};
  public dataGenerationForm!: FormGroup;
  public survey: Model = new Model();

  /** Form fields */
  public fields: any[] = [];

  /** Flags */
  public loading = false;
  public isChecked = false;
  public accordionItemExpanded: number = -1;

  /**
   * Data generation component constructor
   *
   * @param apollo Apollo client service
   */
  constructor(
    private apollo: Apollo,
    private fb: FormBuilder,
    private translate: TranslateService,
    private formBuilderService: FormBuilderService,
    private snackBar: SnackbarService
  ) {
    super();
  }

  /** On changes hook */
  ngOnChanges() {
    this.loading = true;
    if (this.formId) {
      this.formStructureQuery = this.apollo.watchQuery<FormQueryResponse>({
        query: GET_FORM_STRUCTURE,
        variables: {
          id: this.formId,
        },
      });
      this.formStructureQuery.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe(({ data, loading }) => {
          this.dataGenerationForm = this.createDataGenerationForm();
          this.isChecked = false;
          this.fields =
            data.form.fields?.filter((field: any) => !field.generated) ?? [];
          this.fields.forEach((field: any) => {
            this.fieldsForm.push(this.createFieldForm());
            this.fieldsForm.controls[indexOf(this.fields, field)].patchValue({
              field: field.name,
              setDefault: false,
              include: false,
              option: dataGenerationMap[field.type].options?.[0].action,
            });
          });
          this.formStructure = data.form.fields;
          this.loading = loading;
        });
    } else {
      this.loading = false;
    }
  }

  /**
   * Get the display name in the conversion map
   *
   * @param type Field type
   * @returns The type display name
   */
  public getDisplayName(type: string): string {
    if (!dataGenerationMap[type]) {
      return type;
    }
    return dataGenerationMap[type].displayName;
  }

  /**
   * Get generation method to display
   *
   * @param type Field type
   * @returns Generation source for the type
   */
  public getGenerationSource(type: string): string {
    if (!dataGenerationMap[type]) {
      return '';
    }
    return this.translate.instant(dataGenerationMap[type].source ?? ' ');
  }

  /**
   * Get options for text type fields
   *
   * @param type Field type
   * @returns Options
   */
  public getTextGenerationOptions(): any {
    return dataGenerationMap['text'].options;
  }

  /**
   * onClick event for the button
   */
  public onClick() {
    this.generateData();
  }

  /**
   * Accordion item open handler
   *
   * @param index Item index
   */
  public onAccordionItemOpen(index: number) {
    this.survey = this.formBuilderService.createSurvey(
      this.getSingleFieldSurveyStructure(this.fields[index].name)
    );
    // Resetting the "default" value on survey in case its closed and opened again
    if (this.fieldsForm.controls[index].get('setDefault')?.value) {
      this.survey.setValue(
        this.fields[index].name,
        this.fieldsForm.controls[index].get('default')?.value
      );
    }
    // Subscribe the fieldsForm "default" control to the survey value change
    this.survey.onValueChanged.add((sender, options) => {
      this.fieldsForm.controls[index].patchValue({
        default: options.value,
      });
    });
  }

  /**
   * Create the dataGeneration form
   *
   * @returns the dataGeneration form
   */
  private createDataGenerationForm() {
    return this.fb.group({
      fieldsForm: this.fb.array([]),
      recordsNumber: new FormControl(null, Validators.required),
    });
  }

  /**
   * Create field form which is going to be a formArray
   *
   * @returns the fieldForm
   */
  private createFieldForm() {
    return this.fb.group({
      field: new FormControl(null, Validators.required),
      include: new FormControl(false, Validators.required),
      setDefault: new FormControl(false, Validators.required),
      default: new FormControl(),
      option: new FormControl(),
    });
  }

  /**
   * Function to get a survey structure with 1 field given it's name
   *
   * @param fieldName Field name
   * @returns The survey structure
   */
  private getSingleFieldSurveyStructure(fieldName: string): any {
    const resultStructure = this.formStructure.find(
      (obj: any) => obj.name === fieldName
    );
    return {
      pages: [
        {
          name: 'page1',
          elements: [resultStructure],
        },
      ],
      showQuestionNumbers: 'off',
    };
  }

  /**
   *  Generate new record data
   */
  private async generateData(): Promise<void> {
    this.loading = true;
    const promises: Promise<any>[] = [];
    promises.push(
      firstValueFrom(
        this.apollo.mutate<GenerateRecordsMutationResponse>({
          mutation: GENERATE_RECORDS,
          variables: {
            form: this.formId,
            data: this.dataGenerationForm.value,
          },
        })
      )
    );
    Promise.all(promises).then(() => {
      this.loading = false;
      this.snackBar.openSnackBar(
        this.dataGenerationForm.value.recordsNumber +
          ' ' +
          this.translate.instant('common.notifications.dataGenerated')
      );
    });
  }

  /** Getter for the fieldsForm */
  get fieldsForm() {
    return this.dataGenerationForm.get('fieldsForm') as FormArray;
  }

  /**
   *  Function to handle Select all checkbox
   */
  public selectAll() {
    if (this.isChecked) {
      this.fieldsForm.controls.forEach((control) => {
        control.patchValue({ include: true });
      });
    } else {
      this.fieldsForm.controls.forEach((control) => {
        control.patchValue({ include: false });
      });
    }
  }
}
