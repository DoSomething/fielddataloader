import { flatMap, isNil } from 'lodash';

import Maybe from 'graphql/tsutils/Maybe';
import {
  GraphQLResolveInfo,
  FragmentSpreadNode,
  InlineFragmentNode,
  SelectionNode,
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
export const getSelection = (info: GraphQLResolveInfo): string[] => {
  var set = info.fieldNodes[0].selectionSet;
  const typeName = isListType(info.returnType)
    ? info.returnType.ofType
    : info.returnType.name;

  const returnType = info.schema.getType(typeName);

  // If there's no fields on the selection or return type, there's
  // no point in doing any futher looking:
  if (!set || !set.selections || !hasFields(returnType)) {
    return [];
  }

  const selection = flatMap(set.selections, selection =>
    parseNode(selection, info),
  );

  const allFields = returnType.getFields();
  return flatMap(selection, name => {
    const field = allFields[name];

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
 * Parse the name of this field node & any fragments.
 */
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

/**
 * Is this a FragmentSpread node?
 */
const isFragmentSpread = (
  selection: SelectionNode,
): selection is FragmentSpreadNode =>
  (selection as FragmentSpreadNode).kind == 'FragmentSpread';

/**
 * Is this an InlineFragment node?
 */
const isInlineFragment = (
  selection: SelectionNode,
): selection is InlineFragmentNode =>
  (selection as InlineFragmentNode).kind === 'InlineFragment';

/**
 * Does the given node have fields (e.g. not a scalar, enum, etc)?
 */
const hasFields = (
  type: GraphQLOutputType | GraphQLNamedType | Maybe<GraphQLNamedType>,
): type is GraphQLObjectType | GraphQLInterfaceType =>
  !isNil(type) &&
  (type as GraphQLObjectType | GraphQLInterfaceType).getFields !== undefined;
