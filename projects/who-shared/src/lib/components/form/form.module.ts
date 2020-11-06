import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WhoFormComponent } from './form.component';
import { MatDialogModule } from '@angular/material/dialog';

@NgModule({
  declarations: [WhoFormComponent],
  imports: [
    CommonModule,
    MatDialogModule
  ],
  exports: [WhoFormComponent]
})
export class WhoFormModule { }
