import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
} from '@angular/core';
import { Role } from '../../../../models/user.model';
import { Page } from '../../../../models/page.model';
import { get } from 'lodash';

/** Component for the forms section of the roles features */
@Component({
  selector: 'shared-role-forms',
  templateUrl: './role-forms.component.html',
  styleUrls: ['./role-forms.component.scss'],
})
export class RoleFormsComponent implements OnInit, OnChanges {
  @Input() role!: Role;
  @Input() pages: Page[] = [];
  @Input() loading = false;
  @Input() search = '';

  @Output() edit = new EventEmitter();

  public displayedColumns = ['name', 'actions'];
  public accessiblePages: string[] = [];
  public filteredPages = this.pages;

  ngOnInit(): void {
    this.accessiblePages = this.filteredPages
      .filter((x) =>
        get(x, 'permissions.canSee', [])
          .map((y: any) => y.id)
          .includes(this.role.id)
      )
      .map((x) => x.id as string);
  }

  ngOnChanges(): void {
    this.filteredPages = this.pages.filter((x) =>
      x.name?.toLowerCase().includes(this.search)
    );
    this.accessiblePages = this.filteredPages
      .filter((x) =>
        get(x, 'permissions.canSee', [])
          .map((y: any) => y.id)
          .includes(this.role.id)
      )
      .map((x) => x.id as string);
  }

  /**
   * Emits an event with the changes in permission for a given form page
   *
   * @param page A dashboard page object
   */
  onEditAccess(page: Page): void {
    const hasAccess = this.accessiblePages.includes(page.id as string);
    this.edit.emit({
      page: page.id,
      action: { [hasAccess ? 'remove' : 'add']: [this.role.id] },
    });
  }
}