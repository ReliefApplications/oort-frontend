interface ConversionMap {
  [key: string]: {
    displayName: string;
    convertibleTypes: string[];
    confirmation: Object;
  };
}

export const conversionMap: ConversionMap = {
  text: {
    displayName: 'Text/Long Text/Month/Password/Range/Week',
    convertibleTypes: [
      'radiogroup',
      'checkbox',
      'dropdown',
      'boolean',
      'tagbox',
      'resource',
      'owner',
      'users',
    ],
    confirmation: { checkId: ['owner', 'users'], selectResource: ['resource'] },
  },
  radiogroup: {
    displayName: 'Radio Button Group',
    convertibleTypes: ['checkbox', 'dropdown', 'boolean', 'tagbox', 'text'],
    confirmation: {},
  },
  checkbox: {
    displayName: 'Checkboxes',
    convertibleTypes: ['radiogroup', 'dropdown', 'boolean', 'tagbox', 'text'],
    confirmation: { popArray: ['radiogroup', 'dropdown', 'text'] },
  },
  dropdown: {
    displayName: 'Dropdown',
    convertibleTypes: ['radiogroup', 'checkbox', 'boolean', 'tagbox', 'text'],
    confirmation: {},
  },
  boolean: {
    displayName: 'Yes/No (Boolean)',
    convertibleTypes: ['text'],
    confirmation: {},
  },
  file: {
    displayName: 'File Upload',
    convertibleTypes: ['boolean'],
    confirmation: {},
  },
  tagbox: {
    displayName: 'Multi-Select Dropdown',
    convertibleTypes: ['radiogroup', 'checkbox', 'dropdown', 'boolean', 'text'],
    confirmation: { popArray: ['radiogroup', 'dropdown', 'text'] },
  },
  multipletext: {
    displayName: 'Multiple Text',
    convertibleTypes: ['boolean'],
    confirmation: {},
  },
  matrix: {
    displayName: 'Single-Select Matrix',
    convertibleTypes: ['boolean'],
    confirmation: {},
  },
  matrixdropdown: {
    displayName: 'Multi-Select Matrix',
    convertibleTypes: [],
    confirmation: {},
  },
  matrixdynamic: {
    displayName: 'Dynamic Matrix',
    convertibleTypes: [],
    confirmation: {},
  },
  expression: {
    displayName: 'Expression (read-only)',
    convertibleTypes: ['boolean'],
    confirmation: {},
  },
  resource: {
    displayName: 'Resource',
    convertibleTypes: ['boolean', 'resources'],
    confirmation: {},
  },
  resources: {
    displayName: 'Resources',
    convertibleTypes: ['boolean', 'resource'],
    confirmation: { popArray: ['resource'] },
  },
  owner: {
    displayName: 'Owner',
    convertibleTypes: ['boolean'],
    confirmation: {},
  },
  users: {
    displayName: 'Users',
    convertibleTypes: ['boolean'],
    confirmation: {},
  },
  geospatial: {
    displayName: 'Geospatial',
    convertibleTypes: [],
    confirmation: {},
  },
  html: {
    displayName: 'HTML',
    convertibleTypes: [],
    confirmation: {},
  },
  image: {
    displayName: 'Image',
    convertibleTypes: [],
    confirmation: {},
  },
  color: {
    displayName: 'Color',
    convertibleTypes: [
      'radiogroup',
      'checkbox',
      'dropdown',
      'boolean',
      'tagbox',
    ],
    confirmation: {},
  },
  date: {
    displayName: 'Date',
    convertibleTypes: [
      'radiogroup',
      'checkbox',
      'dropdown',
      'boolean',
      'tagbox',
    ],
    confirmation: {},
  },
  'datetime-local': {
    displayName: 'Date and Time',
    convertibleTypes: [
      'radiogroup',
      'checkbox',
      'dropdown',
      'boolean',
      'tagbox',
    ],
    confirmation: {},
  },
  email: {
    displayName: 'Email',
    convertibleTypes: [
      'radiogroup',
      'checkbox',
      'dropdown',
      'boolean',
      'tagbox',
    ],
    confirmation: {},
  },
  numeric: {
    displayName: 'Number',
    convertibleTypes: [
      'radiogroup',
      'checkbox',
      'dropdown',
      'boolean',
      'tagbox',
    ],
    confirmation: {},
  },
  tel: {
    displayName: 'Phone Number',
    convertibleTypes: [
      'radiogroup',
      'checkbox',
      'dropdown',
      'boolean',
      'tagbox',
    ],
    confirmation: {},
  },
  time: {
    displayName: 'Time',
    convertibleTypes: [
      'radiogroup',
      'checkbox',
      'dropdown',
      'boolean',
      'tagbox',
    ],
    confirmation: {},
  },
  url: {
    displayName: 'URL',
    convertibleTypes: [
      'radiogroup',
      'checkbox',
      'dropdown',
      'boolean',
      'tagbox',
    ],
    confirmation: {},
  },
};
