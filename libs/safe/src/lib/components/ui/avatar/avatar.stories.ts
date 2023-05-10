import { Meta, moduleMetadata, StoryFn } from '@storybook/angular';
import { SafeAvatarModule } from './avatar.module';
import { SafeAvatarComponent } from './avatar.component';
import { AvatarSize } from './avatar-size.enum';
import { AvatarVariant } from './avatar-variant.enum';

export default {
  component: SafeAvatarComponent,
  decorators: [
    moduleMetadata({
      imports: [SafeAvatarModule],
    }),
  ],
  title: 'UI/Avatar',
  argTypes: {
    size: {
      options: [AvatarSize.SMALL, AvatarSize.MEDIUM],
      control: { type: 'select' },
    },
    variant: {
      options: [
        AvatarVariant.DEFAULT,
        AvatarVariant.PRIMARY,
        AvatarVariant.SUCCESS,
        AvatarVariant.DANGER,
        AvatarVariant.WARNING,
      ],
      control: { type: 'select' },
    },
    icon: {
      defaultValue: '',
      control: { type: 'text' },
    },
    content: {
      defaultValue: 'P',
      control: { type: 'text' },
    },
  },
} as Meta;

/**
 * Template used by storybook to display the component in stories.
 *
 * @param args story arguments
 * @returns story template
 */
const TEMPLATE_WITH_TEXT: StoryFn<SafeAvatarComponent> = (args) => ({
  template: '<safe-avatar [icon]="icon">{{content}}</safe-avatar>',
  props: {
    ...args,
  },
});

/**
 * Default story.
 */
export const DEFAULT = {
  render: TEMPLATE_WITH_TEXT,
  name: 'Default',

  args: {
    size: AvatarSize.MEDIUM,
    variant: AvatarVariant.DEFAULT,
  },
};

/**
 * With icon story.
 */
export const ICON = {
  render: TEMPLATE_WITH_TEXT,
  name: 'With icon',

  args: {
    ...DEFAULT.args,
    icon: 'home',
  },
};
