import { gql } from 'apollo-angular';

/** Get Roles query */
export const GET_ROLES = gql`
  query GetRoles($application: ID) {
    roles(application: $application) {
      id
      title
    }
  }
`;
