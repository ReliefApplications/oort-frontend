import { gql } from 'apollo-angular';

/** Graphql request for getting a record by its id */
export const GET_RECORD_BY_ID = gql`
  query GetRecordById($id: ID!) {
    record(id: $id) {
      id
      data
    }
  }
`;

/** Graphql request for getting resource layout */
export const GET_LAYOUT = gql`
  query GetLayout($resource: ID!, $id: ID) {
    resource(id: $resource) {
      layouts(ids: [$id]) {
        edges {
          node {
            id
            name
            query
            createdAt
            display
          }
        }
      }
      metadata {
        name
        type
      }
    }
  }
`;
