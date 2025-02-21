import { Component, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EMAIL_EDITOR_CONFIG } from '../../const/tinymce.const';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { EditorModule, TINYMCE_SCRIPT_SRC } from '@tinymce/tinymce-angular';
import { EditorService } from '../../services/editor/editor.service';
import { FormControlComponent } from '@oort-front/ui';

/** Wrapper for the rich text editor component */
@Component({
  selector: 'shared-rich-text-editor',
  standalone: true,
  imports: [CommonModule, EditorModule, FormsModule, ReactiveFormsModule],
  templateUrl: './rich-text-editor.component.html',
  providers: [
    { provide: TINYMCE_SCRIPT_SRC, useValue: 'tinymce/tinymce.min.js' },
    {
      provide: FormControlComponent,
      useExisting: forwardRef(() => RichTextEditorComponent),
    },
  ],
})
export class RichTextEditorComponent {
  /** Editor configuration */
  public config = EMAIL_EDITOR_CONFIG;
  /** Form control */
  public group = new FormGroup({
    text: new FormControl(''),
  });

  /**
   * Wrapper for the rich text editor component to be used in the form builder
   *
   * @param fb Angular form builder service
   * @param editorService Editor service used to get main URL and current language
   */
  constructor(private fb: FormBuilder, private editorService: EditorService) {
    this.config.base_url = this.editorService.url;
    this.config.language = this.editorService.language;
  }
}
