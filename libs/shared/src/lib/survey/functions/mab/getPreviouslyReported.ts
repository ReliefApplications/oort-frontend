import { GlobalOptions } from '../types';
import { gql } from 'apollo-angular';
import { QuestionPanelDynamicModel, SurveyModel } from 'survey-core';
import { firstValueFrom } from 'rxjs';
import { Resource } from '../../../models/resource.model';

/** ID for the fillable from resource */
const FILLABLE_FORM_RESOURCE = '6790800dc802f229e9128bb0';

/** GraphQL query to fetch previous forms answers */
const PREVIOUS_FORMS_QUERY = gql`
  query GetPreviousForms($id: ID!, $filter: JSON) {
    resource(id: $id) {
      id
      name
      createdAt
      records(filter: $filter, first: 1000) {
        edges {
          node {
            id
            data
            form {
              structure
              name
            }
          }
        }
      }
    }
  }
`;

/**
 *  Generator for the custom function getPreviouslyReported.
 *
 * @param options Global options
 * @returns The custom function getPreviouslyReported
 */
export default (options: GlobalOptions) => {
  const { apollo } = options;

  /**
   * Custom function that gets the number of complaints per type
   * linked an enterprise, using its list of linked complaints.
   *
   * @param this Self
   * @param this.survey Survey instance
   * @param this.question Question instance
   * @param this.returnResult Function to return the result
   * @param params [complaints question]
   * @returns Matching enterprise names
   */
  return async function getPreviouslyReported(
    this: {
      survey: SurveyModel;
      question: QuestionPanelDynamicModel;
      returnResult: (value: any) => void;
    },
    params: any[]
  ) {
    const question = this.question;
    const pageToPopulate = params[0];
    const brID = this.survey.getQuestionByName('biosphere')?.value;

    if (
      !pageToPopulate ||
      !brID ||
      this.question.value?.[0].biosphere === brID
    ) {
      return this.returnResult(this.question.value);
    }

    const res = await firstValueFrom(
      apollo.query<{ resource: Pick<Resource, 'records'> }>({
        query: PREVIOUS_FORMS_QUERY,
        variables: {
          id: FILLABLE_FORM_RESOURCE,
          filter: {
            logic: 'or',
            filters: [
              {
                field: 'biosphere',
                operator: 'eq',
                value: brID,
              },
              {
                field: '__ID__',
                operator: 'eq',
                value: brID,
              },
            ],
          },
        },
      })
    );
    const records = res.data.resource.records?.edges.map((x) => x.node) ?? [];

    const updateElements = (idx = 0) => {
      const structure = JSON.parse(records[idx].form?.structure ?? '{}');
      const elements =
        structure.pages?.find((p: any) => p.name === pageToPopulate)
          ?.elements ?? [];

      this.question.fromJSON({
        ...question.toJSON(),
        templateElements: elements,
      });
    };

    updateElements();

    this.survey.setVariable('__PREVIOUS_FORMS_LOADED__', true);

    this.returnResult(
      records.map((r) => ({
        ...r.data,
        form_name: r.form?.name,
        form_year: r.data.year_approved,
      }))
    );
  };
};
