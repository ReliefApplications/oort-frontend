import { gql } from 'apollo-angular';

/** Graphql query for generating records */
export const GENERATE_RECORDS = gql`
  mutation generateRecords($form: ID!, $data: JSON!) {
    generateRecords(form: $form, data: $data) {
      id
      createdAt
      modifiedAt
    }
  }
`;
