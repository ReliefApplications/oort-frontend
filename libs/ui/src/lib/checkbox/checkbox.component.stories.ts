import { moduleMetadata, StoryFn, Meta } from '@storybook/angular';
import { CheckboxComponent } from './checkbox.component';
import { StorybookTranslateModule } from '../../storybook-translate.module';
import { CheckboxModule } from './checkbox.module';

export default {
  title: 'CheckboxComponent',
  component: CheckboxComponent,
  decorators: [
    moduleMetadata({
      imports: [CheckboxModule, StorybookTranslateModule],
    }),
  ],
} as Meta<CheckboxComponent>;

const Template: StoryFn<CheckboxComponent> = (args: CheckboxComponent) => ({
  props: args,
});

export const Primary = Template.bind({});
Primary.args = {
  checked: false,
  indeterminate: false,
  id: '',
  name: '',
  label: '',
  ariaLabel: '',
  description: '',
};