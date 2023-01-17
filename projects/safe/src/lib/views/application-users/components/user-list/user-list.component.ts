import { Component, Input, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { Apollo, QueryRef } from 'apollo-angular';
import { SafeApplicationService } from '../../../../services/application/application.service';
import { takeUntil } from 'rxjs';
import { SafeUnsubscribeComponent } from '../../../../components/utils/unsubscribe/unsubscribe.component';
import { Role, User } from '../../../../models/user.model';
import {
  GetApplicationUsersQueryResponse,
  GET_APPLICATION_USERS,
} from '../../graphql/queries';
import { PositionAttributeCategory } from '../../../../models/position-attribute-category.model';
import { SelectionModel } from '@angular/cdk/collections';
import { TranslateService } from '@ngx-translate/core';
import { SafeConfirmService } from '../../../../services/confirm/confirm.service';
import { ActivatedRoute, Router } from '@angular/router';

/** Default number of items per request for pagination */
const DEFAULT_PAGE_SIZE = 10;

/**
 * Users list component.
 */
@Component({
  selector: 'safe-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
})
export class UserListComponent
  extends SafeUnsubscribeComponent
  implements OnInit
{
  @Input() autoAssigned = false;

  public displayedColumns = [
    'select',
    'name',
    'username',
    'oid',
    'roles',
    'attributes',
    'actions',
  ];

  public users: MatTableDataSource<User> = new MatTableDataSource<User>([]);
  public cachedUsers: User[] = [];
  private usersQuery!: QueryRef<GetApplicationUsersQueryResponse>;
  @Input() roles: Role[] = [];
  @Input() positionAttributeCategories: PositionAttributeCategory[] = [];

  public loading = true;
  public updating = false;

  public pageInfo = {
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    length: 0,
    endCursor: '',
  };

  /** @returns empty state of the table */
  get empty(): boolean {
    return !this.loading && this.users.data.length === 0;
  }

  selection = new SelectionModel<User>(true, []);

  /**
   * Users list component
   *
   * @param apollo Apollo service
   * @param applicationService Shared application service
   * @param translate Translate service
   * @param confirmService Shared confirm service
   * @param router Angular router
   * @param route Angular activated route
   */
  constructor(
    private apollo: Apollo,
    private applicationService: SafeApplicationService,
    private translate: TranslateService,
    private confirmService: SafeConfirmService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    super();
  }

  ngOnInit(): void {
    if (this.autoAssigned) {
      this.displayedColumns = this.displayedColumns.filter(
        (x) => x !== 'select'
      );
    }
    this.applicationService.application$
      .pipe(takeUntil(this.destroy$))
      .subscribe((application) => {
        if (application) {
          this.usersQuery =
            this.apollo.watchQuery<GetApplicationUsersQueryResponse>({
              query: GET_APPLICATION_USERS,
              variables: {
                id: application.id,
                first: DEFAULT_PAGE_SIZE,
                automated: this.autoAssigned,
              },
            });
          this.usersQuery.valueChanges
            .pipe(takeUntil(this.destroy$))
            .subscribe((res) => {
              this.cachedUsers = res.data.application.users.edges.map(
                (x) => x.node
              );
              this.users.data = this.cachedUsers.slice(
                this.pageInfo.pageSize * this.pageInfo.pageIndex,
                this.pageInfo.pageSize * (this.pageInfo.pageIndex + 1)
              );
              this.pageInfo.length = res.data.application.users.totalCount;
              this.pageInfo.endCursor =
                res.data.application.users.pageInfo.endCursor;
              this.loading = res.loading;
              this.updating = false;
            });
        }
      });
  }

  /**
   * Handles page event.
   *
   * @param e page event.
   */
  onPage(e: any): void {
    this.pageInfo.pageIndex = e.pageIndex;
    // Checks if with new page/size more data needs to be fetched
    if (
      (e.pageIndex > e.previousPageIndex ||
        e.pageSize > this.pageInfo.pageSize) &&
      e.length > this.cachedUsers.length
    ) {
      // Sets the new fetch quantity of data needed as the page size
      // If the fetch is for a new page the page size is used
      let first = e.pageSize;
      // If the fetch is for a new page size, the old page size is subtracted from the new one
      if (e.pageSize > this.pageInfo.pageSize) {
        first -= this.pageInfo.pageSize;
      }
      this.pageInfo.pageSize = first;
      this.fetchUsers();
    } else {
      this.users.data = this.cachedUsers.slice(
        e.pageSize * this.pageInfo.pageIndex,
        e.pageSize * (this.pageInfo.pageIndex + 1)
      );
    }
    this.pageInfo.pageSize = e.pageSize;
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
      this.usersQuery
        .refetch({
          first: this.pageInfo.pageSize,
          afterCursor: null,
        })
        .then(() => {
          this.loading = false;
          this.updating = false;
        });
    } else {
      this.usersQuery.fetchMore({
        variables: {
          first: this.pageInfo.pageSize,
          afterCursor: this.pageInfo.endCursor,
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) {
            return prev;
          }
          return Object.assign({}, prev, {
            role: {
              users: {
                edges: [
                  ...prev.application.users.edges,
                  ...fetchMoreResult.application.users.edges,
                ],
                pageInfo: fetchMoreResult.application.users.pageInfo,
                totalCount: fetchMoreResult.application.users.totalCount,
              },
            },
          });
        },
      });
    }
  }

  /**
   * Whether the number of selected elements matches the total number of rows.
   *
   * @returns True if it matches, else False
   */
  isAllSelected(): boolean {
    const numSelected = this.selection.selected.length;
    const numRows = this.users.data.length;
    return numSelected === numRows;
  }

  /**
   * Selects all rows if they are not all selected; otherwise clear selection.
   */
  masterToggle(): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    this.isAllSelected()
      ? this.selection.clear()
      : this.users.data.forEach((row) => this.selection.select(row));
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
        confirmColor: 'warn',
      });
      dialogRef.afterClosed().subscribe((value) => {
        if (value) {
          const ids = users.map((u) => u.id);
          this.loading = true;
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
}