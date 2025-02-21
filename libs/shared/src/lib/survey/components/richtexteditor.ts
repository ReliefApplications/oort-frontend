import { ComponentCollection, SvgRegistry } from 'survey-core';
import { Question } from '../types';
import { DomService } from '../../services/dom/dom.service';
import { WIDGET_EDITOR_CONFIG } from '../../const/tinymce.const';
import { RichTextEditorComponent } from '../../components/rich-text-editor/rich-text-editor.component';

/**
 * Inits the rich text editor component.
 *
 * @param domService DOM service.
 * @param componentCollectionInstance ComponentCollection
 */
export const init = (
  domService: DomService,
  componentCollectionInstance: ComponentCollection
): void => {
  SvgRegistry.registerIconFromSvg(
    'richtexteditor',
    '<svg height=18px viewBox="108.4387 204.272 18.0003 18"width=18.0003px xmlns=http://www.w3.org/2000/svg><path d="M 109.046 219.852 L 125.84 219.852 C 126.169 219.852 126.439 220.123 126.439 220.457 L 126.439 221.667 C 126.439 221.999 126.169 222.272 125.84 222.272 L 109.046 222.272 C 108.717 222.272 108.446 221.999 108.446 221.667 L 108.446 220.457 C 108.446 220.123 108.717 219.852 109.046 219.852 Z"transform="matrix(1, 0, 0, 1, -7.105427357601002e-15, -2.842170943040401e-14)"/><path d="M 109.046 214.407 L 125.84 214.407 C 126.169 214.407 126.439 214.678 126.439 215.012 L 126.439 216.222 C 126.439 216.554 126.169 216.826 125.84 216.826 L 109.046 216.826 C 108.717 216.826 108.446 216.554 108.446 216.222 L 108.446 215.012 C 108.446 214.678 108.717 214.407 109.046 214.407 Z"transform="matrix(1, 0, 0, 1, -7.105427357601002e-15, -2.842170943040401e-14)"/><path d="M 119.721 208.962 L 125.84 208.962 C 126.169 208.962 126.439 209.233 126.439 209.566 L 126.439 210.776 C 126.439 211.109 126.169 211.381 125.84 211.381 L 119.721 211.381 C 119.392 211.381 119.122 211.109 119.122 210.776 L 119.122 209.566 C 119.122 209.233 119.392 208.962 119.721 208.962 Z"transform="matrix(1, 0, 0, 1, -7.105427357601002e-15, -2.842170943040401e-14)"/><path d="M 116.723 211.563 L 113.874 204.484 C 113.814 204.363 113.695 204.272 113.545 204.272 L 111.385 204.272 C 111.265 204.272 111.116 204.363 111.085 204.484 L 108.446 211.563 C 108.416 211.684 108.477 211.865 108.657 211.865 L 110.036 211.865 C 110.156 211.865 110.305 211.744 110.336 211.624 L 110.876 210.11 L 114.204 210.11 L 114.803 211.624 C 114.834 211.744 114.984 211.865 115.105 211.865 L 116.484 211.865 C 116.662 211.865 116.753 211.714 116.723 211.563 Z M 111.504 208.296 L 112.375 206.057 L 112.555 206.057 L 113.515 208.296 L 111.504 208.296 Z"transform="matrix(1, 0, 0, 1, -7.105427357601002e-15, -2.842170943040401e-14)"/></svg>'
  );

  const component = {
    name: 'richtext',
    title: 'Rich Text Editor',
    iconName: 'icon-richtexteditor',
    questionJSON: {
      name: 'richtext',
      type: 'text',
    },
    category: 'Custom Questions',
    onAfterRender: (question: Question, el: HTMLElement): void => {
      // hides the input element
      const element = el.getElementsByTagName('input')[0].parentElement;
      if (element) element.style.display = 'none';

      // render the EditorComponent
      const editor = domService.appendComponentToBody(
        RichTextEditorComponent,
        el
      );
      const instance = editor.instance as RichTextEditorComponent;
      // set the form control
      instance.config = WIDGET_EDITOR_CONFIG;
    },
  };
  componentCollectionInstance.add(component);
};
