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
import { GENERATE_RECORDS, EDIT_RECORD } from './graphql/mutations';
import { Model } from 'survey-core';
import { FormBuilderService } from './../../../../../../../../libs/shared/src/lib/services/form-builder/form-builder.service';
import { takeUntil, firstValueFrom } from 'rxjs';
import { indexOf } from 'lodash';
import {
  EditRecordMutationResponse,
  GenerateRecordsMutationResponse,
} from './../../../../../../../../libs/shared/src/lib/models/record.model';
import { SnackbarService } from '@oort-front/ui';
const TIMEOUT_DURATION = 1000;
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
  private form: any = {};
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
          console.log(
            JSON.parse(data.form.structure ?? '').pages.reduce(
              (acc: any, page: any) => acc.concat(page.elements),
              []
            )
          );
          this.fields =
            JSON.parse(data.form.structure ?? '')
              .pages.reduce(
                (acc: any, page: any) => acc.concat(page.elements),
                []
              )
              ?.filter((field: any) => !field.generated) ?? [];
          this.fields.forEach((field: any) => {
            this.fieldsForm.push(this.createFieldForm());
            this.fieldsForm.controls[indexOf(this.fields, field)].patchValue({
              field: field.name,
              setDefault: false,
              include: false,
              //option: dataGenerationMap[field.type].options?.[0].action,
            });
          });
          this.form = data.form;
          this.loading = loading;
        });
    } else {
      this.loading = false;
    }
  }

  /**
   * Get the display name in the conversion map
   *
   * @param field the Field
   * @returns The type display name
   */
  public getDisplayName(field: any): string {
    if (!dataGenerationMap[field.type] && !dataGenerationMap[field.inputType]) {
      return field.type;
    }
    if (dataGenerationMap[field.inputType]) {
      return dataGenerationMap[field.inputType].displayName;
    }
    return dataGenerationMap[field.type].displayName;
  }

  /**
   * Get generation method to display
   *
   * @param field the Field
   * @returns Generation source for the type
   */
  public getGenerationSource(field: any): string {
    if (!dataGenerationMap[field.type] && !dataGenerationMap[field.inputType]) {
      return '';
    }
    if (dataGenerationMap[field.inputType]) {
      return (
        this.translate.instant(dataGenerationMap[field.inputType].source) ?? ''
      );
    }
    return this.translate.instant(dataGenerationMap[field.type].source) ?? '';
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
      minDate: new FormControl(),
      maxDate: new FormControl(),
      minNumber: new FormControl(),
      maxNumber: new FormControl(),
      minTime: new FormControl(),
      maxTime: new FormControl(),
    });
  }

  /**
   * Recursive function to get a field structure from a nested JSON and return a single field survey structure
   *
   * @param fieldName Field name
   * @returns The survey structure
   */
  private getSingleFieldSurveyStructure(fieldName: string): any {
    // Parses the structure, concatenates all fields from "elements" from all pages and finds the field by name
    const resultStructure = JSON.parse(this.form.structure)
      .pages.reduce((acc: any, page: any) => acc.concat(page.elements), [])
      .find((obj: any) => obj.name === fieldName);

    // Returns a simple survey structure with one field
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
    const res = await firstValueFrom(
      this.apollo.mutate<GenerateRecordsMutationResponse>({
        mutation: GENERATE_RECORDS,
        variables: {
          form: this.formId,
          data: this.dataGenerationForm.value,
        },
      })
    );
    const expressionSurvey = this.formBuilderService.createSurvey(
      this.form.structure
    );
    for (const record of res.data?.generateRecords ?? []) {
      expressionSurvey.data = record.data;
      await new Promise((resolve) => setTimeout(resolve, TIMEOUT_DURATION));
      await firstValueFrom(
        this.apollo.mutate<EditRecordMutationResponse>({
          mutation: EDIT_RECORD,
          variables: {
            id: record.id,
            data: expressionSurvey.data,
          },
        })
      );
      console.log(expressionSurvey.data);
    }
    this.loading = false;
    this.snackBar.openSnackBar(
      this.dataGenerationForm.value.recordsNumber +
        ' ' +
        this.translate.instant('common.notifications.dataGenerated')
    );
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
