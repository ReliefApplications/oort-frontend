import { gql } from 'apollo-angular';

/** Graphql query for generating records */
export const GENERATE_RECORDS = gql`
  mutation generateRecords($form: ID!, $data: JSON!) {
    generateRecords(form: $form, data: $data) {
      id
      createdAt
      modifiedAt
      data
    }
  }
`;

export const EDIT_RECORD = gql`
  mutation editRecord(
    $id: ID!
    $data: JSON
    $version: ID
    $template: ID
    $display: Boolean
  ) {
    editRecord(id: $id, data: $data, version: $version, template: $template) {
      id
      data(display: $display)
      createdAt
      modifiedAt
      createdBy {
        name
      }
    }
  }
`;
