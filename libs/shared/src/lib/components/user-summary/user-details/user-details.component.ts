import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { get } from 'lodash';
import { User } from '../../../models/user.model';
import { AppAbility } from '../../../services/auth/auth.service';
import { RestService } from '../../../services/rest/rest.service';
import { UnsubscribeComponent } from '../../utils/unsubscribe/unsubscribe.component';
import { takeUntil } from 'rxjs';

/**
 * User summary details component.
 */
@Component({
  selector: 'shared-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss'],
})
export class UserDetailsComponent
  extends UnsubscribeComponent
  implements OnInit
{
  /** User */
  @Input() user!: User;

  /** Event emitter for the edit event */
  @Output() edit = new EventEmitter();

  /** Setter for the loading state */
  @Input() set loading(loading: boolean) {
    if (loading) {
      this.form?.disable();
    } else {
      this.form?.enable();
      this.form?.get('email')?.disable();
      for (const attribute of this.attributes) {
        // Disable attribute controls if user cannot edit
        if (!attribute.userCanEdit) {
          this.form.get('attributes')?.get(attribute.value)?.disable();
        }
      }
    }
  }

  /** Form */
  public form!: UntypedFormGroup;
  /** Attributes */
  public attributes: {
    text: string;
    value: string;
    choices?: any[];
    valueField?: string;
    textField?: string;
    type?: string;
    userCanEdit?: boolean;
  }[] = [];

  /**
   * User summary details component
   *
   * @param fb Angular form builder
   * @param restService Shared rest service
   * @param ability user ability
   */
  constructor(
    private fb: UntypedFormBuilder,
    private restService: RestService,
    private ability: AppAbility
  ) {
    super();
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      firstName: [this.user.firstName, Validators.required],
      lastName: [this.user.lastName, Validators.required],
      email: [{ value: this.user.username, disabled: true }],
    });
    this.getAttributes();
    // Disable edition if cannot see user
    if (this.ability.cannot('update', 'User')) {
      this.form.disable();
    }
  }

  /**
   * Update user profile.
   */
  onUpdate(): void {
    this.edit.emit(this.form.value);
  }

  /**
   * Get attributes from back-end, and set controls if any
   */
  private getAttributes(): void {
    this.restService
      .get('/permissions/configuration')
      .pipe(takeUntil(this.destroy$))
      .subscribe((config) => {
        // can user edit attributes
        const manualCreation = get(config, 'attributes.local', true);
        this.restService
          .get('/permissions/attributes')
          .subscribe((attributes: any) => {
            const visibleAttributes = attributes.filter(
              (attr: any) => attr.userCanView !== false
            );
            this.form.addControl(
              'attributes',
              this.fb.group(
                visibleAttributes.reduce(
                  (group: any, attribute: any) => ({
                    ...group,
                    [attribute.value]: this.fb.control({
                      value: get(
                        this.user,
                        `attributes.${attribute.value}`,
                        null
                      ),
                      disabled: !manualCreation || !attribute.userCanEdit,
                    }),
                  }),
                  {}
                )
              )
            );
            this.attributes = visibleAttributes;
            for (const attribute of attributes) {
              // Fetch reference data from attribute field
              if (attribute.referenceData || attribute.resource) {
                this.fetchAttributeChoices(attribute);
              }
              attribute.userCanEdit =
                manualCreation && attribute.userCanEdit !== false;
            }
          });
      });
  }

  /**
   * Fetch attribute choices from attribute definition
   *
   * @param attribute Current attribute
   */
  private fetchAttributeChoices(attribute: any): void {
    this.restService
      .get(`/permissions/attributes/${attribute.value}/choices`)
      .pipe(takeUntil(this.destroy$))
      .subscribe((choices: any) => {
        attribute.choices = choices;
      });
  }
}
