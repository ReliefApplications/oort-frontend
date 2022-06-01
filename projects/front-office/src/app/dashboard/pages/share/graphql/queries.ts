import { gql } from 'apollo-angular';
import { Dashboard } from '@safe/builder';

// === GET URL NEEDED INFO FROM AN SPECIFIC DASHBOARD ID ===
export const GET_SHARE_DASHBOARD_BY_ID = gql`
  query GetDashboardById($id: ID!) {
    dashboard(id: $id) {
      id
      page {
        application {
          id
        }
      }
      step {
        workflow {
          id
          page {
            application {
              id
            }
          }
        }
      }
    }
  }
`;

export interface GetShareDashboardByIdQueryResponse {
  loading: boolean;
  dashboard: Dashboard;
}
