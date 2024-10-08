import { gql } from 'apollo-angular';

// === GET ROLES FROM APPLICATION ===

/** Graphql request for getting roles of applications by the application ids */
export const GET_ROLES_FROM_APPLICATIONS = gql`
  query GetRolesFromApplications($applications: [ID]!) {
    rolesFromApplications(applications: $applications) {
      id
      title(appendApplicationName: true)
    }
  }
`;

/** Gets roles for a single application */
export const GET_ROLES_FROM_APPLICATION = gql`
  query GetRolesFromApplication($application: ID!) {
    rolesFromApplications(applications: [$application]) {
      id
      title
    }
  }
`;

/** Graphql request for getting data of a resource by its id */
export const GET_RESOURCE_BY_ID = gql`
  query GetResourceById($id: ID!, $filter: JSON, $display: Boolean) {
    resource(id: $id) {
      id
      name
      createdAt
      records(filter: $filter) {
        edges {
          node {
            id
            data(display: $display)
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
  }
`;

/**
 * Get short resource graphql query definition
 *
 * @param graphQlIdentifier GraphQL identifier
 * @returns GraphQL query
 */
export const GET_SHORT_RESOURCE_BY_ID = (graphQlIdentifier: string) => gql`
  query ${graphQlIdentifier}_GetShortResourceById($id: ID!) {
    resource(id: $id) {
      id
      name
      createdAt
      fields
      forms {
        id
        name
        status
        createdAt
        recordsCount
        core
        canUpdate
        canDelete
      }
    }
  }
`;

/**
 * Get resource name
 *
 * @param graphQlIdentifier Graphql identifier
 * @returns Graphql query
 */
export const GET_RESOURCE_NAME = (graphQlIdentifier: string) => gql`
query ${graphQlIdentifier}_GetShortResourceById($id: ID!) {
  resource(id: $id) {
    id
    name
  }
}`;

/** Graphql request for updating a record */
export const UPDATE_RECORD = gql`
  mutation AutoSaveResourcesValue($id: ID!, $data: JSON!) {
    editRecord(id: $id, data: $data) {
      id
      data
    }
  }
`;

/** Graphql request for getting a record by its id */
export const GET_RECORD_BY_ID = gql`
  query GetRecordById($id: ID!) {
    record(id: $id) {
      id
      incrementalId
      data
    }
  }
`;
