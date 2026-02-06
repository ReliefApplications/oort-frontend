import {
  Component,
  Input,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { Apollo } from 'apollo-angular';
import { Form, FormQueryResponse } from '../../../models/form.model';
import { Record, RecordQueryResponse } from '../../../models/record.model';
import { debounceTime, firstValueFrom, takeUntil } from 'rxjs';
import { GET_RECORD_BY_ID, GET_SHORT_FORM_BY_ID } from './graphql/queries';
import { SnackbarService } from '@oort-front/ui';
import { TranslateService } from '@ngx-translate/core';
import { FormComponent } from '../../form/form.component';
import { ContextService } from '../../../services/context/context.service';
import { UnsubscribeComponent } from '../../utils/unsubscribe/unsubscribe.component';
import {
  CompositeFilterDescriptor,
  FilterDescriptor,
} from '@progress/kendo-data-query';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { isNil, omit } from 'lodash';

/** Completion popup settings. */
interface CompletionPopupSettings {
  enabled?: boolean;
  title?: string;
  text?: string;
}

/** Mapping rule between a question and a dashboard state. */
interface MapQuestionToState {
  question: string;
  state: string;
  direction: 'questionToState' | 'stateToQuestion' | 'both';
}

/** Form widget settings. */
interface FormWidgetSettings {
  title?: string;
  form?: string;
  floatingActions?: boolean;
  mapQuestionState?: MapQuestionToState[];
  autoPopulateOnSubmit?: boolean;
  autoPopulateOmitQuestions?: string[];
  completionPopup?: CompletionPopupSettings;
  loadRecord?: {
    enabled?: boolean;
    canUpdate?: boolean;
    update?: boolean;
    state?: string | null;
  };
  contextFilters?: string;
}

/**
 * Form widget component.
 */
@Component({
  selector: 'shared-form-widget',
  templateUrl: './form-widget.component.html',
  styleUrls: ['./form-widget.component.scss'],
})
export class FormWidgetComponent
  extends UnsubscribeComponent
  implements OnInit
{
  /** Widget settings */
  @Input() settings: FormWidgetSettings = {};
  /** Should show padding */
  @Input() usePadding = true;
  /** Widget header template reference */
  @ViewChild('headerTemplate') headerTemplate!: TemplateRef<any>;
  /** Completion popup template reference */
  @ViewChild('completionPopupTemplate')
  private completionPopupTemplate!: TemplateRef<{
    text: string;
    title: string;
  }>;
  /** Loaded form */
  public form!: Form;
  /** Loaded record, if any */
  public record?: Record;
  /** Loading state */
  public loading = true;
  /** Is form completed */
  public completed = false;
  /** Should possibility to add new records be hidden */
  public hideNewRecord = false;
  /** Active context fields */
  private contextFilters: CompositeFilterDescriptor = {
    logic: 'and',
    filters: [],
  };
  /** Form mode */
  public mode: 'edit' | 'display' = 'display';

  /** Form component */
  @ViewChild(FormComponent)
  private formComponent?: FormComponent;

  /** Completion popup dialog reference */
  private completionPopupRef?: DialogRef<
    unknown,
    { text: string; title: string }
  >;

  /** @returns map question state settings */
  get mapQuestionState(): MapQuestionToState[] {
    return this.settings.mapQuestionState || [];
  }

  /** @returns floating actions setting */
  get floatingActions(): boolean {
    return this.settings.floatingActions ?? false;
  }

  /**
   * Form widget component.
   *
   * @param apollo This is the Apollo client that we'll use to make GraphQL requests.
   * @param snackBar This is the service that allows you to display a snackbar.
   * @param translate This is the service that allows us to translate the text in our application.
   * @param contextService Shared context service
   * @param dashboardService Shared dashboard service
   * @param dialog Dialog service
   */
  constructor(
    private apollo: Apollo,
    protected snackBar: SnackbarService,
    protected translate: TranslateService,
    private contextService: ContextService,
    private dashboardService: DashboardService,
    private dialog: Dialog
  ) {
    super();
  }

  async ngOnInit(): Promise<void> {
    // Fetch template
    if (this.settings.form) {
      try {
        const { data, loading } = await firstValueFrom(
          this.apollo.query<FormQueryResponse>({
            query: GET_SHORT_FORM_BY_ID,
            variables: {
              id: this.settings.form,
            },
          })
        );
        this.form = data.form;
        this.loading = loading;
      } catch (err) {
        this.loading = false;
        const message =
          err instanceof Error
            ? err.message
            : this.translate.instant('common.notifications.dataNotRecovered');
        this.snackBar.openSnackBar(message, { error: true });
      }
    }

    // Load record from loadRecord state
    if (this.settings.loadRecord?.enabled) {
      this.hideNewRecord = true;
      const stateID = this.settings.loadRecord.state;
      this.dashboardService.states$
        .pipe(takeUntil(this.destroy$))
        .subscribe((states) => {
          // Subscribe to state changes to load record from dashboard state
          const state = states.find((s) => s.id === stateID);
          const value = state?.value;
          if (!isNil(value) && value !== this.record?.id) {
            this.loading = true;
            this.apollo
              .query<RecordQueryResponse>({
                query: GET_RECORD_BY_ID,
                variables: {
                  id: value,
                },
              })
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: ({ data }) => {
                  this.loading = false;
                  if (data) {
                    this.record =
                      !this.settings.loadRecord?.canUpdate ||
                      this.settings.loadRecord?.update
                        ? data.record
                        : omit(data.record, 'id');
                  }
                },
                error: (err) => {
                  this.loading = false;
                  const message =
                    err instanceof Error
                      ? err.message
                      : this.translate.instant(
                          'common.notifications.dataNotRecovered'
                        );
                  this.snackBar.openSnackBar(message, { error: true });
                },
              });
          }
        });
      if (this.settings.loadRecord?.canUpdate) {
        this.mode = 'edit';
      }
    } else {
      this.mode = 'edit';
    }

    this.contextFilters = this.settings.contextFilters
      ? JSON.parse(this.settings.contextFilters)
      : this.contextFilters;

    // Listen to dashboard filters changes if it is necessary
    this.contextService.filter$
      .pipe(debounceTime(500), takeUntil(this.destroy$))
      .subscribe(({ previous, current }) => {
        const contextFilters = this.settings.contextFilters ?? '';
        if (this.contextService.filterRegex.test(contextFilters)) {
          if (
            this.contextService.shouldRefresh(this.settings, previous, current)
          ) {
            const resolvedFilters = this.contextService.injectContext(
              this.contextFilters
            );
            this.getRecordFromFilters(resolvedFilters);
          }
        }
      });
  }

  /**
   * Handles complete event.
   *
   * @param e complete event
   * @param e.completed is event completed
   * @param e.hideNewRecord do we need to hide new record
   */
  public onComplete(e: { completed: boolean; hideNewRecord?: boolean }): void {
    this.completed = e.completed;
    this.hideNewRecord = this.hideNewRecord || e.hideNewRecord || false;

    if (e.completed === true) {
      this.openCompletionPopup();
    }

    if (this.settings.autoPopulateOnSubmit && e.completed === true) {
      // Reset the form
      setTimeout(() => {
        const data = structuredClone(
          this.formComponent?.survey.getParsedData?.() || {}
        );
        (this.settings.autoPopulateOmitQuestions || []).forEach(
          (question: string) => {
            delete data[question];
          }
        );
        this.clearForm();
        if (this.formComponent) {
          this.formComponent.survey.data = data;
          this.formComponent.survey.runExpressions();
        }
      }, 1000);
    }
  }

  /**
   * Resets the form component.
   */
  public clearForm(): void {
    this.formComponent?.reset();
  }

  /**
   * Get record id from filters
   *
   * @param filter filter to update
   */
  private getRecordFromFilters(
    filter: CompositeFilterDescriptor | FilterDescriptor
  ) {
    if ('filters' in filter && filter.filters) {
      filter.filters.forEach((f) => {
        this.getRecordFromFilters(f);
      });
    } else if ('field' in filter && filter.field) {
      if (filter.field === 'record') {
        const recordId = filter.value;
        this.apollo
          .query<RecordQueryResponse>({
            query: GET_RECORD_BY_ID,
            variables: {
              id: recordId,
            },
          })
          .subscribe({
            next: ({ data }) => {
              if (data) {
                this.record = data.record;
              }
            },
            error: (err) => {
              const message =
                err instanceof Error
                  ? err.message
                  : this.translate.instant(
                      'common.notifications.dataNotRecovered'
                    );
              this.snackBar.openSnackBar(message, { error: true });
            },
          });
      }
    }
  }

  /**
   * Opens the completion popup if enabled.
   */
  private openCompletionPopup(): void {
    if (!this.settings.completionPopup?.enabled) {
      return;
    }
    if (!this.completionPopupTemplate) {
      return;
    }

    const text =
      this.settings.completionPopup.text?.trim() ||
      this.translate.instant('components.form.display.submissionMessage');
    const title =
      this.settings.completionPopup?.title?.trim() ||
      this.translate.instant('components.widget.form.completionPopup.title');

    if (!text) {
      return;
    }

    if (this.completionPopupRef) {
      this.completionPopupRef.close();
    }

    this.completionPopupRef = this.dialog.open(this.completionPopupTemplate, {
      data: { text, title },
      autoFocus: false,
    });
  }
}
