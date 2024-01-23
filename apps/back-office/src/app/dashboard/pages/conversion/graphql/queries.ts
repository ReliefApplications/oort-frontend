import { gql } from 'apollo-angular';

/** GraphQL resource fields for role summary */
export const RESOURCE_FIELDS = gql`
  fragment ResourceFields on Resource {
    id
    name
    metadata {
      name
      type
      editor
      filter
      multiSelect
      options
      fields {
        name
        type
        editor
        filter
        multiSelect
        options
      }
      usedIn
    }
    fields
  }
`;

/** GraphQL short resource fields for role summary */
export const SHORT_RESOURCE_FIELDS = gql`
  fragment ShortResourceFields on Resource {
    id
    name
    fields
  }
`;

/** Graphql query for getting resources with a filter and more data */
export const GET_RESOURCES = gql`
  query GetResources(
    $first: Int
    $afterCursor: ID
    $filter: JSON
    $sortField: String
    $sortOrder: String
  ) {
    resources(
      first: $first
      afterCursor: $afterCursor
      filter: $filter
      sortField: $sortField
      sortOrder: $sortOrder
    ) {
      edges {
        node {
          ...ShortResourceFields
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
  ${SHORT_RESOURCE_FIELDS}
`;

/** GraphQL query to get a single resource */
export const GET_RESOURCE = gql`
  query GetResources($id: ID!) {
    resource(id: $id) {
      forms {
        id
        name
      }
      ...ResourceFields
    }
  }
  ${RESOURCE_FIELDS}
`;
