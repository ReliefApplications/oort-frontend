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
import { ReferenceDataService } from '../../../services/reference-data/reference-data.service';

/**
 * User summary details component.
 */
@Component({
  selector: 'shared-user-details',
  templateUrl: './user-details.component.html',
  styleUrls: ['./user-details.component.scss'],
})
export class UserDetailsComponent implements OnInit {
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
  }[] = [];

  /**
   * User summary details component
   *
   * @param fb Angular form builder
   * @param restService Shared rest service
   * @param ability user ability
   * @param refDataService Reference data service
   */
  constructor(
    private fb: UntypedFormBuilder,
    private restService: RestService,
    private ability: AppAbility,
    private refDataService: ReferenceDataService
  ) {}

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
    this.restService.get('/permissions/configuration').subscribe((config) => {
      // can user edit attributes
      const manualCreation = get(config, 'attributes.local', true);
      this.restService
        .get('/permissions/attributes')
        .subscribe((attributes: any) => {
          this.form.addControl(
            'attributes',
            this.fb.group(
              attributes.reduce(
                (group: any, attribute: any) => ({
                  ...group,
                  [attribute.value]: this.fb.control({
                    value: get(
                      this.user,
                      `attributes.${attribute.value}`,
                      null
                    ),
                    disabled: !manualCreation,
                  }),
                }),
                {}
              )
            )
          );
          this.attributes = attributes;
          for (const attribute of attributes) {
            // Fetch reference data from attribute field
            if (attribute.referenceData) {
              this.fetchAttributeChoices(attribute);
            }
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
    this.refDataService
      .loadReferenceData(attribute.referenceData)
      .then((refData) => {
        if (refData) {
          this.refDataService.fetchItems(refData).then(({ items }) => {
            const target = this.attributes.find(
              (x) => x.value === attribute.value
            );
            if (target) {
              target.textField = attribute.textField;
              target.valueField = refData.valueField;
              target.choices = items;
            }
          });
        }
      });
  }
}
