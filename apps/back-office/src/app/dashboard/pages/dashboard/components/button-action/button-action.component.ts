import { Component, Input } from '@angular/core';
import { ButtonActionT } from '../edit-button-action/edit-button-action.component';
import { Dashboard, SafeDashboardService } from '@oort-front/safe';
import { TranslateService } from '@ngx-translate/core';
import { Dialog } from '@angular/cdk/dialog';
import { DataTemplateService } from 'libs/safe/src/lib/services/data-template/data-template.service';

@Component({
  selector: 'app-button-action',
  templateUrl: './button-action.component.html',
  styleUrls: ['./button-action.component.scss'],
})
export class ButtonActionComponent {
  @Input() buttonActions: (ButtonActionT & { isHovered: boolean })[] = [];
  @Input() dashboard?: Dashboard; 

  constructor (
    private translateService: TranslateService,
    private dashboardService: SafeDashboardService,
    public dialog: Dialog,
    private dataTemplateService: DataTemplateService
  ) {};
  
  /**
   * Opens link of button action.
   *
   * @param button Button action to be executed
   */
  public onButtonActionClick(button: ButtonActionT) {
    if (button.href) {
      //regex to verify if it's a page id key
      const regex = /{{page\((.*?)\)}}/;
      const match = button.href.match(regex);
      if (match) {
        button.href = this.dataTemplateService.getButtonLink(match[1]);
      }
      if (button.openInNewTab) window.open(button.href, '_blank');
      else window.location.href = button.href;
    }
  }

    /**
   * Removes button action from the dashboard.
   *
   * @param idx Index of button action to be removed
   */
    public async onDeleteButtonAction(idx: number) {
      const { SafeConfirmModalComponent } = await import('@oort-front/safe');
      const dialogRef = this.dialog.open(SafeConfirmModalComponent, {
        data: {
          title: this.translateService.instant('common.deleteObject', {
            name: this.translateService.instant(
              'models.dashboard.buttonActions.one'
            ),
          }),
          content: this.translateService.instant(
            'models.dashboard.buttonActions.confirmDelete'
          ),
          confirmText: this.translateService.instant(
            'components.confirmModal.delete'
          ),
          cancelText: this.translateService.instant(
            'components.confirmModal.cancel'
          ),
          confirmVariant: 'danger',
        },
      });
  
      dialogRef.closed.subscribe((value: any) => {
        if (value) {
          const currButtons = this.dashboard?.buttons || [];
          currButtons.splice(idx, 1);
          this.dashboardService.saveDashboardButtons(currButtons);
          this.buttonActions.splice(idx, 1);
        }
      });
    }
}
