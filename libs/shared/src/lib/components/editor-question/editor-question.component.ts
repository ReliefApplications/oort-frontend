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
      this.wordCount = this.getWordCount();
      const content = this.editor.editor.editor.getContent();
      this.html.next(content);
    });
  }

  /**
   * Get word count
   *
   * @returns number of words
   */
  public getWordCount(): number {
    return this.editor?.editor.editor.plugins.wordcount.getCount() || 0;
  }
}
