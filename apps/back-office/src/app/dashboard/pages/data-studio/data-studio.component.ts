import { Component, OnInit } from '@angular/core';
import { UIPageChangeEvent, handleTablePageEvent } from '@oort-front/ui';
import {
  Resource,
  ResourceQueryResponse,
  ResourcesQueryResponse,
  UnsubscribeComponent,
  ResourceRecordsNodesQueryResponse,
  Form,
  FormsQueryResponse,
} from '@oort-front/shared';
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Apollo, QueryRef } from 'apollo-angular';
import { takeUntil, firstValueFrom } from 'rxjs';
import { GET_RESOURCE, GET_RESOURCES, GET_FORM_NAMES } from './graphql/queries';
import { CONVERT_RESOURCE_RECORDS } from './graphql/mutations';
import { updateQueryUniqueValues } from '../../../utils/update-queries';
import { FormBuilder } from '@angular/forms';

/** Items per page */
const ITEMS_PER_PAGE = 10;

/** Default page size  */
const DEFAULT_PAGE_SIZE = 10;

/** Interface of table elements */
interface TableResourceElement {
  resource: Resource;
}

/** Interface of table elements */
interface TableFormElement {
  form: Form;
}

/** Interface of dataGeneration form */
interface DataGenerationFormValues {
  id: string;
  initialType: string;
  newType: string;
  field: string;
  popArray: string;
  failedAction: string;
}

/**
 * Data Studio component
 */
@Component({
  selector: 'app-data-studio',
  templateUrl: './data-studio.component.html',
  styleUrls: ['./data-studio.component.scss'],
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
export class DataStudioComponent
  extends UnsubscribeComponent
  implements OnInit
{
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
  public formId = '';

  // === FILTERING ===
  public filter: any;
  public filterLoading = false;

  // === TABLE ELEMENTS ===
  // private resourcesQuery!: QueryRef<ResourcesQueryResponse>;
  public formsQuery!: QueryRef<FormsQueryResponse>;
  public displayedColumns: string[] = ['name'];
  // public resources = new Array<TableResourceElement>();
  public forms = new Array<TableFormElement>();
  // public cachedResources: Resource[] = [];
  public cachedForms: Form[] = [];

  private dataGenerationFormValues: DataGenerationFormValues = {
    id: '',
    initialType: '',
    newType: '',
    field: '',
    popArray: '',
    failedAction: '',
  };

  public selectedForm = this.fb.group({
    form: [''],
  });

  /**
   * Data studio component
   *
   * @param apollo Apollo client service
   */
  constructor(private apollo: Apollo, private fb: FormBuilder) {
    super();
  }

  /** OnInit Hook. */
  ngOnInit(): void {
    this.formsQuery = this.apollo.watchQuery<FormsQueryResponse>({
      query: GET_FORM_NAMES,
      variables: {
        first: ITEMS_PER_PAGE,
        sortField: 'name',
      },
    });
  }

  /**
   * Update query based on text search.
   *
   * @param search Search text from the graphql select
   */
  onSearchChange(search: string): void {
    const variables = this.formsQuery.variables;
    this.formsQuery.refetch({
      ...variables,
      filter: {
        logic: 'and',
        filters: [
          {
            field: 'name',
            operator: 'contains',
            value: search,
          },
        ],
      },
    });
  }

  onSelectionChange(event: any): void {
    this.formId = event;
  }

  /**
   * Get the values from the dataGeneration form
   *
   * @param dataGenerationFormValues dataGeneration form values
   */
  public getDataGenerationFormValues(dataGenerationFormValues: any) {
    this.dataGenerationFormValues = dataGenerationFormValues;
    // this.onConvert(
    //   this.openedForm as Form,
    //   this.dataGenerationFormValues
    // );
  }
}
