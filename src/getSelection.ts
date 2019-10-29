import { get, isNil, flatMap, keyBy, mapValues } from 'lodash';

import Maybe from 'graphql/tsutils/Maybe';
import {
  GraphQLResolveInfo,
  FragmentSpreadNode,
  InlineFragmentNode,
  SelectionNode,
  FieldNode,
  SelectionSetNode,
  GraphQLOutputType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLNamedType,
  FieldDefinitionNode,
  isListType,
} from 'graphql';

/**
 * Get a list of fields requested in the given query, including any
 * additional field dependencies indicated by `@required` in the schema.
 */
export const getFields = (
  info: GraphQLResolveInfo,
  returnType?: string,
  path?: string,
): string[] => {
  // For simple queries, we can infer return type. If using a 'path', it
  // must be provided explicitly by the 'returnType' parameter:
  const inferredType = isListType(info.returnType)
    ? info.returnType.ofType
    : info.returnType.name;
  const type = info.schema.getType(returnType || inferredType);

  // If there's no fields on the selection or return type, then
  // there's no point in wasting time by delving futher:
  if (!info.fieldNodes[0] || !hasFields(type)) {
    return [];
  }

  // Parse any fragments into an easily traversable tree:
  const set = getSelection(info.fieldNodes[0], info);

  // We'll then get the given path, if we're scoping to a subset,
  // and read the keys at that level of the query tree:
  const subset = path ? get(set, path) : set; 
  const selection = Object.keys(subset);

  return flatMap(selection, name => {
    const field = type.getFields()[name];

    // If the field doesn't exist in the schema, exclude it:
    if (!field || !field.astNode) {
      return [];
    }

    // Return the field & any others mentioned by `@requires`:
    return parseRequiredFields(field.astNode);
  });
};

/**
 * Parse `@requires` directives for the given node.
 */
const parseRequiredFields = (node: FieldDefinitionNode): string[] => {
  const directives = node.directives || [];
  const requiresDirective = directives.find(
    directive => directive.name.value === 'requires',
  );

  // If we have a `@requires` directive, parse the 'fields' argument:
  if (requiresDirective) {
    const args = requiresDirective.arguments || [];
    const fields = args.find(arg => arg.name.value == 'fields');

    // It should look like `@requires(fields: "field1 field2")`.
    if (fields && fields.value.kind == 'StringValue') {
      return [node.name.value, ...fields.value.value.split(' ')];
    }
  }

  return [node.name.value];
};

/**
 * Given a selection set, resolve any fragments and inline them
 * in a single "flattened" selection.
 */
const flattenSelectionSet = (
  node: SelectionSetNode,
  info: GraphQLResolveInfo,
): readonly FieldNode[] => {
  return flatMap(node.selections, node => {
    if (isFragmentSpread(node)) {
      const { selectionSet } = info.fragments[node.name.value];
      return flattenSelectionSet(selectionSet, info);
    }

    if (isInlineFragment(node)) {
      const { selectionSet } = node;
      return flattenSelectionSet(selectionSet, info);
    }

    return node;
  });

};

type RecursiveDictionary<T> = T|{[x: string]: RecursiveDictionary<T>};

/**
 * Recursively parse nodes & any fragments into a
 * dictionary-like structure for easy traversal.
 */
export const getSelection = (
  node: FieldNode,
  info: GraphQLResolveInfo,
): RecursiveDictionary<FieldNode> => {
  if (! node.selectionSet) {
    return node;
  }

  const flattenedSet = flattenSelectionSet(node.selectionSet, info);
  const keyedSet = keyBy(flattenedSet, 'name.value')

  return mapValues(keyedSet, n => getSelection(n, info));
};

/**
 * Is this a FragmentSpread node?
 */
const isFragmentSpread = (
  selection: SelectionNode,
): selection is FragmentSpreadNode =>
  (selection as FragmentSpreadNode).kind == 'FragmentSpread';

/*
 * Is this an InlineFragment node?
 */
const isInlineFragment = (
  selection: SelectionNode,
): selection is InlineFragmentNode =>
  (selection as InlineFragmentNode).kind === 'InlineFragment';

/**
 * Does the given type have fields (e.g. not a scalar, enum, etc)?
 */
const hasFields = (
  type: GraphQLOutputType | GraphQLNamedType | Maybe<GraphQLNamedType>,
): type is GraphQLObjectType | GraphQLInterfaceType =>
  !isNil(type) &&
  (type as GraphQLObjectType | GraphQLInterfaceType).getFields !== undefined;
