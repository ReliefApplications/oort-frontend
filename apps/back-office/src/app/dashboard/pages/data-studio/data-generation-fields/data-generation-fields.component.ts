import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
} from '@angular/core';
import {
  Form,
  FormQueryResponse,
  UnsubscribeComponent,
} from '@oort-front/shared';
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
import { Model, SurveyModel } from 'survey-core';
import { FormBuilderService } from './../../../../../../../../libs/shared/src/lib/services/form-builder/form-builder.service';

import { takeUntil, firstValueFrom } from 'rxjs';
import { get, indexOf, set } from 'lodash';
import { F, V } from '@angular/cdk/keycodes';
import { GenerateRecordsMutationResponse } from './../../../../../../../../libs/shared/src/lib/models/record.model';
import { setTime } from '@progress/kendo-angular-dateinputs/util';
import { SnackbarService } from '@oort-front/ui';

/** Conversion fields component */
@Component({
  selector: 'app-data-generation-fields',
  templateUrl: './data-generation-fields.component.html',
  styleUrls: ['./data-generation-fields.component.scss'],
})
export class DataGenerationFieldsComponent
  extends UnsubscribeComponent
  implements AfterViewInit, OnChanges
{
  @Input() formId!: string;
  @Input() disabled = false;

  @Output() generateEvent = new EventEmitter<object>();

  public fields: any[] = [];

  private formStructureQuery!: QueryRef<FormQueryResponse>;
  private formStructure: any = {};

  public dataGenerationForm!: FormGroup;

  public survey: Model = new Model();

  public accordionItemExpanded: number = -1;

  public loading = false;

  public isChecked = false;

  /** Emit changes applied to the settings */
  // eslint-disable-next-line @angular-eslint/no-output-native
  @Output() change: EventEmitter<any> = new EventEmitter();

  /**
   * Data studio component
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

  ngAfterViewInit() {
    this.loading = false;
  }

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
            this.formStructure = data.form.structure;
          });
          this.loading = loading;
        });
    } else {
      this.loading = false;
    }
  }

  /**
   * Get the display name in the conversion map
   *
   * @param type The type
   * @returns The type display name
   */
  public getDisplayName(type: string): string {
    if (!dataGenerationMap[type]) {
      return type;
    }
    return dataGenerationMap[type].displayName;
  }

  /**
   * Get the display name in the conversion map
   *
   * @param type The type
   * @returns The type display name
   */
  public getGenerationSource(type: string): string {
    if (!dataGenerationMap[type]) {
      return '';
    }
    return dataGenerationMap[type].source;
  }

  /**
   * Get the display name in the conversion map
   *
   * @param type The type
   * @returns The type display name
   */
  public getGenerationOptions(type: string): any {
    if (!dataGenerationMap[type]) {
      return '';
    }
    return dataGenerationMap[type].options;
  }

  /**
   * onClick event for the button
   */
  public onClick() {
    this.generateData();
  }

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

  // Helper function to create a field FormGroup
  private createFieldForm() {
    return this.fb.group({
      field: new FormControl(null, Validators.required),
      include: new FormControl(false, Validators.required),
      setDefault: new FormControl(false, Validators.required),
      default: new FormControl(),
      option: new FormControl(),
    });
  }

  private getSingleFieldSurveyStructure(fieldName: string): any {
    let resultStructure: any = {};

    function traverse(structure: any) {
      if (structure && typeof structure === 'object') {
        if (structure.hasOwnProperty('name') && structure.name === fieldName) {
          resultStructure = structure;
        }

        for (const key in structure) {
          if (structure.hasOwnProperty(key)) {
            traverse(structure[key]);
          }
        }
      }
    }

    traverse(JSON.parse(this.formStructure ?? ''));

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

  get fieldsForm() {
    return this.dataGenerationForm.get('fieldsForm') as FormArray;
  }

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
