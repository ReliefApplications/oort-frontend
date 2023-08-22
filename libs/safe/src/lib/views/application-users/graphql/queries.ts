import { gql } from 'apollo-angular';
import { User } from '../../../models/user.model';

/** Application users query */
export const GET_APPLICATION_USERS = gql`
  query GetApplicationUsers(
    $id: ID!
    $afterCursor: ID
    $first: Int
    $automated: Boolean
  ) {
    application(id: $id) {
      users(afterCursor: $afterCursor, first: $first, automated: $automated) {
        edges {
          node {
            id
            username
            name
            roles {
              id
              title
            }
            positionAttributes {
              value
            }
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

/** Interface of application users query response */
export interface GetApplicationUsersQueryResponse {
  application: {
    users: {
      edges: {
        node: User;
        cursor: string;
      }[];
      pageInfo: {
        endCursor: string;
        hasNextPage: boolean;
      };
      totalCount: number;
    };
  };
}

// === GET APPLICATION STATUS ===

/** Application status query */
export const GET_APPLICATION_STATUS = gql`
  query GetApplicationStatus($id: ID!) {
    application(id: $id) {
      id
      status
    }
  }
`;

/** Interface of application status query response */
export interface GetApplicationStatusQueryResponse {
  application: {
    id: string;
    status: string;
  };
}
