import { gql } from 'apollo-angular';

/** Graphql request for marking multiple notifications as seen */
export const SEE_NOTIFICATIONS = gql`
  mutation seeNotifications($ids: [ID]!) {
    seeNotifications(ids: $ids) {
      id
      action
      content
      redirect
      createdAt
      channel {
        id
        title
        application {
          id
        }
      }
      read
    }
  }
`;
