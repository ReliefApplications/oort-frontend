import { Component, Input, OnInit } from '@angular/core';
import { UntypedFormArray, UntypedFormGroup } from '@angular/forms';
import { BehaviorSubject, Observable } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { AggregationBuilderService } from '../../../services/aggregation-builder/aggregation-builder.service';
import { QueryBuilderService } from '../../../services/query-builder/query-builder.service';
import {
  Resource,
  ResourceQueryResponse,
} from '../../../models/resource.model';
import { UnsubscribeComponent } from '../../utils/unsubscribe/unsubscribe.component';
import { takeUntil } from 'rxjs/operators';
import { Apollo } from 'apollo-angular';
import { GET_FIELDS_METADATA } from './graphql/queries';
import { AggregationService } from '../../../services/aggregation/aggregation.service';

/**
 * Main component of Aggregation builder.
 * Aggregation are used to generate charts.
 */
@Component({
  selector: 'shared-aggregation-builder',
  templateUrl: './aggregation-builder.component.html',
  styleUrls: ['./aggregation-builder.component.scss'],
})
export class AggregationBuilderComponent
  extends UnsubscribeComponent
  implements OnInit
{
  // === REACTIVE FORM ===
  @Input() aggregationForm: UntypedFormGroup = new UntypedFormGroup({});
  @Input() resource!: Resource;

  @Input() reload$!: Observable<boolean>;

  // === DATA ===
  public loading = true;

  // === FIELDS ===
  private fields = new BehaviorSubject<any[]>([]);
  public fields$ = this.fields.asObservable();
  private selectedFields = new BehaviorSubject<any[]>([]);
  public selectedFields$!: Observable<any[]>;
  private metaFields = new BehaviorSubject<any[]>([]);
  public metaFields$!: Observable<any[]>;
  private mappingFields = new BehaviorSubject<any[]>([]);
  public mappingFields$!: Observable<any[]>;

  /** Result of the current pipeline */
  public pipelinePreview: any;
  /** Whether or not to display the aggregation result preview */
  public showPreview = false;
  /** Monaco editor options */
  readonly editorOptions = {
    theme: 'vs-dark',
    language: 'jsonc',
    fixedOverflowWidgets: false,
    minimap: {
      enabled: false,
    },
    lineNumbers: 'off',
  };

  public aggregationPreview = '';

  /**
   * Getter for the pipeline of the aggregation form
   *
   * @returns the pipelines in a FormArray
   */
  get pipelineForm(): UntypedFormArray {
    return this.aggregationForm.get('pipeline') as UntypedFormArray;
  }

  /**
   * Constructor for the aggregation builder
   *
   * @param queryBuilder This is a service that is used to build queries.
   * @param aggregationBuilder This is the service that will be used to build the aggregation query.
   * @param aggregationService This is the service that will be used to build the aggregation query.
   * @param apollo Shared apollo service
   */
  constructor(
    private queryBuilder: QueryBuilderService,
    private aggregationBuilder: AggregationBuilderService,
    private aggregationService: AggregationService,
    private apollo: Apollo
  ) {
    super();
  }

  ngOnInit(): void {
    // Fixes issue where sometimes we try to load the fields before the queries are loaded
    this.queryBuilder.availableQueries$
      .pipe(takeUntil(this.destroy$))
      .subscribe((queryList) => {
        if (queryList.length > 0) {
          this.initFields();
        }
      });

    // Fields query
    this.fields$.pipe(takeUntil(this.destroy$)).subscribe((fields) => {
      fields.forEach((field) => {
        field['used'] = this.pipelineForm.value.some((x: any) => {
          return (
            x.form.groupBy?.find((y: any) => y.field?.includes(field.name)) || // group
            x.form.field?.includes(field.name) || // sort & Unwind
            x.form.filters?.find((y: any) => y.field?.includes(field.name)) // filters
          );
        });
      });
    });

    // Meta selected fields query
    this.selectedFields$ = this.selectedFields.asObservable();
    this.metaFields$ = this.metaFields.asObservable();
    this.aggregationForm
      .get('sourceFields')
      ?.valueChanges.pipe(debounceTime(1000))
      .pipe(takeUntil(this.destroy$))
      .subscribe((fieldsNames: string[]) => {
        this.updateSelectedAndMetaFields(fieldsNames);
      });

    // Preview grid and mapping fields
    this.mappingFields$ = this.mappingFields.asObservable();
    this.aggregationForm
      .get('pipeline')
      ?.valueChanges.pipe(debounceTime(1000))
      .pipe(takeUntil(this.destroy$))
      .subscribe((pipeline) => {
        this.mappingFields.next(
          this.aggregationBuilder.fieldsAfter(
            this.selectedFields.value,
            pipeline
          )
        );
        // Trigger check on fields being removable or not
        this.fields.next(this.fields.getValue());
      });

    // For the result preview
    this.aggregationForm.valueChanges
      .pipe(takeUntil(this.destroy$), debounceTime(1000))
      .subscribe((value: any) => {
        if (!this.resource.id) {
          return;
        }
        this.aggregationService
          .aggregationDataQuery(this.resource.id, {
            pipeline: (value.pipeline ?? []).filter((x: any) => x.preview),
            sourceFields: value.sourceFields,
          })
          .subscribe((result) => {
            if (result.errors?.[0]) {
              this.aggregationPreview = result.errors[0].message;
              return;
            }

            this.aggregationPreview = JSON.stringify(
              result.data?.recordsAggregation?.items ?? [],
              null,
              2
            );
          });
      });
    this.loading = false;
  }

  /**
   * Initializes all data necessary for the reactive form to work.
   */
  private initFields(): void {
    this.updateFields();
  }

  /**
   * Updates fields depending on selected form.
   */
  private updateFields(): void {
    const fields = this.queryBuilder
      .getFields(this.resource.queryName as string)
      .filter(
        (field: any) =>
          !(
            field.name.includes('_id') &&
            (field.type.name === 'ID' ||
              (field.type?.kind === 'LIST' && field.type.ofType.name === 'ID'))
          )
      );
    this.fields.next(fields);

    // Get metadata of fields
    this.apollo
      .query<ResourceQueryResponse>({
        query: GET_FIELDS_METADATA,
        variables: { resource: this.resource.id },
      })
      .subscribe(({ data }) => {
        if (data.resource?.metadata) {
          this.metaFields.next(data.resource.metadata);
          this.updateSelectedAndMetaFields(
            this.aggregationForm.value.sourceFields
          );
        } else {
          this.metaFields.next([]);
        }
      });
  }

  /**
   * Updates selected, meta and mapping fields depending on tagbox value.
   *
   * @param fieldsNames Tagbox value.
   */
  private updateSelectedAndMetaFields(fieldsNames: string[]): void {
    if (fieldsNames && fieldsNames.length) {
      const currentFields = this.fields.value;
      const selectedFields = fieldsNames.map((x: string) => {
        const field = { ...currentFields.find((y) => x === y.name) };
        if (field.type?.kind !== 'SCALAR') {
          field.fields = this.queryBuilder.deconfineFields(
            field.type,
            new Set()
              .add(this.resource.name)
              .add(field.type.name ?? field.type.ofType.name)
          );
        }
        return field;
      });

      this.selectedFields.next(
        selectedFields.map((f) => {
          const meta = this.metaFields.value.find((x) => x.name === f.name);
          return {
            ...(meta || {}),
            ...f,
          };
        })
      );

      this.mappingFields.next(
        this.aggregationBuilder.fieldsAfter(
          selectedFields,
          this.aggregationForm.get('pipeline')?.value
        )
      );
    } else {
      this.selectedFields.next([]);
      this.metaFields.next([]);
      this.mappingFields.next([]);
    }
  }
}
