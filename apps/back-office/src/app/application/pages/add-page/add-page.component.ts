import { Apollo, QueryRef } from 'apollo-angular';
import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import {
  ContentType,
  CONTENT_TYPES,
  SafeApplicationService,
  SafeUnsubscribeComponent,
  FormsQueryResponse,
  AddFormMutationResponse,
} from '@oort-front/safe';
import { takeUntil } from 'rxjs';
import { ADD_FORM } from './graphql/mutations';
import { GET_FORMS } from './graphql/queries';
import { TranslateService } from '@ngx-translate/core';
import { SnackbarService } from '@oort-front/ui';
import { Dialog } from '@angular/cdk/dialog';

/**
 * Number of items per page.
 */
const ITEMS_PER_PAGE = 10;

/**
 * Add page component.
 */
@Component({
  selector: 'app-add-page',
  templateUrl: './add-page.component.html',
  styleUrls: ['./add-page.component.scss'],
})
export class AddPageComponent
  extends SafeUnsubscribeComponent
  implements OnInit
{
  // === DATA ===
  public contentTypes = CONTENT_TYPES;
  public formsQuery!: QueryRef<FormsQueryResponse>;

  // === REACTIVE FORM ===
  public pageForm: UntypedFormGroup = new UntypedFormGroup({});
  public step = 1;

  /**
   * Add page component
   *
   * @param formBuilder Angular form builder
   * @param apollo Apollo service
   * @param applicationService Shared application service
   * @param dialog Dialog service
   * @param snackBar Shared snackbar service
   * @param translate Angular translate service
   */
  constructor(
    private formBuilder: UntypedFormBuilder,
    private apollo: Apollo,
    private applicationService: SafeApplicationService,
    public dialog: Dialog,
    private snackBar: SnackbarService,
    private translate: TranslateService
  ) {
    super();
  }

  ngOnInit(): void {
    this.pageForm = this.formBuilder.group({
      type: ['', Validators.required],
      content: [''],
      newForm: [false],
    });
    this.pageForm.get('type')?.valueChanges.subscribe((type) => {
      const contentControl = this.pageForm.controls.content;
      if (type === ContentType.form) {
        this.formsQuery = this.apollo.watchQuery<FormsQueryResponse>({
          query: GET_FORMS,
          variables: {
            first: ITEMS_PER_PAGE,
            sortField: 'name',
          },
        });
        contentControl.setValidators([Validators.required]);
        contentControl.updateValueAndValidity();
      } else {
        contentControl.setValidators(null);
        contentControl.setValue(null);
        contentControl.updateValueAndValidity();
      }
      this.onNext();
    });
  }

  /**
   * Check if step is valid or not
   *
   * @param step step index
   * @returns is step valid
   */
  isStepValid(step: number): boolean {
    switch (step) {
      case 1: {
        return this.pageForm.controls.type.valid;
      }
      case 2: {
        return this.pageForm.controls.content.valid;
      }
      default: {
        return true;
      }
    }
  }

  /**
   * Submit form to application service for creation
   */
  onSubmit(): void {
    this.applicationService.addPage(this.pageForm.value);
  }

  /**
   * Go to previous step.
   */
  onBack(): void {
    this.step -= 1;
  }

  /**
   * Go to next step.
   */
  onNext(): void {
    switch (this.step) {
      case 1: {
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        this.pageForm.controls.type.value === ContentType.form
          ? (this.step += 1)
          : this.onSubmit();
        break;
      }
      case 2: {
        this.onSubmit();
        break;
      }
      default: {
        this.step += 1;
        break;
      }
    }
  }

  /**
   * Add a new form.
   */
  async onAdd(): Promise<void> {
    const { AddFormModalComponent } = await import(
      '../../../components/add-form-modal/add-form-modal.component'
    );
    const dialogRef = this.dialog.open(AddFormModalComponent);
    dialogRef.closed.pipe(takeUntil(this.destroy$)).subscribe((value: any) => {
      if (value) {
        const variablesData = { name: value.name };
        Object.assign(
          variablesData,
          value.resource && { resource: value.resource },
          value.template && { template: value.template }
        );
        this.apollo
          .mutate<AddFormMutationResponse>({
            mutation: ADD_FORM,
            variables: variablesData,
          })
          .subscribe({
            next: ({ errors, data }) => {
              if (errors) {
                this.snackBar.openSnackBar(
                  this.translate.instant(
                    'common.notifications.objectNotCreated',
                    {
                      type: this.translate
                        .instant('common.form.one')
                        .toLowerCase(),
                      error: errors ? errors[0].message : '',
                    }
                  ),
                  { error: true }
                );
              } else {
                const id = data?.addForm.id || '';
                this.pageForm.controls.content.setValue(id);
                this.snackBar.openSnackBar(
                  this.translate.instant('common.notifications.objectCreated', {
                    type: this.translate.instant('common.page.one'),
                    value: value.name,
                  })
                );

                this.onSubmit();
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
   * Changes the query according to search text
   *
   * @param search Search text from the graphql select
   */
  onSearchChange(search: string): void {
    const variables = this.formsQuery.variables;
    this.formsQuery.refetch({
      ...variables,
      filter: {
        logic: 'and',
        filters: [
          {
            field: 'name',
            operator: 'contains',
            value: search,
          },
        ],
      },
    });
  }
}
