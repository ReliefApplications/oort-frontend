import { JsonMetadata, Serializer } from 'survey-core';

/**
 * Add support for custom properties to the survey
 *
 */
export const init = (): void => {
  const serializer: JsonMetadata = Serializer;

  const tooltipProp = {
    name: 'tooltip:text',
    category: 'general',
    isLocalizable: true,
  };

  // add tooltip property
  serializer.addProperty('question', tooltipProp);
  serializer.addProperty('panel', tooltipProp);
};
