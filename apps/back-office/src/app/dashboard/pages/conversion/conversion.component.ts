import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {
  ButtonModule,
  DateModule,
  FormWrapperModule,
  IconModule,
  PaginatorModule,
  SelectMenuModule,
  SnackbarService,
  SpinnerModule,
  TableModule,
  TooltipModule,
  UIPageChangeEvent,
  handleTablePageEvent,
} from '@oort-front/ui';
import {
  ListFilterComponent,
  Resource,
  ResourceQueryResponse,
  ResourcesQueryResponse,
  SkeletonTableModule,
  UnsubscribeComponent,
} from '@oort-front/shared';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FilterModule } from 'libs/shared/src/lib/components/filter/filter.module';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Apollo, QueryRef } from 'apollo-angular';
import { takeUntil } from 'rxjs';
import { GET_RESOURCE, GET_RESOURCES } from './graphql/queries';
import { updateQueryUniqueValues } from '../../../utils/update-queries';
import { ConversionModule } from './conversion.module';

/** Default page size  */
const DEFAULT_PAGE_SIZE = 10;

/** Interface of table elements */
interface TableResourceElement {
  resource: Resource;
}

@Component({
  selector: 'app-conversion',
  templateUrl: './conversion.component.html',
  styleUrls: ['./conversion.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ),
    ]),
  ],
})
export class ConversionComponent extends UnsubscribeComponent {
  // === PAGINATION ===
  public loading = true; // First load && pagination
  public pageInfo = {
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
    length: 0,
    endCursor: '',
  };

  // === SINGLE ELEMENT ===
  public updating = false; // Update of resource
  public openedResource?: Resource;

  // === FILTERING ===
  public filter: any;
  public filterLoading = false;

  // === TABLE ELEMENTS ===
  private resourcesQuery!: QueryRef<ResourcesQueryResponse>;
  public displayedColumns: string[] = ['name'];
  public resources = new Array<TableResourceElement>();
  public cachedResources: Resource[] = [];

  private conversionFormValues: Object = {};

  /**
   * Resource tab of Role Summary component.
   *
   * @param apollo Apollo client service
   * @param snackBar shared snackbar service
   */
  constructor(private apollo: Apollo, private snackBar: SnackbarService) {
    super();
  }

  /** Load the resources. */
  ngOnInit(): void {
    this.resourcesQuery = this.apollo.watchQuery<ResourcesQueryResponse>({
      query: GET_RESOURCES,
      variables: {
        first: DEFAULT_PAGE_SIZE,
        sortField: 'name',
        sortOrder: 'asc',
      },
    });

    this.resourcesQuery.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(({ data, loading }) => {
        this.updateValues(data, loading);
      });
  }

  /**
   * Custom TrackByFunction to compute the identity of items in an iterable, so when
   * updating fields the scroll don't get back to the beginning of the table.
   *
   * @param index index of the item in the table
   * @param item item table
   * @returns unique value for all unique inputs
   */
  public getUniqueIdentifier(index: number, item: any): any {
    return item.resource.id;
  }

  /**
   * Update resources query.
   *
   * @param refetch erase previous query results
   */
  private fetchResources(refetch?: boolean): void {
    this.updating = true;
    if (refetch) {
      this.cachedResources = [];
      this.pageInfo.pageIndex = 0;
      this.resourcesQuery.refetch({
        first: this.pageInfo.pageSize,
        filter: this.filter,
        afterCursor: null,
      });
    } else {
      this.loading = true;
      this.resourcesQuery
        .fetchMore({
          variables: {
            first: this.pageInfo.pageSize,
            filter: this.filter,
            afterCursor: this.pageInfo.endCursor,
          },
        })
        .then((results) => this.updateValues(results.data, results.loading));
    }
  }

  /**
   * Handles page event.
   *
   * @param e page event.
   */
  onPage(e: UIPageChangeEvent): void {
    const cachedData = handleTablePageEvent(
      e,
      this.pageInfo,
      this.cachedResources
    );
    if (cachedData && cachedData.length === this.pageInfo.pageSize) {
      //this.resources = this.resources = this.setTableElements(cachedData);
    } else {
      this.fetchResources();
    }
  }

  /**
   * Toggles the accordion for the clicked resource and fetches its forms
   *
   * @param resource The resource element for the resource to be toggled
   */
  toggleResource(resource: Resource): void {
    if (resource.id === this.openedResource?.id) {
      this.openedResource = undefined;
    } else {
      this.updating = true;
      this.apollo
        .query<ResourceQueryResponse>({
          query: GET_RESOURCE,
          variables: {
            id: resource.id,
          },
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe(({ data }) => {
          if (data.resource) {
            this.openedResource = data.resource;
          }
          this.updating = false;
        });
    }
  }

  /**
   * Serialize single table element from resource
   *
   * @param resource resource to serialize
   * @returns serialized element
   */
  private setTableElement(resource: Resource): TableResourceElement {
    return {
      resource,
    };
  }

  /**
   * Serialize list of table elements from resource
   *
   * @param resources resources to serialize
   * @returns serialized elements
   */
  private setTableElements(resources: Resource[]): TableResourceElement[] {
    return resources.map((x: Resource) => this.setTableElement(x));
  }

  /**
   *  Update resource data value
   *
   * @param data query response data
   * @param loading loading status
   */
  private updateValues(data: ResourcesQueryResponse, loading: boolean) {
    const mappedValues = data.resources?.edges?.map((x) => x.node);
    this.cachedResources = updateQueryUniqueValues(
      this.cachedResources,
      mappedValues
    );
    this.resources = this.setTableElements(
      this.cachedResources.slice(
        this.pageInfo.pageSize * this.pageInfo.pageIndex,
        this.pageInfo.pageSize * (this.pageInfo.pageIndex + 1)
      )
    );
    this.pageInfo.length = data.resources.totalCount;
    this.pageInfo.endCursor = data.resources.pageInfo.endCursor;
    this.loading = loading;
    this.updating = loading;
    this.filterLoading = false;
  }

  getConversionFormValues(conversionFormValues: Object) {
    this.conversionFormValues = conversionFormValues;
    console.log(this.conversionFormValues);
  }
}
