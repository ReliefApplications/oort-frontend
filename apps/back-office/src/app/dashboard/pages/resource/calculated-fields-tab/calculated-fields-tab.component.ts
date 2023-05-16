import { Component, OnInit } from '@angular/core';
import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { TranslateService } from '@ngx-translate/core';
import { Resource, SafeSnackBarService } from '@oort-front/safe';
import { Apollo } from 'apollo-angular';
import get from 'lodash/get';
import {
  Calculated_FIELD_UPDATE,
  CalculatedFieldUpdateMutationResponse,
} from './graphql/mutations';
import { Variant, Category } from '@oort-front/ui';

/**
 * Calculated fields tab of resource page
 */
@Component({
  selector: 'app-calculated-fields-tab',
  templateUrl: './calculated-fields-tab.component.html',
  styleUrls: ['./calculated-fields-tab.component.scss'],
})
export class CalculatedFieldsTabComponent implements OnInit {
  public resource!: Resource;
  public fields: any[] = [];

  public displayedColumns: string[] = ['name', 'createdAt', '_actions'];

  // === BUTTON ===
  public variant = Variant;
  public category = Category;

  /**
   * Layouts tab of resource page
   *
   * @param apollo Apollo service
   * @param dialog Material dialog service
   * @param translate Angular translate service
   * @param snackBar Shared snackbar service
   */
  constructor(
    private apollo: Apollo,
    private dialog: MatDialog,
    private translate: TranslateService,
    private snackBar: SafeSnackBarService
  ) {}

  ngOnInit(): void {
    const state = history.state;
    this.resource = get(state, 'resource', null);

    this.fields = this.resource.fields.filter((f: any) => f.isCalculated);
  }

  /**
   * Adds a new Calculated field for the resource.
   */
  async onAddCalculatedField(): Promise<void> {
    const { SafeEditCalculatedFieldModalComponent } = await import(
      '@oort-front/safe'
    );
    const dialogRef = this.dialog.open(SafeEditCalculatedFieldModalComponent, {
      disableClose: true,
      data: {
        calculatedField: null,
        resourceFields: this.resource.fields.filter(
          (f: any) => !f.isCalculated
        ),
      },
    });
    dialogRef.afterClosed().subscribe((value) => {
      if (value) {
        this.apollo
          .mutate<CalculatedFieldUpdateMutationResponse>({
            mutation: Calculated_FIELD_UPDATE,
            variables: {
              resourceId: this.resource.id,
              calculatedField: {
                add: {
                  name: value.name,
                  expression: value.expression
                    .replace(/<[^>]*>/gi, ' ')
                    .replace(/<\/[^>]*>/gi, ' ')
                    .replace(/&nbsp;|&#160;/gi, ' ')
                    .replace(/\s+/gi, ' ')
                    .trim(),
                },
              },
            },
          })
          .subscribe({
            next: (res) => {
              if (res.data?.editResource) {
                // Needed to update the field as table data source
                this.fields = this.fields.concat(
                  res.data.editResource.fields.find(
                    (f: any) => f.name === value.name
                  )
                );
              }
              if (res.errors) {
                this.snackBar.openSnackBar(res.errors[0].message, {
                  error: true,
                });
              }
            },
            error: (err) => {
              this.snackBar.openSnackBar(err.message, { error: true });
            },
          });
      }
    });
  }

  /**
   * Edits a layout. Opens a popup for edition.
   *
   * @param field Calculated field to edit
   */
  async onEditCalculatedField(field: any): Promise<void> {
    const { SafeEditCalculatedFieldModalComponent } = await import(
      '@oort-front/safe'
    );
    const dialogRef = this.dialog.open(SafeEditCalculatedFieldModalComponent, {
      disableClose: true,
      data: {
        calculatedField: field,
        resourceFields: this.resource.fields.filter(
          (f: any) => !f.isCalculated
        ),
      },
    });
    dialogRef.afterClosed().subscribe((value) => {
      if (!value) {
        return;
      }
      this.apollo
        .mutate<CalculatedFieldUpdateMutationResponse>({
          mutation: Calculated_FIELD_UPDATE,
          variables: {
            resourceId: this.resource.id,
            calculatedField: {
              update: {
                oldName: field.name,
                name: value.name,
                expression: value.expression
                  .replace(/<[^>]*>/gi, ' ')
                  .replace(/<\/[^>]*>/gi, ' ')
                  .replace(/&nbsp;|&#160;/gi, ' ')
                  .replace(/\s+/gi, ' ')
                  .trim(),
              },
            },
          },
        })
        .subscribe({
          next: (res) => {
            if (res.data?.editResource) {
              // Needed to update the field as table data source
              this.fields = res.data.editResource.fields.filter(
                (f: any) => f.isCalculated
              );
            }
            if (res.errors) {
              this.snackBar.openSnackBar(res.errors[0].message, {
                error: true,
              });
            }
          },
          error: (err) => {
            this.snackBar.openSnackBar(err.message, { error: true });
          },
        });
    });
  }

  /**
   * Deletes a Calculated field.
   *
   * @param field Calculated field to delete
   */
  async onDeleteCalculatedField(field: any): Promise<void> {
    const { SafeConfirmModalComponent } = await import('@oort-front/safe');
    const dialogRef = this.dialog.open(SafeConfirmModalComponent, {
      data: {
        title: this.translate.instant('common.deleteObject', {
          name: this.translate.instant('common.calculatedField.one'),
        }),
        content: this.translate.instant(
          'components.calculatedFields.delete.confirmationMessage',
          {
            name: field.name,
          }
        ),
        confirmText: this.translate.instant('components.confirmModal.delete'),
        cancelText: this.translate.instant('components.confirmModal.cancel'),
      },
    });

    dialogRef.afterClosed().subscribe((value) => {
      if (value) {
        this.apollo
          .mutate<CalculatedFieldUpdateMutationResponse>({
            mutation: Calculated_FIELD_UPDATE,
            variables: {
              resourceId: this.resource.id,
              calculatedField: {
                remove: {
                  name: field.name,
                },
              },
            },
          })
          .subscribe({
            next: (res) => {
              if (res.data?.editResource) {
                this.fields = this.fields.filter(
                  (f: any) => f.name !== field.name
                );
              }
              if (res.errors) {
                this.snackBar.openSnackBar(res.errors[0].message, {
                  error: true,
                });
              }
            },
            error: (err) => {
              this.snackBar.openSnackBar(err.message, { error: true });
            },
          });
      }
    });
  }
}
