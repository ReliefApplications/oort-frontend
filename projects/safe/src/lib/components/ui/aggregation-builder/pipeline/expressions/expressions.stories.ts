import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Meta, moduleMetadata, Story } from '@storybook/angular';
import { SafeExpressionsComponent } from './expressions.component';
import { SafePipelineModule } from '../pipeline.module';
import { StorybookTranslateModule } from '../../../../storybook-translate/storybook-translate-module';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Accumulators } from './operators';

export default {
  component: SafeExpressionsComponent,
  decorators: [
    moduleMetadata({
      imports: [
        SafePipelineModule,
        BrowserAnimationsModule,
        StorybookTranslateModule,
        ReactiveFormsModule,
      ],
      providers: [
        {
          provide: 'environment',
          useValue: {},
        },
      ],
    }),
  ],
  title: 'UI/Aggregation builder/Stages/Expressions',
  args: {
    currentForms: [],
    filteredForms: [],
  },
} as Meta;

const DEFAULT_FIELDS = [
  {
    name: 'date',
    args: [],
    type: {
      name: 'Date',
      kind: 'SCALAR',
      ofType: null,
    },
  },
  {
    name: 'description',
    args: [],
    type: {
      name: 'String',
      kind: 'SCALAR',
      ofType: null,
    },
  },
  {
    name: 'status',
    type: {
      name: 'String',
      kind: 'SCALAR',
      ofType: null,
    },
  },
];

const fb = new FormBuilder();

const TEMPLATE: Story<SafeExpressionsComponent> = (args) => ({
  template:
    '<safe-expressions [form]=form [fields]=fields [operators]=operators></safe-expressions>',
  props: {
    // Need to pass formGroup there otherwise we get an error: https://github.com/storybookjs/storybook/discussions/15602
    form: fb.group({
      operator: ['', Validators.required],
      field: ['', Validators.required],
    }),
    fields: DEFAULT_FIELDS,
    operators: Accumulators,
  },
});

export const DEFAULT = TEMPLATE.bind({});
DEFAULT.storyName = 'Default';
DEFAULT.args = {};