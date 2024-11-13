import { Apollo } from 'apollo-angular';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  Application,
  ApplicationService,
  ConfirmService,
  UnsubscribeComponent,
  DeleteApplicationMutationResponse,
  status,
  DownloadService,
  BlobType,
} from '@oort-front/shared';
import { Dialog } from '@angular/cdk/dialog';
import { DELETE_APPLICATION } from './graphql/mutations';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { takeUntil } from 'rxjs/operators';
import { CustomStyleComponent } from '../../../components/custom-style/custom-style.component';
import { SnackbarService, UILayoutService } from '@oort-front/ui';

/**
 * Application settings page component.
 */
@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent extends UnsubscribeComponent implements OnInit {
  /** Maximum file size */
  public MAX_FILE_SIZE_MB = 2;
  /** Allowed extensions */
  public extensions = '.png, .jpg, .jpeg';
  /** Application list */
  public applications = new Array<Application>();
  /** Application settings form */
  public settingsForm!: ReturnType<typeof this.createSettingsForm>;
  /** Status choices */
  public statusChoices = Object.values(status);
  /** Current application */
  public application?: Application;
  /** Current user */
  public user: any;
  /** Is application locked for edition */
  public locked: boolean | undefined = undefined;
  /** Is application locked for edition by current user */
  public lockedByUser: boolean | undefined = undefined;
  /** Logo in base 64 */
  public logoBase64: string | undefined;
  /** Logo loading */
  public loadingLogo = false;

  /**
   * Application settings page component.
   *
   * @param fb Angular form builder
   * @param apollo Apollo service
   * @param router Angular router
   * @param snackBar Shared snackbar service
   * @param applicationService Shared application service
   * @param confirmService Shared confirm service
   * @param dialog Dialog service
   * @param translate Angular translate service
   * @param layoutService UI layout service
   * @param downloadService Shared download service
   */
  constructor(
    private fb: FormBuilder,
    private apollo: Apollo,
    private router: Router,
    private snackBar: SnackbarService,
    private applicationService: ApplicationService,
    private confirmService: ConfirmService,
    public dialog: Dialog,
    private translate: TranslateService,
    private layoutService: UILayoutService,
    private downloadService: DownloadService
  ) {
    super();
  }

  ngOnInit(): void {
    this.applicationService.application$
      .pipe(takeUntil(this.destroy$))
      .subscribe((application: Application | null) => {
        if (application) {
          // Create the form only once, on settings component load
          if (application.id !== this.application?.id) {
            this.settingsForm = this.createSettingsForm(application);
          }
          this.application = application;
          this.locked = this.application?.locked;
          this.lockedByUser = this.application?.lockedByUser;
          // Reload logo if necessary
          if (!this.logoBase64) {
            this.loadingLogo = true;
            this.applicationService
              .getLogoBase64(this.application)
              .then((logo) => {
                this.logoBase64 = logo;
              })
              .finally(() => {
                this.loadingLogo = false;
              });
          }
        }
      });
  }

  /**
   * Create Settings form
   *
   * @param application Current application
   * @returns form group
   */
  private createSettingsForm(application: Application): FormGroup<any> {
    const form = this.fb.group({
      id: [{ value: application.id, disabled: true }],
      name: [application.name, Validators.required],
      sideMenu: [application.sideMenu],
      hideMenu: [
        { value: application.hideMenu, disabled: !application.sideMenu },
      ],
      description: [application.description],
      status: [application.status],
    });

    // Listen for changes on sideMenu and update hideMenu accordingly
    form.get('sideMenu')?.valueChanges.subscribe((sideMenuValue) => {
      const hideMenuControl = form.get('hideMenu');
      if (sideMenuValue) {
        hideMenuControl?.enable();
      } else {
        hideMenuControl?.disable();
      }
    });

    return form;
  }

  /**
   * Submit settings form.
   */
  onSubmit(): void {
    this.applicationService.editApplication(this.settingsForm?.value);
    this.settingsForm?.markAsPristine();
  }

  /**
   * Duplicate application.
   */
  async onDuplicate(): Promise<void> {
    if (this.locked && !this.lockedByUser) {
      this.snackBar.openSnackBar(
        this.translate.instant('common.notifications.objectLocked', {
          name: this.application?.name,
        })
      );
    } else {
      const { DuplicateApplicationModalComponent } = await import(
        '../../../components/duplicate-application-modal/duplicate-application-modal.component'
      );
      this.dialog.open(DuplicateApplicationModalComponent, {
        data: {
          id: this.application?.id,
          name: this.application?.name,
        },
      });
    }
  }

  /**
   * Delete application.
   * Prompt modal to confirm.
   */
  onDelete(): void {
    if (this.locked && !this.lockedByUser) {
      this.snackBar.openSnackBar(
        this.translate.instant('common.notifications.objectLocked', {
          name: this.application?.name,
        })
      );
    } else {
      const dialogRef = this.confirmService.openConfirmModal({
        title: this.translate.instant('common.deleteObject', {
          name: this.translate.instant('common.application.one'),
        }),
        content: this.translate.instant(
          'components.application.delete.confirmationMessage',
          { name: this.application?.name }
        ),
        confirmText: this.translate.instant('components.confirmModal.delete'),
        confirmVariant: 'danger',
      });
      dialogRef.closed
        .pipe(takeUntil(this.destroy$))
        .subscribe((value: any) => {
          if (value) {
            const id = this.application?.id;
            this.apollo
              .mutate<DeleteApplicationMutationResponse>({
                mutation: DELETE_APPLICATION,
                variables: {
                  id,
                },
              })
              .subscribe({
                next: ({ errors }) => {
                  if (errors) {
                    this.snackBar.openSnackBar(
                      this.translate.instant(
                        'common.notifications.objectNotDeleted',
                        {
                          value: this.translate.instant(
                            'common.application.one'
                          ),
                          error: errors ? errors[0].message : '',
                        }
                      ),
                      { error: true }
                    );
                  } else {
                    this.snackBar.openSnackBar(
                      this.translate.instant(
                        'common.notifications.objectDeleted',
                        {
                          value: this.translate.instant(
                            'common.application.one'
                          ),
                        }
                      )
                    );
                  }
                },
                error: (err) => {
                  this.snackBar.openSnackBar(err.message, { error: true });
                },
              });
            this.router.navigate(['/applications']);
          }
        });
    }
  }

  /** Opens right sidenav with custom css editor */
  onOpenStyle(): void {
    this.layoutService.setRightSidenav({
      component: CustomStyleComponent,
    });
    this.layoutService.closeRightSidenav = false;
  }

  /**
   * Edit the permissions layer.
   *
   * @param e permissions.
   */
  saveAccess(e: any): void {
    this.applicationService.editPermissions(e);
  }

  /**
   * Uploads a logo image.
   *
   * @param e Event of file upload.
   */
  async onUpload(e: any): Promise<void> {
    e.preventDefault();
    if (e.files.length > 0) {
      this.loadingLogo = true;
      const logo = e.files[0].rawFile;
      if (logo && this.application?.id) {
        await this.downloadService.uploadBlob(
          logo,
          BlobType.LOGO,
          this.application.id
        );
        this.applicationService.convertBlobToBase64(logo).then((base64) => {
          this.logoBase64 = base64;
          this.loadingLogo = false;
        });
      }
    }
  }

  /**
   * Deletes a logo image
   */
  onDeleteLogo(): void {
    const dialogRef = this.confirmService.openConfirmModal({
      title: this.translate.instant('common.deleteObject', {
        name: this.translate.instant('common.logo.one'),
      }),
      content: this.translate.instant(
        'components.logo.delete.confirmationMessage'
      ),
      confirmText: this.translate.instant('components.confirmModal.delete'),
      confirmVariant: 'danger',
    });
    dialogRef.closed.pipe(takeUntil(this.destroy$)).subscribe((value: any) => {
      if (value) {
        // Set the local logo to undefined
        this.logoBase64 = undefined;
        // Update the application service to remove the logo
        if (this.application) {
          this.applicationService.deleteApplicationLogo(this.application).then(
            () => {
              this.snackBar.openSnackBar(
                this.translate.instant('common.notifications.objectDeleted', {
                  value: this.translate.instant('common.logo.one'),
                })
              );
            },
            (err) => {
              this.snackBar.openSnackBar(err.message, { error: true });
            }
          );
        }
      }
    });
  }
}
