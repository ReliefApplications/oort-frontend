import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Apollo, QueryRef } from 'apollo-angular';
import { Application } from '../../models/application.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { MAT_SELECT_SCROLL_STRATEGY, MatSelect } from '@angular/material/select';
import { GetApplicationsQueryResponse, GET_APPLICATIONS } from '../../graphql/queries';
import { BlockScrollStrategy, Overlay } from '@angular/cdk/overlay';

const ITEMS_PER_PAGE = 10;

export function scrollFactory(overlay: Overlay): () => BlockScrollStrategy {
  const block = () => overlay.scrollStrategies.block();
  return block;
}

@Component({
  selector: 'safe-application-dropdown',
  templateUrl: './application-dropdown.component.html',
  styleUrls: ['./application-dropdown.component.scss'],
  providers: [
    { provide: MAT_SELECT_SCROLL_STRATEGY, useFactory: scrollFactory, deps: [Overlay] },
  ]
})
export class SafeApplicationDropdownComponent implements OnInit {

  @Input() value = [];
  @Output() choice: EventEmitter<string> = new EventEmitter<string>();

  public selectedApplications: Application[] = [];
  private applications = new BehaviorSubject<Application[]>([]);
  public applications$!: Observable<Application[]>;
  private applicationsQuery!: QueryRef<GetApplicationsQueryResponse>;
  private pageInfo = {
    endCursor: '',
    hasNextPage: true
  };
  private loading = true;

  @ViewChild('applicationSelect') applicationSelect?: MatSelect;

  constructor(private apollo: Apollo) { }

  ngOnInit(): void {
    if (Array.isArray(this.value) && this.value.length > 0) {
      this.apollo.query<GetApplicationsQueryResponse>({
        query: GET_APPLICATIONS,
        variables: {
          filters: {
            ids: this.value
          }
        }
      }).subscribe(res => {
        this.selectedApplications = res.data.applications.edges.map(x => x.node);
      });
    }

    this.applicationsQuery = this.apollo.watchQuery<GetApplicationsQueryResponse>({
      query: GET_APPLICATIONS,
      variables: {
        first: ITEMS_PER_PAGE
      }
    });

    this.applications$ = this.applications.asObservable();
    this.applicationsQuery.valueChanges.subscribe(res => {
      this.applications.next(res.data.applications.edges.map(x => x.node));
      if (this.selectedApplications.length > 0) {
        const applicationsIds = this.applications.getValue().map(x => x.id);
        this.selectedApplications = this.selectedApplications.filter(x => {
          return applicationsIds.indexOf(x.id) < 0;
        });
      }
      this.pageInfo = res.data.applications.pageInfo;
      this.loading = res.loading;
    });
  }

  /**
   * Emits the selected resource id.
   * @param e select event.
   */
  onSelect(e: any): void {
    this.choice.emit(e.value);
  }

  /**
   * Adds scroll listener to select.
   * @param e open select event.
   */
  onOpenSelect(e: any): void {
    if (e && this.applicationSelect) {
      const panel = this.applicationSelect.panel.nativeElement;
      panel.addEventListener('scroll', (event: any) => this.loadOnScroll(event));
    }
  }

  /**
   * Fetches more resources on scroll.
   * @param e scroll event.
   */
  private loadOnScroll(e: any): void {
    if (e.target.scrollHeight - (e.target.clientHeight + e.target.scrollTop) < 50) {
      if (!this.loading && this.pageInfo.hasNextPage) {
        this.loading = true;
        this.applicationsQuery.fetchMore({
          variables: {
            first: ITEMS_PER_PAGE,
            afterCursor: this.pageInfo.endCursor
          },
          updateQuery: (prev, { fetchMoreResult }) => {
            if (!fetchMoreResult) { return prev; }
            return Object.assign({}, prev, {
              applications: {
                edges: [...prev.applications.edges, ...fetchMoreResult.applications.edges],
                pageInfo: fetchMoreResult.applications.pageInfo,
                totalCount: fetchMoreResult.applications.totalCount
              }
            });
          }
        });
      }
    }
  }
}