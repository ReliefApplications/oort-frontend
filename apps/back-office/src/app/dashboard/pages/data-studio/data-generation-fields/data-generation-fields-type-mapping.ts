interface DataGenerationMap {
  [key: string]: {
    displayName: string;
    source: string;
    options?: any[] | null;
  };
}

export const dataGenerationMap: DataGenerationMap = {
  text: {
    displayName: 'Text/Long Text/Month/Password/Range/Week',
    source: '',
    options: [
      { action: 'sentence', desc: 'Random sentence' },
      { action: 'month', desc: 'Random month' },
      { action: 'password', desc: 'Random password' },
      { action: 'range', desc: 'Random range (0 to 100)' },
      { action: 'week', desc: 'Random week' },
    ],
  },
  radiogroup: {
    displayName: 'Radio Button Group',
    source: 'Random choice of question choices',
  },
  checkbox: {
    displayName: 'Checkboxes',
    source: 'Random choice of question choices',
  },
  dropdown: {
    displayName: 'Dropdown',
    source: 'Random choice of question choices',
  },
  boolean: {
    displayName: 'Yes/No (Boolean)',
    source: 'Randomly true or false',
  },
  file: {
    displayName: 'File Upload',
    source: '',
  },
  tagbox: {
    displayName: 'Multi-Select Dropdown',
    source: 'Random choice of question choices',
  },
  multipletext: {
    displayName: 'Multiple Text',
    source: 'Random line for each text field',
  },
  matrix: {
    displayName: 'Single-Select Matrix',
    source: 'Random selection for each row',
  },
  matrixdropdown: {
    displayName: 'Multi-Select Matrix',
    source: 'Random generation for each column type for each row',
  },
  matrixdynamic: {
    displayName: 'Dynamic Matrix',
    source: 'Random generation for each column type for each row',
  },
  expression: {
    displayName: 'Expression (read-only)',
    source: '',
  },
  resource: {
    displayName: 'Resource',
    source: 'Random record from the resource',
  },
  resources: {
    displayName: 'Resources',
    source: 'Random records from the resource',
  },
  owner: {
    displayName: 'Owner',
    source: 'Random roles',
  },
  users: {
    displayName: 'Users',
    source: 'Random users',
  },
  geospatial: {
    displayName: 'Geospatial',
    source: 'Random location',
  },
  html: {
    displayName: 'HTML',
    source: '',
  },
  image: {
    displayName: 'Image',
    source: '',
  },
  color: {
    displayName: 'Color',
    source: 'Random color',
  },
  date: {
    displayName: 'Date',
    source: 'Random date',
  },
  'datetime-local': {
    displayName: 'Date and Time',
    source: 'Random date and time',
  },
  email: {
    displayName: 'Email',
    source: 'Random email',
  },
  numeric: {
    displayName: 'Number',
    source: 'Random number',
  },
  tel: {
    displayName: 'Phone Number',
    source: 'Random phone number',
  },
  time: {
    displayName: 'Time',
    source: 'Random time',
  },
  url: {
    displayName: 'URL',
    source: 'Random URL',
  },
};
