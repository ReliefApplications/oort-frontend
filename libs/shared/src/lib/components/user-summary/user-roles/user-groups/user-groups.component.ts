import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Apollo } from 'apollo-angular';
import { get } from 'lodash';
import {
  Group,
  GroupsQueryResponse,
  User,
} from '../../../../models/user.model';
import { GET_GROUPS } from '../../graphql/queries';
import { SnackbarService } from '@oort-front/ui';

/** Back-office groups section the user summary */
@Component({
  selector: 'shared-user-groups',
  templateUrl: './user-groups.component.html',
  styleUrls: ['./user-groups.component.scss'],
})
export class UserGroupsComponent implements OnInit {
  /** Groups */
  public groups: Group[] = [];
  /** Groups that can be rendered in the dropdown */
  public availableGroups: Group[] = [];
  /** User */
  @Input() user!: User;
  /** Selected groups */
  selectedGroups!: ReturnType<typeof this.createFormControl>;
  /** Event emitter for the edit event */
  @Output() edit = new EventEmitter();
  /** Whether the group can be edited or not*/
  @Input() canEdit = false;

  /** Setter for the loading state */
  @Input() set loading(loading: boolean) {
    if (!this.canEdit) return;
    if (loading) {
      this.selectedGroups?.disable({ emitEvent: false });
    } else {
      this.selectedGroups?.enable({ emitEvent: false });
    }
  }

  /**
   * Back-office groups section the user summary
   *
   * @param fb Angular form builder
   * @param apollo Apollo client
   * @param snackBar Shared snackbar service
   */
  constructor(
    private fb: FormBuilder,
    private apollo: Apollo,
    private snackBar: SnackbarService
  ) {}

  ngOnInit(): void {
    this.selectedGroups = this.createFormControl();
    this.selectedGroups.valueChanges.subscribe((value) => {
      this.edit.emit({ groups: value });
    });

    this.loading = true;
    this.apollo
      .query<GroupsQueryResponse>({
        query: GET_GROUPS,
      })
      .subscribe({
        next: ({ data, loading }) => {
          if (data) {
            this.groups = data.groups || [];
            this.availableGroups = this.groups.filter(
              (group) => !!group?.id && !!group?.title
            );

            const selectedGroupIds = (this.selectedGroups?.value || []).filter(
              (groupId: string | undefined) =>
                typeof groupId === 'string' &&
                this.availableGroups.some((group) => group.id === groupId)
            );
            this.selectedGroups?.setValue(selectedGroupIds, {
              emitEvent: false,
            });
          }
          this.loading = loading;
        },
        error: (err) => {
          this.snackBar.openSnackBar(err.message, { error: true });
        },
      });
  }

  /**
   * Create form control
   *
   * @returns form control
   */
  private createFormControl() {
    return this.fb.control({
      value: get(this.user, 'groups', []).map((x) => x.id),
      disabled: !this.canEdit,
    });
  }
}
