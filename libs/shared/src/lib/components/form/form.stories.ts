import {
  Meta,
  StoryObj,
  applicationConfig,
  moduleMetadata,
} from '@storybook/angular';
import { FormComponent } from './form.component';
import { FormModule } from './form.module';
import { DialogModule } from '@angular/cdk/dialog';
import { ApolloModule } from 'apollo-angular';
import { StorybookTranslateModule } from '../storybook-translate/storybook-translate-module';
import { importProvidersFrom } from '@angular/core';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { AuthService } from '../../services/auth/auth.service';
import { BehaviorSubject } from 'rxjs';

// You can create new stories getting the logic from: https://surveyjs.io/create-free-survey

/**
 * Mocked auth service
 */
class MockAuthService {
  userValue = {
    name: 'Mocked',
  };

  user = new BehaviorSubject({
    name: 'Dummy',
    firstName: 'Dummy',
    lastName: 'Dummy',
    email: 'dummy@mail.com',
    roles: [],
    id: 'dummyid',
  });
}

export default {
  title: 'Form/Examples',
  tags: ['autodocs'],
  component: FormComponent,
  decorators: [
    applicationConfig({
      providers: [
        importProvidersFrom(DialogModule),
        importProvidersFrom(BrowserAnimationsModule),
        importProvidersFrom(StorybookTranslateModule),
        importProvidersFrom(ApolloModule),
        {
          provide: 'environment',
          useValue: {},
        },
        {
          provide: AuthService,
          useValue: new MockAuthService(),
        },
      ],
    }),
    moduleMetadata({
      imports: [FormModule],
    }),
  ],
} as Meta<FormComponent>;

type Story = StoryObj<FormComponent>;

/**
 * Shared form data
 */
const sharedForm = {
  id: 'dummy',
  canCreateRecords: true,
};

/**
 * Default inputs Radio
 */
export const Radio: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'radiogroup',
                  name: 'question1',
                  title: 'Radio question',
                  choices: ['Item 1', 'Item 2', 'Item 3'],
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};

/**
 * Default inputs YesNo
 */
export const YesNo: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'boolean',
                  name: 'question1',
                  title: 'Yes/No',
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};

/**
 * Default inputs Checkbox
 */
export const Checkbox: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'checkbox',
                  name: 'question1',
                  title: 'Checkbox',
                  choices: ['Item 1', 'Item 2', 'Item 3'],
                  showOtherItem: true,
                  showNoneItem: true,
                  showSelectAllItem: true,
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};

/**
 * Default inputs Date
 */
export const Date: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'text',
                  name: 'question1',
                  title: 'Date',
                  inputType: 'date',
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};

/**
 * Default inputs Color
 */
export const Color: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'text',
                  name: 'question1',
                  title: 'Color',
                  inputType: 'color',
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
/**
 * Default inputs Color
 */
export const DateTime: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'text',
                  name: 'question1',
                  title: 'Date and Time',
                  inputType: 'datetime-local',
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
/**
 * Default inputs Month
 */
export const Month: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'text',
                  name: 'question1',
                  title: 'Month',
                  inputType: 'month',
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
/**
 * Default inputs Number
 */
export const Number: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'text',
                  title: 'Number',
                  inputType: 'number',
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
/**
 * Default inputs Password
 */
export const Password: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'text',
                  title: 'Password',
                  inputType: 'password',
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
/**
 * Default inputs Range
 */
export const Range: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'text',
                  title: 'Range',
                  inputType: 'range',
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
/**
 * Default inputs Telephone
 */
export const Telephone: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'text',
                  title: 'Telephone',
                  inputType: 'tel',
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
/**
 * Default inputs Text
 */
export const Text: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'text',
                  title: 'Text',
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
/**
 * Default inputs Time
 */
export const Time: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'text',
                  title: 'Time',
                  inputType: 'time',
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
/**
 * Default inputs URL
 */
export const URL: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'text',
                  title: 'URL',
                  inputType: 'url',
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
/**
 * Default inputs Week
 */
export const Week: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'text',
                  title: 'Week',
                  inputType: 'week',
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
/**
 * Default inputs SingleSelectMatrix
 */
export const SingleSelectMatrix: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'matrix',
                  name: 'Single-Select Matrix',
                  columns: ['Column 1', 'Column 2', 'Column 3'],
                  rows: ['Row 1', 'Row 2'],
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};

/**
 * Default inputs MultiSelectMatrix
 */
export const MultiSelectMatrix: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'matrixdropdown',
                  name: 'question1',
                  columns: [
                    {
                      name: 'Column 1',
                    },
                    {
                      name: 'Column 2',
                    },
                    {
                      name: 'Column 3',
                    },
                  ],
                  choices: [1, 2, 3, 4, 5],
                  rows: ['Row 1', 'Row 2'],
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
/**
 * Default inputs DinamicMatrix
 */
export const DinamicMatrix: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'matrixdynamic',
                  name: 'question1',
                  columns: [
                    {
                      name: 'Column 1',
                    },
                    {
                      name: 'Column 2',
                    },
                    {
                      name: 'Column 3',
                    },
                  ],
                  choices: [1, 2, 3, 4, 5],
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
/**
 * Default inputs RatingScale
 */
export const RatingScale: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'rating',
                  title: 'Rating Scale',
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
/**
 * Default inputs CheckBox
 */
export const CheckBox: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'checkbox',
                  title: 'CheckBox',
                  choices: ['Item 1', 'Item 2', 'Item 3'],
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
/**
 * Default inputs MultiSelectDropdown
 */
export const MultiSelectDropdown: Story = {
  render: () => ({
    props: {
      form: {
        ...sharedForm,
        structure: JSON.stringify({
          pages: [
            {
              name: 'page1',
              elements: [
                {
                  type: 'tagbox',
                  title: 'Multi-Select Dropdown',
                  choices: ['Item 1', 'Item 2', 'Item 3'],
                },
              ],
            },
          ],
          showQuestionNumbers: 'off',
        }),
      },
    },
  }),
};
