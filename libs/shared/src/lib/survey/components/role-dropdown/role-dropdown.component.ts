import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuestionAngular } from 'survey-angular-ui';
import { QuestionRoleDropdownModel } from './role-dropdown.model';
import {
  FormWrapperModule,
  SelectMenuComponent,
  SelectMenuModule,
} from '@oort-front/ui';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { Role, RolesQueryResponse } from '../../../models/user.model';
import { Apollo } from 'apollo-angular';
import { Subject, takeUntil } from 'rxjs';
import { GET_ROLES } from './graphql/queries';

@Component({
  selector: 'shared-role-dropdown',
  standalone: true,
  imports: [
    CommonModule,
    SelectMenuModule,
    TranslateModule,
    FormWrapperModule,
    FormsModule,
  ],
  templateUrl: './role-dropdown.component.html',
  styleUrls: ['./role-dropdown.component.scss'],
})
export class RoleDropdownComponent
  extends QuestionAngular<QuestionRoleDropdownModel>
  implements OnInit, OnDestroy
{
  /** Roles */
  public roles: Role[] = [];
  /** Loading indicator */
  public loading = true;
  /** Apollo service */
  private apollo = inject(Apollo);
  /** Destroy subject */
  private destroy$: Subject<void> = new Subject<void>();
  /**
   * Select menu component
   */
  @ViewChild(SelectMenuComponent, { static: true })
  selectMenu!: SelectMenuComponent;

  override ngOnInit(): void {
    super.ngOnInit();
    // Listen to select menu UI event in order to update UI
    this.selectMenu.triggerUIChange$
      .pipe(takeUntil(this.destroy$))
      .subscribe((hasChanged: boolean) => {
        if (hasChanged) {
          this.detectChangesUI();
        }
      });
    this.getRoles();
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Trigger change detection manually for survey property grid editor questions
   */
  detectChangesUI(): void {
    this.changeDetectorRef.detectChanges();
  }

  private getRoles(): void {
    this.loading = true;
    this.roles = [];
    this.apollo
      .query<RolesQueryResponse>({
        query: GET_ROLES,
        variables: {
          application: this.model.obj.applications[0],
        },
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.roles = response.data.roles;
          this.loading = false;
          this.detectChangesUI();
        },
        error: () => {
          this.loading = false;
        },
      });
  }
}
