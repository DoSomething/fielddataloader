import { get, isUndefined, zipObject } from "lodash";
import DataLoader from "dataloader";

export interface Response {
  [index: string]: any;
}

export type Key = number | string | symbol;

export type BatchLoadFn<K extends Key> = (
  key: K,
  fields: String[]
) => Promise<Response | Error>;

class FieldDataLoader<K extends Key> {
  batchFunction: BatchLoadFn<K>;
  loader: DataLoader<K, DataLoader<string, any>>;

  constructor(batchFunction: BatchLoadFn<K>) {
    // Store our batch function for later:
    this.batchFunction = batchFunction;

    // Configure our nested loaders (woah) for this type of item.
    this.loader = new DataLoader(async ids =>
      ids.map(id => new DataLoader(async fields => this.loadItem(id, fields)))
    );
  }

  /**
   * Load fields for the given key, returning a `Promise` for the result.
   */
  async load(key: K, fields: string[]) {
    const item = await this.loader.load(key);
    const values = await item.loadMany(fields);

    // If this resource 404'd, return `null` (see above).
    if (values.every(isUndefined)) {
      return null;
    }

    // Otherwise, zip the loaded fields back into an object:
    return zipObject(fields, values);
  }

  /**
   * Clears any field for `key` from the cache.
   */
  clear(key: K): FieldDataLoader<K> {
    this.loader.clear(key);

    return this;
  }

  /**
   * Clears the entire cache.
   */
  clearAll(): FieldDataLoader<K> {
    this.loader.clearAll();

    return this;
  }

  private async loadItem(id: K, fields: string[]) {
    // We'll call `batchFunction` once per unique ID, with all the unique
    // fields we've requested for that ID within this request:
    const result = await this.batchFunction(id, fields);

    // DataLoader requires the same signature for the batched input & ouput,
    // but we might have a scenario where the given ID isn't found. To handle
    // that, we'll return an appropriately sized array of 'undefined' values
    // here & then zip it back up in our 'load' function below:
    if (!result) {
      return fields.map(() => undefined);
    }

    // Otherwise, we'll return an array of values corresponding to the requested
    // fields. If the item exists, but a field doesn't, we'll return `null`.
    return fields.map(field => get(result, field, null));
  }
}

export default FieldDataLoader;
