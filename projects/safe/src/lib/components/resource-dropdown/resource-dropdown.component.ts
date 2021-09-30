import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Apollo, QueryRef } from 'apollo-angular';
import { Resource } from '../../models/resource.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { MatSelect } from '@angular/material/select';
import { GetResourceByIdQueryResponse, GetResourcesQueryResponse, GET_RESOURCES, GET_SHORT_RESOURCE_BY_ID } from '../../graphql/queries';
import { BlockScrollStrategy, Overlay } from '@angular/cdk/overlay';
import { MAT_SELECT_SCROLL_STRATEGY } from '@angular/material/select';

const ITEMS_PER_PAGE = 10;

export function scrollFactory(overlay: Overlay): () => BlockScrollStrategy {
  const block = () => overlay.scrollStrategies.block();
  return block;
}

@Component({
  selector: 'safe-resource-dropdown',
  templateUrl: './resource-dropdown.component.html',
  styleUrls: ['./resource-dropdown.component.scss'],
  providers: [
    { provide: MAT_SELECT_SCROLL_STRATEGY, useFactory: scrollFactory, deps: [Overlay] },
  ]
})
export class SafeResourceDropdownComponent implements OnInit {

  @Input() resource = '';
  @Output() choice: EventEmitter<string> = new EventEmitter<string>();

  public selectedResource: Resource | null = null;
  private resources = new BehaviorSubject<Resource[]>([]);
  public resources$!: Observable<Resource[]>;
  private resourcesQuery!: QueryRef<GetResourcesQueryResponse>;
  private pageInfo = {
    endCursor: '',
    hasNextPage: true
  };
  private loading = true;

  @ViewChild('resourceSelect') resourceSelect?: MatSelect;

  constructor(private apollo: Apollo) { }

  ngOnInit(): void {

    if (this.resource) {
      this.apollo.query<GetResourceByIdQueryResponse>({
        query: GET_SHORT_RESOURCE_BY_ID,
        variables: {
          id: this.resource
        }
      }).subscribe(res => {
        if (res.data.resource) {
          this.selectedResource = res.data.resource;
        }
      });
    }

    this.resourcesQuery = this.apollo.watchQuery<GetResourcesQueryResponse>({
      query: GET_RESOURCES,
      variables: {
        first: ITEMS_PER_PAGE
      }
    });

    this.resources$ = this.resources.asObservable();
    this.resourcesQuery.valueChanges.subscribe(res => {
      this.resources.next(res.data.resources.edges.map(x => x.node));
      this.pageInfo = res.data.resources.pageInfo;
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
    if (e && this.resourceSelect) {
      const panel = this.resourceSelect.panel.nativeElement;
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
        this.resourcesQuery.fetchMore({
          variables: {
            first: ITEMS_PER_PAGE,
            afterCursor: this.pageInfo.endCursor
          },
          updateQuery: (prev, { fetchMoreResult }) => {
            if (!fetchMoreResult) { return prev; }
            if (this.selectedResource) {
              console.log('yes');
              if (fetchMoreResult.resources.edges.find(x => x.node.id === this.selectedResource?.id)) {
                console.log('yes');
                this.selectedResource = null;
              }
            }
            return Object.assign({}, prev, {
              resources: {
                edges: [...prev.resources.edges, ...fetchMoreResult.resources.edges],
                pageInfo: fetchMoreResult.resources.pageInfo,
                totalCount: fetchMoreResult.resources.totalCount
              }
            });
          }
        });
      }
    }
  }
}
