import { gql } from 'apollo-angular';

/** Graphql request for getting pages */
export const GET_PAGES = gql`
  query GetPages($first: Int, $filter: JSON) {
    pages(first: $first, filter: $filter) {
      edges {
        node {
          id
          name
          type
          content
          canSee
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

export const GET_APPLICATION_PAGES = gql`
  query GetApplicationPages($id: ID!) {
    application(id: $id) {
      pages {
        id
        name
        type
        visible
        icon
      }
    }
  }
`; 