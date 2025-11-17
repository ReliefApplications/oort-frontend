import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Apollo, QueryRef } from 'apollo-angular';
import { ApplicationService } from '../../../../services/application/application.service';
import { BehaviorSubject, takeUntil } from 'rxjs';
import { UnsubscribeComponent } from '../../../../components/utils/unsubscribe/unsubscribe.component';
import {
  ApplicationUsersQueryResponse,
  Role,
  User,
} from '../../../../models/user.model';
import { GET_APPLICATION_USERS } from '../../graphql/queries';
import { updateQueryUniqueValues } from '../../../../utils/update-queries';
import { PositionAttributeCategory } from '../../../../models/position-attribute-category.model';
import { SelectionModel } from '@angular/cdk/collections';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmService } from '../../../../services/confirm/confirm.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UIPageChangeEvent, handleTablePageEvent } from '@oort-front/ui';
import { CompositeFilterDescriptor } from '@progress/kendo-data-query';
import { ReferenceDataService } from '../../../../services/reference-data/reference-data.service';

/** Default number of items per request for pagination */
const DEFAULT_PAGE_SIZE = 10;

/** List of default columns */
const DEFAULT_COLUMNS = ['name', 'username', 'oid', 'roles'];

/**
 * Users list component.
 */
@Component({
  selector: 'shared-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
})
export class UserListComponent
  extends UnsubscribeComponent
  implements OnInit, OnChanges
{
  /** Whether the users are auto assigned or not */
  @Input() autoAssigned = false;
  /** Filter to apply on the users query */
  @Input() filter: CompositeFilterDescriptor | null = null;
  /** User attributes to display */
  @Input() attributes: any[] = [];
  /** Users */
  public users: Array<User> = new Array<User>();
  /** Cached users */
  public cachedUsers: User[] = [];
  /** Users query */
  private usersQuery!: QueryRef<ApplicationUsersQueryResponse>;
  /** Roles */
  @Input() roles: Role[] = [];
  /** Position attribute categories */
  @Input() positionAttributeCategories: PositionAttributeCategory[] = [];
  /** Attribute choices for reference data */
  public attributeChoices: Map<string, any[]> = new Map();
  /** Columns to display */
  public displayedColumns = [
    ...(!this.autoAssigned ? ['select'] : []),
    ...DEFAULT_COLUMNS,
    'actions',
  ];
  /** Loading state */
  public loading = new BehaviorSubject<boolean>(true);
  /** Emits loading value */
  @Output() loadingStatusChange = new EventEmitter<boolean>();
  /** Updating state */
  public updating = false;

  /** Page info */
  public pageInfo = {
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    length: 0,
    endCursor: '',
  };

  /** @returns empty state of the table */
  get empty(): boolean {
    return !this.loading && this.users.length === 0;
  }

  /** Selection model for users */
  public selection = new SelectionModel<User>(true, []);

  /**
   * Users list component
   *
   * @param apollo Apollo service
   * @param applicationService Shared application service
   * @param translate Translate service
   * @param confirmService Shared confirm service
   * @param router Angular router
   * @param route Angular activated route
   * @param refDataService Shared reference data service
   */
  constructor(
    private apollo: Apollo,
    private applicationService: ApplicationService,
    private translate: TranslateService,
    private confirmService: ConfirmService,
    private router: Router,
    private route: ActivatedRoute,
    private refDataService: ReferenceDataService
  ) {
    super();
  }

  ngOnInit(): void {
    // Emit loading value
    this.loading
      .asObservable()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadingStatusChange.emit(this.loading.value);
      });
    this.applicationService.application$
      .pipe(takeUntil(this.destroy$))
      .subscribe((application) => {
        if (application) {
          this.usersQuery =
            this.apollo.watchQuery<ApplicationUsersQueryResponse>({
              query: GET_APPLICATION_USERS,
              variables: {
                id: application.id,
                first: DEFAULT_PAGE_SIZE,
                automated: this.autoAssigned,
                filter: this.filter,
              },
            });
          this.usersQuery.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe(({ data, loading }) => {
              this.updateValues(data, loading);
            });
        }
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.filter) {
      this.fetchUsers(true);
    }
    if (changes.attributes) {
      this.displayedColumns = [
        ...(!this.autoAssigned ? ['select'] : []),
        ...DEFAULT_COLUMNS,
        ...this.attributes.map((attr) => `attr_${attr.value}`),
        'actions',
      ];
      console.log(this.displayedColumns);
      if (this.attributes.length > 0) {
        this.loadAttributeChoices();
      }
    }
  }

  /**
   * Handles page event.
   *
   * @param e page event.
   */
  onPage(e: UIPageChangeEvent): void {
    const cachedData = handleTablePageEvent(e, this.pageInfo, this.cachedUsers);
    if (cachedData && cachedData.length === this.pageInfo.pageSize) {
      this.users = cachedData;
    } else {
      this.fetchUsers();
    }
  }

  /**
   * Fetch more users
   *
   * @param refetch erase previous query results
   */
  fetchUsers(refetch?: boolean): void {
    this.updating = true;
    if (refetch) {
      this.cachedUsers = [];
      this.pageInfo.pageIndex = 0;
      this.usersQuery.refetch({
        first: this.pageInfo.pageSize,
        afterCursor: null,
        filter: this.filter,
      });
    } else {
      this.usersQuery
        .fetchMore({
          variables: {
            first: this.pageInfo.pageSize,
            afterCursor: this.pageInfo.endCursor,
            filter: this.filter,
          },
        })
        .then((results) => this.updateValues(results.data, results.loading));
    }
  }

  /**
   * Whether the number of selected elements matches the total number of rows.
   *
   * @returns True if it matches, else False
   */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.users.length;
    return numSelected === numRows;
  }

  /**
   * Selects all rows if they are not all selected; otherwise clear selection.
   */
  masterToggle(): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.isAllSelected()
      ? this.selection.clear()
      : this.users.forEach((row) => this.selection.select(row));
  }

  /**
   * Get the label for the checkbox on the passed row
   *
   * @param row The current row
   * @returns The label for the checkbox
   */
  checkboxLabel(row?: any): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${
      row.position + 1
    }`;
  }

  /**
   * Show a dialog to confirm the deletion of users
   *
   * @param users The list of users to delete
   */
  onDelete(users: User[]): void {
    if (!this.autoAssigned) {
      const title = this.translate.instant('common.deleteObject', {
        name:
          users.length < 1
            ? this.translate.instant('common.user.few')
            : this.translate.instant('common.user.one'),
      });
      // TODO
      const content = this.translate.instant(
        'components.user.delete.confirmationMessage',
        {
          name: users[0].username,
        }
      );
      const dialogRef = this.confirmService.openConfirmModal({
        title,
        content,
        confirmText: this.translate.instant('components.confirmModal.delete'),
        confirmVariant: 'danger',
      });
      dialogRef.closed
        .pipe(takeUntil(this.destroy$))
        .subscribe((value: any) => {
          if (value) {
            const ids = users.map((u) => u.id);
            this.loading.next(true);
            this.selection.clear();
            this.applicationService.deleteUsersFromApplication(ids, () =>
              this.fetchUsers(true)
            );
          }
        });
    }
  }

  /**
   * Handle click on user row.
   * Redirect to user page
   *
   * @param user user to see details of
   */
  onClick(user: User): void {
    this.router.navigate([`./${user.id}`], { relativeTo: this.route });
  }

  /**
   * Load reference data choices for attributes
   */
  private loadAttributeChoices(): void {
    for (const attribute of this.attributes) {
      if (attribute.referenceData) {
        this.refDataService
          .loadReferenceData(attribute.referenceData)
          .then((refData) => {
            if (refData) {
              this.refDataService.fetchItems(refData).then(({ items }) => {
                this.attributeChoices.set(attribute.value, items);
              });
            }
          });
      }
    }
  }

  /**
   * Get display value for an attribute
   *
   * @param attribute The attribute configuration
   * @param value The attribute value
   * @returns The display value (mapped from reference data if applicable)
   */
  public getAttributeDisplayValue(attribute: any, value: any): string {
    if (!value) return '-';

    const choices = this.attributeChoices.get(attribute.value);
    if (choices && attribute.referenceData) {
      const item = choices.find((c) => c[attribute.valueField] === value);
      return item ? item[attribute.textField] : value;
    }

    return value;
  }

  /**
   * Update user data value
   *
   * @param data query response data
   * @param loading loading status
   */
  private updateValues(data: ApplicationUsersQueryResponse, loading: boolean) {
    const mappedValues = data.application.users.edges.map((x) => x.node);
    this.cachedUsers = updateQueryUniqueValues(this.cachedUsers, mappedValues);

    this.pageInfo.length = data.application.users.totalCount;
    this.pageInfo.endCursor = data.application.users.pageInfo.endCursor;
    this.users = this.cachedUsers.slice(
      this.pageInfo.pageSize * this.pageInfo.pageIndex,
      this.pageInfo.pageSize * (this.pageInfo.pageIndex + 1)
    );
    this.loading.next(loading);
    this.updating = false;
  }
}
