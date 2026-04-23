import { gql } from 'apollo-angular';

/** Graphql query for getting roles the current user can assign */
export const GET_ASSIGNABLE_ROLES = gql`
  query GetAssignableRoles($application: ID) {
    assignableRoles(application: $application) {
      id
      title
    }
  }
`;

/** Application users query */
export const GET_APPLICATION_USERS = gql`
  query GetApplicationUsers(
    $id: ID!
    $afterCursor: ID
    $first: Int
    $automated: Boolean
    $filter: JSON
  ) {
    application(id: $id) {
      users(
        afterCursor: $afterCursor
        first: $first
        automated: $automated
        filter: $filter
      ) {
        edges {
          node {
            id
            username
            name
            roles {
              id
              title
            }
            attributes
            oid
          }
          cursor
        }
        pageInfo {
          endCursor
          hasNextPage
        }
        totalCount
      }
    }
  }
`;
