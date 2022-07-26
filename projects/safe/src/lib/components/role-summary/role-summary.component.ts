import { Component, Input, OnInit } from '@angular/core';
import { Apollo, QueryRef } from 'apollo-angular';
import { Application } from '../../models/application.model';
import { Role } from '../../models/user.model';
import { Resource } from '../../models/resource.model';
import { SafeBreadcrumbService } from '../../services/breadcrumb.service';
import { EditRoleMutationResponse, EDIT_ROLE } from './graphql/mutations';
import { GetRoleQueryResponse, GET_ROLE } from './graphql/queries';
import { GetResourcesQueryResponse } from '../../graphql/queries';

/** Default items per query for pagination */
const DEFAULT_PAGE_SIZE = 10;

/**
 * Shared role summary component.
 * Divided into different categories.
 * This component allows edition of roles.
 */
@Component({
  selector: 'safe-role-summary',
  templateUrl: './role-summary.component.html',
  styleUrls: ['./role-summary.component.scss'],
})
export class SafeRoleSummaryComponent implements OnInit {
  @Input() id = '';
  @Input() application?: Application;
  public role?: Role;
  public loading = true;

  /**
   * Shared role summary component.
   * Divided into different categories.
   * This component allows edition of roles.
   *
   * @param apollo Apollo client
   * @param breadcrumbService Setups the breadcrumb component variables
   */
  constructor(
    private apollo: Apollo,
    private breadcrumbService: SafeBreadcrumbService
  ) {}

  ngOnInit(): void {
    this.apollo
      .query<GetRoleQueryResponse>({
        query: GET_ROLE,
        variables: {
          id: this.id,
        },
      })
      .subscribe((res) => {
        if (res.data) {
          this.role = res.data.role;
          this.breadcrumbService.setBreadcrumb(
            '@role',
            this.role.title as string
          );
        }
        this.loading = res.data.loading;
      });
  }

  /**
   * Edit opened role.
   * Submit a mutation.
   *
   * @param e update event
   */
  onEditRole(e: any): void {
    this.loading = true;
    this.apollo
      .mutate<EditRoleMutationResponse>({
        mutation: EDIT_ROLE,
        variables: { ...e, id: this.id },
      })
      .subscribe((res) => {
        if (res.data) {
          this.role = res.data.editRole;
          this.loading = res.data.loading;
        }
      });
  }
}
