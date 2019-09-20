import gql from 'tagged-template-noop';
import { makeExecutableSchema } from 'graphql-tools';
import { graphql, GraphQLResolveInfo } from 'graphql';

import { getSelection } from './getSelection';

describe('getSelection', () => {
  it('can parse a simple selection', async () => {
    const { info } = await resolve(gql`
      query {
        testQuery {
          firstName
          lastName
        }
      }
    `);

    const selection = getSelection(info);
    expect(selection).toEqual(['firstName', 'lastName']);
  });

  it('can parse a selection with __typename', async () => {
    const { info } = await resolve(gql`
      query {
        testQuery {
          __typename
          firstName
        }
      }
    `);

    const selection = getSelection(info);
    expect(selection).toEqual(['firstName']);
  });

  it('can parse a selection with named fragment', async () => {
    const { info } = await resolve(gql`
      query {
        testQuery {
          firstName
          lastName
          ...TestFragment
        }
      }

      fragment TestFragment on User {
        email
      }
    `);

    const selection = getSelection(info);
    expect(selection).toEqual(['firstName', 'lastName', 'email']);
  });

  it('can parse a selection with inline fragment', async () => {
    const { info } = await resolve(gql`
      query {
        testQuery {
          firstName
          lastName
          ... on User {
            email
          }
        }
      }
    `);

    const selection = getSelection(info);
    expect(selection).toEqual(['firstName', 'lastName', 'email']);
  });

  it('can extend a selection using @requires in the schema', async () => {
    const { info } = await resolve(gql`
      query {
        testQuery {
          firstName
          age
        }
      }
    `);

    const selection = getSelection(info);
    expect(selection).toEqual(['firstName', 'age', 'birthdate']);
  });

  it.todo('can parse a selection using @include(false) in query');
  it.todo('can parse a selection using @include(true) in query');
  it.todo('can parse a selection using @skip(false) in query');
  it.todo('can parse a selection using @skip(true) in query');
});

// ----------------------------------------------------------------

interface ResolverArguments {
  root: any;
  args: any;
  context: any;
  info: GraphQLResolveInfo;
}

const resolve = (query: string): Promise<ResolverArguments> => {
  // A simple schema & "test" query we can use:
  const typeDefs = gql`
    directive @requires(fields: [String]!) on FIELD_DEFINITION

    type User {
      firstName: String
      lastName: String
      email: String
      mobile: String
      age: Int @requires(fields: "birthdate")
    }

    type Query {
      testQuery: User
    }
  `;

  // Build our schema, run a mock query through it, and
  // resolve with the GraphQLFieldResolver arguments.
  return new Promise(resolve => {
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers: {
        Query: {
          testQuery: (root, args, context, info) => {
            resolve({ root, args, context, info });
            return null;
          },
        },
      },
    });

    graphql(schema, query);
  });
};
