import { gql } from 'apollo-angular';

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

/** Query to fetch roles visible for user assignment in an application */
export const GET_ASSIGNABLE_ROLES = gql`
  query GetAssignableRoles(
    $application: ID!
    $forUserAssignment: Boolean
    $asRole: ID
  ) {
    roles(
      application: $application
      forUserAssignment: $forUserAssignment
      asRole: $asRole
    ) {
      id
      title
      application {
        id
        name
      }
    }
  }
`;
