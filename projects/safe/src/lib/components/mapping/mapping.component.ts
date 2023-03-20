import { Component, Input, OnInit } from '@angular/core';
import { FormArray } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatTableDataSource } from '@angular/material/table';
import { SafeUnsubscribeComponent } from '../utils/unsubscribe/unsubscribe.component';
import { takeUntil } from 'rxjs/operators';
import { createFormGroup, Mapping, Mappings } from './mapping-forms';
import { SafeMappingModalComponent } from './mapping-modal/mapping-modal.component';

/**
 * Mapping component to handle all mapping grids.
 */
@Component({
  selector: 'safe-mapping',
  templateUrl: './mapping.component.html',
  styleUrls: ['./mapping.component.scss'],
})
export class SafeMappingComponent
  extends SafeUnsubscribeComponent
  implements OnInit
{
  // === DATA ===
  @Input() mappingForm!: FormArray;
  // === TABLE ===
  displayedColumns = ['field', 'path', 'value', 'text', 'actions'];
  dataSource = new MatTableDataSource<Mapping>([]);

  /**
   * Mapping component constructor.
   *
   * @param dialog Angular Material dialog service.
   */
  constructor(private dialog: MatDialog) {
    super();
  }

  ngOnInit(): void {
    this.dataSource.data = [...this.mappingForm.value];
    this.mappingForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((mappings: Mappings) => {
        this.dataSource.data = [...mappings];
      });
  }

  /**
   * Open a modal to edit current row.
   *
   * @param element selected mapping row to edit.
   * @param index index of the mapping row to edit.
   */
  onEdit(element: Mapping, index: number): void {
    const dialogRef = this.dialog.open(SafeMappingModalComponent, {
      data: {
        mapping: element,
      },
    });
    dialogRef.afterClosed().subscribe((mapping: Mapping) => {
      if (mapping) {
        this.mappingForm.at(index).setValue(mapping);
        this.mappingForm.markAsDirty();
      }
    });
  }

  /**
   * Remove current row.
   *
   * @param index index of the mapping row to remove.
   */
  onDelete(index: number): void {
    this.mappingForm.removeAt(index);
    this.mappingForm.markAsDirty();
  }

  /**
   * Open a modal to add a new mapping row.
   */
  onAdd(): void {
    const dialogRef = this.dialog.open(SafeMappingModalComponent, {
      data: {
        mapping: null,
      },
    });
    dialogRef.afterClosed().subscribe((mapping: Mapping) => {
      if (mapping) {
        this.mappingForm.push(createFormGroup(mapping));
        this.mappingForm.markAsDirty();
      }
    });
  }
}