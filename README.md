# FieldDataLoader [![build status](https://github.com/dosomething/fielddataloader/workflows/test/badge.svg)](https://github.com/DoSomething/fielddataloader/actions) [![Coverage Status](https://img.shields.io/coveralls/github/DoSomething/fielddataloader/master)](https://coveralls.io/github/DoSomething/fielddataloader?branch=master)

[DataLoader](https://github.com/graphql/dataloader) is a utility for batching
and caching requests to backend services. **FieldDataLoader** is a lightweight
wrapper that adds support for requesting specific fields per item. For example:

```js
import { FieldDataLoader } from 'fielddataloader';

var userLoader = new FieldDataLoader((key, fields) => {
  return db.select(/* ... */);
});

// Then, from different places in your app:
userLoader.load(1, ['first_name']);
userLoader.load(1, ['last_name']);
userLoader.load(2, ['first_name']);

// These will be batched into a single callback per ID, for example:
//   SELECT first_name, last_name FROM users WHERE id = 1;
//   SELECT first_name FROM users WHERE id = 2;
```

This is especially handy for
[GraphQL resolvers](https://graphql.org/learn/execution)! Use it with the
included [`getSelection` helper](#getselectioninfo) to load only the specific
fields that were requested in the given GraphQL query from your database or
backend. For example:

```js
import { FieldDataLoader, getSelection } from 'fielddataloader';

const resolvers = {
  Query: {
    user(obj, args, context, info) => userLoader.load(args.id, getSelection(info)),
  }
}
```

## Getting Started

First, install FieldDataLoader using [npm](https://www.npmjs.com/).

```
npm install --save fielddataloader
```

To get started, create a `FieldDataLoader`. Each DataLoader instance represents
a unique cache.

## Usage

FieldDataLoader replicates most of
[DataLoader's API](https://github.com/graphql/dataloader#api):

##### `const dataLoader = new FieldDataLoader(batchLoadFn)`

Create a new `FieldDataLoader`, given a batch loading function.

* `batchLoadFn`: A function which accepts a key and an array of fields, and
  returns a Promise which resolves to an Array of values.

##### `dataLoader.load(key, fields)`

Loads fields for the given key, returning a `Promise` for the result.

* `key`: A key value to load.
* `fields`: A list of fields to load for that key.

##### `dataLoader.clear(key)`

Clears the value at `key` from the cache, if it exists. Returns itself for
method chaining.

* _key_: A key value to clear.

##### `dataLoader.clearAll()`

Clears the entire cache. To be used when some event results in unknown
invalidations across this particular `FieldDataLoader`. Returns itself for
method chaining.

##### `getFields(info, [returnType], [path])`

Given the `info` argument from a
[GraphQL resolver](https://graphql.org/learn/execution/#root-fields-resolvers),
returns an array containing the names of any requested fields. Supports named &
inline fragments, and fields referenced by Apollo Federation's
[`@requires` directive](https://www.apollographql.com/docs/apollo-server/federation/federation-spec/#requires).
You can optionally pass a `returnType` and `path` if reading fields nested
within a query (rather than at the root).

## License

&copy; DoSomething.org. FieldDataLoader is free software, and may be
redistributed under the terms specified in the
[LICENSE](https://github.com/DoSomething/fielddataloader/blob/master/LICENSE)
file. The name and logo for DoSomething.org are trademarks of Do Something, Inc
and may not be used without permission.
