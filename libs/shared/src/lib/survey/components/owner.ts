import { Apollo } from 'apollo-angular';
import { ComponentCollection, Serializer, SvgRegistry } from 'survey-core';
import { CustomPropertyGridComponentTypes } from './utils/components.enum';
import { registerCustomPropertyEditor } from './utils/component-register';
import { GET_ROLES_FROM_APPLICATIONS } from '../graphql/queries';
import { QuestionOwner } from '../types';
import { RolesFromApplicationsQueryResponse } from '../../models/user.model';

/**
 * Inits the owner component.
 *
 * @param apollo Apollo client.
 * @param componentCollectionInstance ComponentCollection
 */
export const init = (
  apollo: Apollo,
  componentCollectionInstance: ComponentCollection
): void => {
  // registers icon-owner in the SurveyJS library
  SvgRegistry.registerIconFromSvg(
    'owner',
    '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 20 20" height="18px" viewBox="0 0 20 20" width="18px"><g><rect fill="none" height="20" width="20" x="0"/></g><g><path d="M17.5,8.5h-6.75C10.11,6.48,8.24,5,6,5c-2.76,0-5,2.24-5,5s2.24,5,5,5c2.24,0,4.11-1.48,4.75-3.5h0.75L13,13l1.5-1.5L16,13 l3-3L17.5,8.5z M6,12.5c-1.38,0-2.5-1.12-2.5-2.5S4.62,7.5,6,7.5S8.5,8.62,8.5,10S7.38,12.5,6,12.5z"/></g></svg>'
  );

  const component = {
    name: 'owner',
    title: 'Owner',
    iconName: 'icon-owner',
    category: 'Custom Questions',
    questionJSON: {
      name: 'owner',
      type: 'tagbox',
      optionsCaption: 'Select roles...',
      choicesOrder: 'asc',
      choices: [] as any[],
    },
    onInit: (): void => {
      Serializer.addProperty('owner', {
        name: 'applications',
        category: 'Owner properties',
        type: CustomPropertyGridComponentTypes.applicationsDropdown,
        // isDynamicChoices: true,
        visibleIndex: 3,
        isRequired: true,
      });

      registerCustomPropertyEditor(
        CustomPropertyGridComponentTypes.applicationsDropdown
      );
    },
    onLoaded: (question: QuestionOwner): void => {
      apollo
        .query<RolesFromApplicationsQueryResponse>({
          query: GET_ROLES_FROM_APPLICATIONS,
          variables: {
            applications: question.applications,
          },
        })
        .subscribe(({ data }) => {
          if (data.rolesFromApplications) {
            const roles = [];
            for (const role of data.rolesFromApplications) {
              roles.push({ value: role.id, text: role.title });
            }
            question.contentQuestion.choices = roles;
          }
        });
    },
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    onAfterRender: (): void => {},
  };

  componentCollectionInstance.add(component);
};
