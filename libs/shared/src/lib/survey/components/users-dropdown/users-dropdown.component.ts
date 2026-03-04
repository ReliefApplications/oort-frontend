import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Apollo, QueryRef } from 'apollo-angular';
import { GraphQLSelectModule, SelectMenuComponent } from '@oort-front/ui';
import { User, UsersNodeQueryResponse } from '../../../models/user.model';
import { GET_USERS } from './graphql/queries';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CompositeFilterDescriptor } from '@progress/kendo-data-query';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { QuestionUsersModel } from '../users';
import { QuestionAngular } from 'survey-angular-ui';
import { SurveyModel } from 'survey-core';

/** Default page size */
const ITEMS_PER_PAGE = 10;

/**
 * Component to pick users from the list of users
 * Can be searched by email, is filtered by applications and is paginated
 */
@Component({
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    GraphQLSelectModule,
  ],
  selector: 'shared-users-dropdown',
  templateUrl: './users-dropdown.component.html',
  styleUrls: ['./users-dropdown.component.scss'],
})
export class UsersDropdownComponent
  extends QuestionAngular<QuestionUsersModel>
  implements OnInit, OnDestroy
{
  /** Applications to get users from, if any */
  @Input() applications?: string[];
  /** If the user can select multiple users */
  @Input() multiple = true;
  /** Selection change emitter */
  @Output() selectionChange = new EventEmitter<string[]>();
  /** Selected users */
  public selectedUsers: User[] = [];
  /** Selected value */
  public selectedValues: string[] = [];
  /** Users query */
  public query!: QueryRef<UsersNodeQueryResponse>;
  /** Form control that has selected users */
  public control = new FormControl<string[]>([]);
  /** Destroy subject */
  private destroy$ = new Subject<void>();

  /**
   * Select menu component
   */
  @ViewChild(SelectMenuComponent, { static: true })
  selectMenu!: SelectMenuComponent;

  /**
   * Component to pick users from the list of users
   * Can be searched by email, is filtered by applications and is paginated
   *
   * @param apollo Apollo client
   * @param cdr Change detector ref
   */
  constructor(private apollo: Apollo, private cdr: ChangeDetectorRef) {
    super(cdr);
  }

  override ngOnInit(): void {
    console.log('Question name:', this.model.name);
    console.log('Question model id:', this.model.id);
    console.log('Model value:', this.model.value);
    console.log('Survey data key:', (this.surveyModel as SurveyModel).data);

    super.ngOnInit();

    // Sync initial value from the survey model
    this.selectedValues = this.model.value || [];

    this.loadUsers();

    this.query = this.apollo.watchQuery<UsersNodeQueryResponse>({
      query: GET_USERS,
      variables: {
        first: ITEMS_PER_PAGE,
        applications: this.applications ?? null,
      },
    });

    this.control.valueChanges?.subscribe((value) => {
      console.log('Control value changes...');
      this.model.value = value ?? [];
      // this.selectionChange.emit(this.control.value ?? []);
    });
  }

  /**
   * Load list of selected users
   */
  private async loadUsers() {
    if (!this.selectedValues.length) {
      return;
    }

    // Sets the form value
    this.control.setValue(this.selectedValues, { emitEvent: false });

    this.apollo
      .query<UsersNodeQueryResponse>({
        query: GET_USERS,
        variables: {
          first: this.selectedValues.length,
          filter: {
            logic: 'and',
            filters: [
              {
                field: 'ids',
                operator: 'eq',
                value: this.selectedValues,
              },
            ],
          },
        },
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ data }) => {
        if (data.users) {
          this.selectedUsers = data.users.edges.map((x) => x.node);
        }
      });
  }

  override ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    super.ngOnDestroy();
  }

  /**
   * Handles the search events
   *
   * @param searchValue New search value
   */
  public onSearchChange(searchValue: string) {
    this.query.refetch({
      filter: {
        logic: 'and',
        filters: [
          {
            field: 'username',
            operator: 'contains',
            value: searchValue,
          },
        ],
      } as CompositeFilterDescriptor,
    });
  }

  // /** Reloads selected users */
  // public reloadSelectedUsers() {
  //   this.initialSelectionIDs = this.control.value ?? [];
  //   this.setupInitialSelection();
  // }
}
