import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorControlComponent } from '../controls/public-api';
import { BehaviorSubject } from 'rxjs';
import { RawEditorOptions } from 'tinymce';

/**  */
@Component({
  selector: 'app-editor-question',
  standalone: true,
  imports: [EditorControlComponent, CommonModule],
  templateUrl: './editor-question.component.html',
  styleUrls: ['./editor-question.component.scss'],
})
export class EditorQuestionComponent implements AfterViewInit {
  /** Is readonly */
  @Input() readonly = false;
  /** max words limit */
  @Input() maxWords = -1;
  /** configuration of the editor */
  @Input() config!: RawEditorOptions;
  /** editor */
  @ViewChild(EditorControlComponent)
  public editor!: EditorControlComponent;
  /** html content */
  public html = new BehaviorSubject<string | undefined>(undefined);
  /** word count*/
  public wordCount = 0;
  /** editor loaded */
  public editorLoaded = new EventEmitter<boolean>();

  /**
   * Editor question component
   *
   * @param cdr Angular change detector ref
   */
  constructor(public cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    this.editor.registerOnChange(() => {
      const content = this.editor.editor.editor.getContent();
      this.html.next(content);
      if (this.maxWords > 0) {
        let text = content.replace(
          /<\/?(div|p|li|ul|ol|br|h[1-6]|table|tr|td|th|pre|blockquote)[^>]*>/gi,
          ' '
        );
        text = text.replace(/<[^>]+>/g, '');
        text = text.replace(/&nbsp;/g, ' ');
        this.wordCount = text.trim()
          ? text
              .trim()
              .split(/\s+/)
              .filter((w) => w.length > 0).length
          : 0;
      }
    });
  }
}
