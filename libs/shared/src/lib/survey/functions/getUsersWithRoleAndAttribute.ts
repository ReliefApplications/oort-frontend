import { gql } from '@apollo/client';
import { GlobalOptions } from './types';
import { firstValueFrom } from 'rxjs';
import { UsersNodeQueryResponse } from '../../models/user.model';

/** GraphQL query to fetch previous forms answers */
const USERS_QUERY = gql`
  query GetUsers($filter: JSON) {
    users(filter: $filter) {
      edges {
        node {
          id
        }
        cursor
      }
    }
  }
`;

/**
 *  Generator for the custom function createdBy.
 *
 * @param options Global options
 * @returns The custom function createdBy
 */
export default (options: GlobalOptions) => {
  const { apollo } = options;

  return async function getUsersWithRoleAndAttribute(
    this: {
      returnResult: (value: string[] | null) => void;
    },
    params: any[]
  ) {
    const [role, attribute, value] = params;
    const filter = {
      logic: 'and',
      filters: [
        {
          field: 'roles',
          operator: 'contains',
          value: role,
        },
        { field: `attributes.${attribute}`, operator: 'eq', value },
      ],
    };

    const res = await firstValueFrom(
      apollo.query<UsersNodeQueryResponse>({
        query: USERS_QUERY,
        variables: { filter },
      })
    );
    const ids = res.data.users.edges.map((edge) => edge.node.id ?? '');
    this.returnResult(ids);
  };
};
