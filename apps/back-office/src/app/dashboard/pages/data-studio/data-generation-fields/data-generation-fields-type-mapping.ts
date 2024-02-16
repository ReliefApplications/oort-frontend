/** Interface for the data generation map */
interface DataGenerationMap {
  [key: string]: {
    displayName: string;
    source: string;
    options?: any[] | null;
  };
}

/** Data generation map */
export const dataGenerationMap: DataGenerationMap = {
  text: {
    displayName: 'Text/Long Text/Month/Password/Range/Week',
    source: ' ',
    options: [
      {
        action: 'sentence',
        desc: 'common.dataStudio.dataGeneration.map.sentence',
      },
      { action: 'month', desc: 'common.dataStudio.dataGeneration.map.month' },
      {
        action: 'password',
        desc: 'common.dataStudio.dataGeneration.map.password',
      },
      { action: 'range', desc: 'common.dataStudio.dataGeneration.map.range' },
      { action: 'week', desc: 'common.dataStudio.dataGeneration.map.week' },
    ],
  },
  radiogroup: {
    displayName: 'Radio Button Group',
    source: 'common.dataStudio.dataGeneration.map.radiogroup',
  },
  checkbox: {
    displayName: 'Checkboxes',
    source: 'common.dataStudio.dataGeneration.map.checkbox',
  },
  dropdown: {
    displayName: 'Dropdown',
    source: 'common.dataStudio.dataGeneration.map.dropdown',
  },
  boolean: {
    displayName: 'Yes/No (Boolean)',
    source: 'common.dataStudio.dataGeneration.map.boolean',
  },
  file: {
    displayName: 'File Upload',
    source: ' ',
  },
  tagbox: {
    displayName: 'Multi-Select Dropdown',
    source: 'common.dataStudio.dataGeneration.map.tagbox',
  },
  multipletext: {
    displayName: 'Multiple Text',
    source: 'common.dataStudio.dataGeneration.map.multipletext',
  },
  matrix: {
    displayName: 'Single-Select Matrix',
    source: 'common.dataStudio.dataGeneration.map.matrix',
  },
  matrixdropdown: {
    displayName: 'Multi-Select Matrix',
    source: 'common.dataStudio.dataGeneration.map.matrixdropdown',
  },
  matrixdynamic: {
    displayName: 'Dynamic Matrix',
    source: 'common.dataStudio.dataGeneration.map.matrixdynamic',
  },
  expression: {
    displayName: 'Expression (read-only)',
    source: 'common.dataStudio.dataGeneration.map.expression',
  },
  resource: {
    displayName: 'Resource',
    source: 'common.dataStudio.dataGeneration.map.resource',
  },
  resources: {
    displayName: 'Resources',
    source: 'common.dataStudio.dataGeneration.map.resources',
  },
  owner: {
    displayName: 'Owner',
    source: 'common.dataStudio.dataGeneration.map.owner',
  },
  users: {
    displayName: 'Users',
    source: 'common.dataStudio.dataGeneration.map.users',
  },
  geospatial: {
    displayName: 'Geospatial',
    source: 'common.dataStudio.dataGeneration.map.geospatial',
  },
  html: {
    displayName: 'HTML',
    source: ' ',
  },
  image: {
    displayName: 'Image',
    source: ' ',
  },
  color: {
    displayName: 'Color',
    source: 'common.dataStudio.dataGeneration.map.color',
  },
  date: {
    displayName: 'Date',
    source: 'common.dataStudio.dataGeneration.map.date',
  },
  'datetime-local': {
    displayName: 'Date and Time',
    source: 'common.dataStudio.dataGeneration.map.datetimelocal',
  },
  email: {
    displayName: 'Email',
    source: 'common.dataStudio.dataGeneration.map.email',
  },
  numeric: {
    displayName: 'Number',
    source: 'common.dataStudio.dataGeneration.map.numeric',
  },
  tel: {
    displayName: 'Phone Number',
    source: 'common.dataStudio.dataGeneration.map.tel',
  },
  time: {
    displayName: 'Time',
    source: 'common.dataStudio.dataGeneration.map.time',
  },
  url: {
    displayName: 'URL',
    source: 'common.dataStudio.dataGeneration.map.url',
  },
};
