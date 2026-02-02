import { Apollo } from 'apollo-angular';
import {
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { GET_DASHBOARD_BY_ID } from './graphql/queries';
import {
  Dashboard,
  UnsubscribeComponent,
  WidgetGridComponent,
  ConfirmService,
  ButtonActionT,
  ContextService,
  DashboardQueryResponse,
  Record,
  DashboardService,
  handleAnchorNavigation,
  getFragmentFromHref,
  normalizeHref,
  scrollToFragment,
} from '@oort-front/shared';
import { TranslateService } from '@ngx-translate/core';
import { filter, map, startWith, takeUntil } from 'rxjs/operators';
import { Observable, firstValueFrom } from 'rxjs';
import { SnackbarService, Variant } from '@oort-front/ui';
import { DOCUMENT } from '@angular/common';
import { cloneDeep } from 'lodash';

/**
 * Dashboard page.
 */
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent
  extends UnsubscribeComponent
  implements OnInit, OnDestroy
{
  /** Change step event ( in workflow ) */
  @Output() changeStep: EventEmitter<number> = new EventEmitter();
  /** Widget grid reference */
  @ViewChild(WidgetGridComponent)
  widgetGridComponent!: WidgetGridComponent;
  /** Is dashboard in fullscreen mode */
  public isFullScreen = false;
  /** Dashboard id */
  public id = '';
  /** Context id */
  public contextId?: string;
  /** Application id */
  public applicationId?: string;
  /** Is dashboard loading */
  public loading = true;
  /** Current dashboard */
  public dashboard?: Dashboard;
  /** Show dashboard filter */
  public showFilter!: boolean;
  /** Current style variant */
  public variant!: Variant;
  /** hide / show the close icon on the right */
  public closable = true;
  /** Dashboard button actions */
  public buttonActions: ButtonActionT[] = [];
  /** Pending fragment to scroll to */
  private pendingFragment: string | null = null;
  /** Fragment scroll attempts */
  private fragmentScrollAttempts = 0;
  /** Fragment scroll timeout */
  private fragmentScrollTimeout?: NodeJS.Timeout;
  /** Normalize anchors timeout */
  private normalizeAnchorsTimeout?: NodeJS.Timeout;
  /** Normalize anchors attempts */
  private normalizeAnchorsAttempts = 0;
  // Anchor click handler reference.
  private readonly anchorClickHandler = (event: MouseEvent) =>
    this.handleAnchorClick(event);

  /**
   * Dashboard page.
   *
   * @param apollo Apollo client
   * @param route Angular current page
   * @param router Angular router
   * @param dialog Dialog service
   * @param snackBar Shared snackbar service
   * @param translate Angular translate service
   * @param confirmService Shared confirm service
   * @param renderer Angular renderer
   * @param elementRef Angular element ref
   * @param document Document
   * @param contextService Dashboard context service
   * @param dashboardService Shared dashboard service
   */
  constructor(
    private apollo: Apollo,
    private route: ActivatedRoute,
    private router: Router,
    public dialog: Dialog,
    private snackBar: SnackbarService,
    private translate: TranslateService,
    private confirmService: ConfirmService,
    private renderer: Renderer2,
    private elementRef: ElementRef,
    @Inject(DOCUMENT) private document: Document,
    private contextService: ContextService,
    public dashboardService: DashboardService
  ) {
    super();
  }

  /**
   * Subscribes to the route to load the dashboard accordingly.
   */
  ngOnInit(): void {
    this.document.addEventListener('click', this.anchorClickHandler, true);
    /** Listen to router events navigation end, to get last version of params & queryParams. */
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        startWith(this.router), // initialize
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.resetFragmentScrollState();
        this.pendingFragment = this.getCurrentFragment();
        this.loading = true;
        // Reset scroll when changing page
        const pageContainer = this.document.getElementById('appPageContainer');
        if (pageContainer) {
          pageContainer.scrollTop = 0;
        }
        /** Extract main dashboard id */
        let id = this.route.snapshot.paramMap.get('id');
        /** Extract query id to load template */
        const queryId = this.route.snapshot.queryParamMap.get('id');

        // Quick fix, not sure what's causing this two run twice,
        // the second time the id is the old one concatenated with the the context id
        if (id?.includes('?id=')) {
          const [newId, newQueryId] = id.split('?id=');
          const urlArr = this.router.url.split('/');
          // remove the "faulty" id from the url
          urlArr.pop();

          this.router.navigateByUrl(
            urlArr.join('/') + `/${newId}?id=${newQueryId}`
          );

          return;
        }

        if (id) {
          if (id.includes('#')) {
            id = id.split('#')[0];
          }
          if (id.includes('%23')) {
            id = id.split('%23')[0];
          }
        }

        if (id) {
          this.loadDashboard(id, queryId?.trim()).then(
            () => (this.loading = false)
          );
        }
      });
  }

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    if (this.fragmentScrollTimeout) {
      clearTimeout(this.fragmentScrollTimeout);
    }
    if (this.normalizeAnchorsTimeout) {
      clearTimeout(this.normalizeAnchorsTimeout);
    }
    this.document.removeEventListener('click', this.anchorClickHandler, true);
  }

  /**
   * Handles anchor clicks to avoid full navigation and enable in-page scrolling.
   *
   * @param event Anchor click event
   */
  private handleAnchorClick(event: MouseEvent): void {
    if (event.defaultPrevented) {
      return;
    }
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const target = event.target as HTMLElement | null;
    const anchor = target?.closest('a') as HTMLAnchorElement | null;
    if (!anchor) {
      return;
    }

    const rawHref = anchor.getAttribute('href');
    if (!rawHref) {
      return;
    }

    let normalizedHref = normalizeHref(rawHref);
    const isHashOnly = normalizedHref.startsWith('#');
    let url: URL;
    try {
      url = new URL(normalizedHref, this.document.location.href);
    } catch {
      return;
    }

    const fragment = getFragmentFromHref(normalizedHref, this.document);
    if (fragment === null) {
      return;
    }

    if (anchor.target && anchor.target !== '_self') {
      return;
    }

    const current = new URL(this.document.location.href);
    const sameOrigin = url.origin === current.origin;
    const samePath = url.pathname === current.pathname;
    const sameSearch = url.search === current.search;
    if (!sameOrigin) {
      return;
    }

    if (!isHashOnly && url.pathname === '/' && current.pathname !== '/') {
      normalizedHref = `#${fragment}`;
    }

    const { handled } = handleAnchorNavigation(normalizedHref, this.document, {
      behavior: 'smooth',
    });
    if (handled || isHashOnly || (samePath && sameSearch)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /** Sets up the widgets from the dashboard structure */
  private setWidgets() {
    this.dashboardService.widgets = cloneDeep(
      this.dashboard?.structure
        ?.filter((x: any) => x !== null)
        .map((widget: any) => {
          const contextData = this.dashboard?.contextData;
          this.contextService.context = contextData || null;
          if (!contextData) {
            return widget;
          }
          const { settings, originalSettings } =
            this.contextService.updateSettingsContextContent(
              widget.settings,
              this.dashboard
            );
          widget = {
            ...widget,
            originalSettings,
            settings,
          };
          return widget;
        }) || []
    );
  }

  /**
   * Init the dashboard
   *
   * @param id Dashboard id
   * @param contextId Context id (id of the element or the record)
   * @returns Promise
   */
  private async loadDashboard(id: string, contextId?: string) {
    // don't init the dashboard if the id is the same
    if (this.dashboard?.id === id && this.contextId === contextId) {
      return;
    }

    const rootElement = this.elementRef.nativeElement;
    // Doing this to be able to use custom styles on specific dashboards
    this.renderer.setAttribute(rootElement, 'data-dashboard-id', id);
    this.loading = true;
    this.showFilter = false;
    return firstValueFrom(
      this.apollo.query<DashboardQueryResponse>({
        query: GET_DASHBOARD_BY_ID,
        variables: {
          id,
          contextEl: contextId || null,
        },
      })
    )
      .then(({ data }) => {
        if (data?.dashboard) {
          this.id = data.dashboard.id || id;
          this.contextId = contextId ?? undefined;
          this.dashboard = data.dashboard;
          this.dashboardService.openDashboard(this.dashboard);
          this.initContext();
          this.setWidgets();
          this.buttonActions = this.dashboard.buttons || [];
          this.showFilter = this.dashboard.filter?.show ?? false;
          this.contextService.isFilterEnabled.next(this.showFilter);
          this.contextService.filterPosition.next({
            position: this.dashboard.filter?.position as any,
            dashboardId: this.dashboard.id ?? '',
          });
          this.contextService.setFilter(this.dashboard);
          this.variant = this.dashboard.filter?.variant || 'default';
          this.closable = this.dashboard.filter?.closable ?? false;
          this.tryScrollToFragment();
          this.scheduleNormalizeAnchorHrefs();
        } else {
          this.contextService.isFilterEnabled.next(false);
          this.contextService.setFilter();
          this.snackBar.openSnackBar(
            this.translate.instant('common.notifications.accessNotProvided', {
              type: this.translate
                .instant('common.dashboard.one')
                .toLowerCase(),
              error: '',
            }),
            { error: true }
          );
          this.router.navigate(['/']);
        }
      })
      .catch((err) => {
        this.snackBar.openSnackBar(err.message, { error: true });
        this.router.navigate(['/']);
      });
  }

  /**
   * Show modal confirmation before leave the page if has changes on form
   *
   * @returns boolean of observable of boolean
   */
  canDeactivate(): Observable<boolean> | boolean {
    if (this.widgetGridComponent && !this.widgetGridComponent?.canDeactivate) {
      const dialogRef = this.confirmService.openConfirmModal({
        title: this.translate.instant('pages.dashboard.update.exit'),
        content: this.translate.instant('pages.dashboard.update.exitMessage'),
        confirmText: this.translate.instant('components.confirmModal.confirm'),
        confirmVariant: 'primary',
      });
      return dialogRef.closed.pipe(
        map((confirm) => {
          if (confirm) {
            return true;
          }
          return false;
        })
      );
    }
    return true;
  }

  /** Initializes the dashboard context */
  private initContext() {
    const callback = (contextItem: {
      element?: string;
      record?: string;
      recordData?: Record;
    }) => {
      this.contextService.onContextChange(
        'element' in contextItem ? contextItem.element : contextItem.record,
        this.route,
        this.dashboard
      );
    };
    this.contextService.initContext(this.dashboard as Dashboard, callback);
  }

  /**
   * Gets the current URL fragment from router or document.
   *
   * @returns Fragment string or null
   */
  private getCurrentFragment(): string | null {
    const fragment = this.route.snapshot.fragment;
    if (fragment) {
      return fragment;
    }
    const hash = this.document.location.hash;
    if (hash && hash.length > 1) {
      return getFragmentFromHref(hash) ?? hash.slice(1);
    }
    return null;
  }

  /**
   * Tries to scroll to a pending fragment.
   */
  private tryScrollToFragment(): void {
    if (!this.pendingFragment) {
      return;
    }

    this.scheduleFragmentScroll();
  }

  /**
   * Schedules fragment scrolling until the target is found or attempts are exhausted.
   */
  private scheduleFragmentScroll(): void {
    if (!this.pendingFragment) {
      return;
    }

    const scrolled = scrollToFragment(this.pendingFragment, this.document, {
      behavior: 'auto',
    });

    if (scrolled) {
      this.pendingFragment = null;
      return;
    }

    if (this.fragmentScrollAttempts >= 20) {
      return;
    }

    this.fragmentScrollAttempts += 1;
    this.fragmentScrollTimeout = setTimeout(() => {
      this.scheduleFragmentScroll();
    }, 100);
  }

  /**
   * Resets fragment scrolling state between navigations.
   */
  private resetFragmentScrollState(): void {
    this.fragmentScrollAttempts = 0;
    this.pendingFragment = null;
    if (this.fragmentScrollTimeout) {
      clearTimeout(this.fragmentScrollTimeout);
    }
    this.resetNormalizeAnchorState();
  }

  /**
   * Resets anchor normalization retries.
   */
  private resetNormalizeAnchorState(): void {
    this.normalizeAnchorsAttempts = 0;
    if (this.normalizeAnchorsTimeout) {
      clearTimeout(this.normalizeAnchorsTimeout);
      this.normalizeAnchorsTimeout = undefined;
    }
  }

  /**
   * Schedules normalization of anchor hrefs for new-tab behavior.
   */
  private scheduleNormalizeAnchorHrefs(): void {
    if (this.normalizeAnchorsTimeout) {
      return;
    }
    this.normalizeAnchorsTimeout = setTimeout(() => {
      this.normalizeAnchorsTimeout = undefined;
      const didNormalize = this.normalizeAnchorHrefs();
      if (!didNormalize && this.normalizeAnchorsAttempts < 30) {
        this.normalizeAnchorsAttempts += 1;
        this.scheduleNormalizeAnchorHrefs();
      }
    }, 200);
  }

  /**
   * Normalizes hash-only anchors to full URLs for context menu actions.
   *
   * @returns True if anchors were found
   */
  private normalizeAnchorHrefs(): boolean {
    const container =
      this.document.getElementById('appPageContainer') || this.document.body;
    const anchors = container.querySelectorAll(
      'a[href^="#"], a[href^="%23"], a[href^="/%23"], a[href^="/#"]'
    );
    if (!anchors.length) {
      return false;
    }
    const baseUrl = this.router.url.split('#')[0].split('%23')[0];
    anchors.forEach((anchor) => {
      const href = anchor.getAttribute('href');
      if (!href) {
        return;
      }
      const fragment = getFragmentFromHref(href, this.document);
      if (!fragment) {
        return;
      }
      const encoded = fragment ? `#${encodeURIComponent(fragment)}` : '';
      const nextHref = `${baseUrl}${encoded}`;
      if (href !== nextHref) {
        anchor.setAttribute('href', nextHref);
      }
    });
    return true;
  }
}
