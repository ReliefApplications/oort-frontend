import { gql } from 'apollo-angular';

/** Graphql query for getting a resource by its id */
export const GET_RESOURCE_BY_ID = gql`
  query GetResourceById($id: ID!) {
    resource(id: $id) {
      id
      name
      queryName
      createdAt
      fields
      forms {
        id
        name
        core
      }
      canUpdate
    }
  }
`;

/** Get API configuration gl query */
export const GET_API_CONFIGURATION = gql`
  query GetApiConfiguration($id: ID!) {
    apiConfiguration(id: $id) {
      id
      name
      authType
      graphQLEndpoint
    }
  }
`;

// === GET API CONFGIURATIONS NAME ===
/** API configuration names query */
export const GET_API_CONFIGURATIONS_NAMES = gql`
  query GetApiConfigurationsName($first: Int, $afterCursor: ID, $filter: JSON) {
    apiConfigurations(
      first: $first
      afterCursor: $afterCursor
      filter: $filter
    ) {
      edges {
        node {
          id
          name
        }
        cursor
      }
      totalCount
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/** Kobotoolbox forms names and if, retrieved from the selected API Configuration */
export const KOBO_FORMS_FROM_API_CONFIGURATION = gql`
  query GetKoboFormsFromAPIConfiguration($apiConfiguration: ID!) {
    koboFormsFromAPIConfiguration(apiConfiguration: $apiConfiguration) {
      title
      id
    }
  }
`;
