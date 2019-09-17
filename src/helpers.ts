import { flatMap } from 'lodash';

import {
  GraphQLResolveInfo,
  FragmentSpreadNode,
  InlineFragmentNode,
  SelectionNode,
} from 'graphql';

/**
 * Get a list of fields included in the given query, via the GraphQL
 * AST provided in the resolver's `info` argument.
 */
export const getSelection = (info: GraphQLResolveInfo): string[] => {
  const type = info.returnType;
  if (!type) {
    return [];
  }

  const set = info.fieldNodes[0].selectionSet;
  if (!set || !set.selections) {
    return [];
  }

  return flatMap(set.selections, selection => parseNode(selection, info));
};

// Is this a FragmentSpread node?
const isFragmentSpread = (
  selection: SelectionNode,
): selection is FragmentSpreadNode =>
  (selection as FragmentSpreadNode).kind == 'FragmentSpread';

// Is this an InlineFragment node?
const isInlineFragment = (
  selection: SelectionNode,
): selection is InlineFragmentNode =>
  (selection as InlineFragmentNode).kind === 'InlineFragment';

const parseNode = (node: SelectionNode, info: GraphQLResolveInfo): string[] => {
  if (isFragmentSpread(node)) {
    const { selections } = info.fragments[node.name.value].selectionSet;
    return flatMap(selections, selection => parseNode(selection, info));
  }

  if (isInlineFragment(node)) {
    const { selections } = node.selectionSet;
    return flatMap(selections, selection => parseNode(selection, info));
  }

  return [node.name.value];
};
