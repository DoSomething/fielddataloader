# FieldDataLoader

[DataLoader](https://github.com/graphql/dataloader) is a utility for batching and caching requests to backend services. **FieldDataLoader** is a lightweight wrapper that adds support for requesting specific fields per item. For example:

```js

var userLoader = new FieldDataLoader((key, fields) => {
    // ...
});

// Then, from different places in your app:
userLoader.load(1, ['first_name']);
userLoader.load(1, ['last_name']);
userLoader.load(2, ['first_name']);

// These will be batched into a single callback per ID, for example:
//   SELECT first_name, last_name FROM users WHERE id = 1;
//   SELECT first_name FROM users WHERE id = 2;
```

## Getting Started

First, install FieldDataLoader using [npm](https://www.npmjs.com/).

```
npm install --save fielddataloader
```

To get started, create a `FieldDataLoader`. Each DataLoader instance represents a unique cache.

## Usage

FieldDataLoader replicates most of [DataLoader's API](https://github.com/graphql/dataloader#api):

##### `new FieldDataLoader(batchLoadFn)`

Create a new `FieldDataLoader`, given a batch loading function.
 - `batchLoadFn`: A function which accepts a key and an array of fields, and returns a Promise which resolves to an Array of values.

##### `load(key, fields)`

Loads fields for the given key, returning a `Promise` for the result.

- `key`: A key value to load.
- `fields`: A list of fields to load for that key.

##### `clear(key)`

Clears the value at `key` from the cache, if it exists. Returns itself for
method chaining.

- *key*: A key value to clear.

##### `clearAll()`

Clears the entire cache. To be used when some event results in unknown
invalidations across this particular `FieldDataLoader`. Returns itself for
method chaining.


## License

&copy; DoSomething.org. FieldDataLoader is free software, and may be redistributed under the terms specified
in the [LICENSE](https://github.com/DoSomething/fielddataloader/blob/master/LICENSE) file. The name and logo for
DoSomething.org are trademarks of Do Something, Inc and may not be used without permission.