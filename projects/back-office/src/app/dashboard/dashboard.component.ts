import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Application, WhoSnackBarService } from '@who-ems/builder';
import { ApplicationService } from '../services/application.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {

  // === HEADER TITLE ===
  public title: string;
  public dashboardTitle = 'Back-office';

  // === AVAILABLE ROUTES, DEPENDS ON USER ===
  public navGroups = [];
  private dashboardNavGroups = [
    {
      name: 'Data management',
      navItems: [
        {
          name: 'Forms',
          path: '/forms',
          icon: 'poll',
        },
        {
          name: 'Resources',
          path: '/resources',
          icon: 'storage',
        }
      ]
    },
    {
      name: 'UI builder',
      navItems: [
        {
          name: 'My dashboards',
          path: '/dashboards',
          icon: 'dashboard',
        },
        {
          name: 'My applications',
          path: '/applications',
          icon: 'apps',
        }
      ]
    },
    {
      name: 'Administration',
      navItems: [
        {
          name: 'Users',
          path: '/settings/users',
          icon: 'supervisor_account'
        },
        {
          name: 'Roles',
          path: '/settings/roles',
          icon: 'admin_panel_settings'
        }
      ]
    }
  ];

  // === APPLICATION ===
  public application: Application;
  private applicationSubscription: Subscription;

  constructor(
    private applicationService: ApplicationService,
    private snackBar: WhoSnackBarService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.applicationSubscription = this.applicationService.application.subscribe((application: Application) => {
      if (application) {
        this.application = application;
        this.title = application.name;
        this.navGroups = [
          {
            name: 'Pages',
            navItems: [
              {
                name: 'Add a page',
                path: '/add-page',
                icon: 'add_circle',
                class: 'nav-item-add'
              }
            ].concat(application.pages.filter(x => x.content).map(x => {
              return {
                name: x.name,
                path: `/${x.type}/${x.content}`,
                icon: 'dashboard',
                class: null
              };
            }))
          },
          {
            name: 'Admnistration',
            navItems: [
              {
                name: 'Users',
                path: '/settings/users',
                icon: 'supervisor_account'
              },
              {
                name: 'Roles',
                path: '/settings/roles',
                icon: 'admin_panel_settings'
              }
            ]
          }
        ];
      } else {
        this.title = this.dashboardTitle;
        this.navGroups = this.dashboardNavGroups;
      }
    });
  }

  ngOnDestroy(): void {
    this.applicationSubscription.unsubscribe();
  }
}
