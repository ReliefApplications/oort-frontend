import { Component, HostListener, Input, OnInit } from '@angular/core';
import { UntypedFormArray } from '@angular/forms';
import { AggregationBuilderService } from '../../../../services/aggregation-builder/aggregation-builder.service';
import { Observable } from 'rxjs';
import { PipelineStage } from './pipeline-stage.enum';
import { addStage } from '../aggregation-builder-forms';
import { combineLatestWith } from 'rxjs/operators';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { UnsubscribeComponent } from '../../../utils/unsubscribe/unsubscribe.component';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { isEqual } from 'lodash';
import { ResizeEvent } from 'angular-resizable-element';

/**
 * Aggregation pipeline component.
 */
@Component({
  selector: 'shared-pipeline',
  templateUrl: './pipeline.component.html',
  styleUrls: ['./pipeline.component.scss'],
})
export class PipelineComponent extends UnsubscribeComponent implements OnInit {
  /** Public variable for stage type. */
  public stageType = PipelineStage;
  /** Input array to hold the list of stages. */
  @Input() stageList: string[] = Object.values(PipelineStage);
  /** Input decorator for fields$. */
  @Input() public fields$!: Observable<any[]>;
  /** Input decorator for metaFields$. */
  @Input() public metaFields$!: Observable<any[]>;
  /** Input decorator for filterFields$. */
  @Input() public filterFields$!: Observable<any[]>;
  /** Array to hold the filter fields. */
  public filterFields: any[] = [];

  /** Editor options */
  public editorOptions = {
    automaticLayout: true,
    theme: 'vs-dark',
    language: 'json',
    formatOnPaste: true,
    fixedOverflowWidgets: true,
  };
  /** size style of editor */
  public style: any = {};

  /** Array to hold the meta fields. */
  public metaFields: any[] = [];
  /** Array to hold the initial fields. */
  public initialFields: any[] = [];
  /** Array to hold the fields per stage. */
  public fieldsPerStage: any[] = [];
  /** Enabled drag behavior, needed to set the drag on run time so cdkDragHandle directive works in the table */
  public dragEnabled = false;
  /** Whether or not to show the pipeline checkboxes */
  @Input() showCheckboxes = true;
  /** Input decorator for pipelineForm. */
  @Input() pipelineForm!: UntypedFormArray;

  /**
   * Aggregation pipeline component.
   *
   * @param aggregationBuilder Shared aggregation builder
   */
  constructor(private aggregationBuilder: AggregationBuilderService) {
    super();
  }

  ngOnInit(): void {
    this.fields$
      .pipe(combineLatestWith(this.metaFields$), takeUntil(this.destroy$))
      .subscribe({
        next: ([fields, metaFields]) => {
          this.initialFields = [...fields];
          this.metaFields = metaFields;
          this.fieldsPerStage = [];
          this.updateFieldsPerStage(this.pipelineForm.value);
        },
      });

    this.pipelineForm.valueChanges
      .pipe(distinctUntilChanged(isEqual), takeUntil(this.destroy$))
      .subscribe((pipeline: any[]) => {
        console.log(pipeline);
        this.updateFieldsPerStage(pipeline);
      });
  }

  /**
   * Updates fields for the stage.
   *
   * @param pipeline list of pipeline stages.
   */
  private updateFieldsPerStage(pipeline: any[]): void {
    for (let index = 0; index < pipeline.length; index++) {
      if (pipeline[index].type === PipelineStage.FILTER) {
        this.fieldsPerStage[index] = this.aggregationBuilder.fieldsAfter(
          this.initialFields.map((field: any) => ({
            ...field,
            ...(this.filterFields.find(
              (filterField: any) => filterField.name === field.name
            ) ?? {}),
          })),
          pipeline.slice(0, index)
        );
      } else {
        if (pipeline[index]?.type === PipelineStage.CUSTOM) {
          const rawData = pipeline[index].form.raw;
          const parsed = JSON.parse(JSON.stringify(rawData)); // Validate JSON structure
          pipeline[index].form.raw = JSON.stringify(parsed, null, 2); // Pretty-print with 2 spaces
        }
        console.log(pipeline[index]);
        this.fieldsPerStage[index] = this.aggregationBuilder.fieldsAfter(
          this.initialFields,
          pipeline.slice(0, index)
        );
        if (pipeline[index]?.type === PipelineStage.SORT) {
          this.fieldsPerStage[index] = this.fieldsPerStage[index].filter(
            (field: any) => field.type.kind === 'SCALAR'
          );
        }
      }
    }
  }

  /**
   * Adds a stage to the aggregation pipeline.
   *
   * @param type type of stage
   */
  public addStage(type: string) {
    this.pipelineForm.push(addStage({ type }));
  }

  /**
   * Deletes a stage at specified index.
   *
   * @param index index of stage to remove in pipeline.
   */
  public deleteStage(index: number) {
    this.pipelineForm.removeAt(index);
  }

  /**
   * Moves an element in array.
   *
   * @param event positions to move.
   */
  drop(event: CdkDragDrop<string[]>) {
    const temp = this.pipelineForm.at(event.previousIndex);

    this.pipelineForm.removeAt(event.previousIndex);
    this.pipelineForm.insert(event.currentIndex, temp);
  }

  /**
   * On resizing action
   *
   * @param event resize event
   */
  onResizing(event: ResizeEvent): void {
    this.style = {
      height: `${event.rectangle.height}px`,
    };
  }

  /**
   * Check if resize event is valid
   *
   * @param event resize event
   * @returns boolean
   */
  validate(event: ResizeEvent): boolean {
    const minHeight = 300;
    if (event.rectangle.height && event.rectangle.height < minHeight) {
      return false;
    } else {
      return true;
    }
  }

  /**
   * Change the custom editor depending on windows size.
   *
   * @param event Event that implies a change in window size
   */
  @HostListener('window:resize', ['$event'])
  onWindowResize(event: any): void {
    this.style = {
      width: `${event.target.innerWidth - 100}px`,
    };
  }
}
