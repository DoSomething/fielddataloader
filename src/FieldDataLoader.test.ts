import { FieldDataLoader, BatchLoadFn, Response } from './FieldDataLoader';

const exampleResolver: BatchLoadFn<number> = (id: number): Promise<Response> =>
  Promise.resolve({
    id: id,
    field1: 'one',
    field2: 'two',
    field3: 'three',
    field4: 'four',
  });

describe('FieldDataLoader', () => {
  it('can load fields a single item', async () => {
    const loader = new FieldDataLoader<number>(exampleResolver);

    const promise = loader.load(1, ['field1', 'field2']);
    expect(promise).toBeInstanceOf(Promise);

    expect(await promise).toEqual({ field1: 'one', field2: 'two' });
  });

  it('batches multiple requests for same item', async () => {
    const batcher = jest.fn().mockImplementation(exampleResolver);

    const loader = new FieldDataLoader(batcher);
    const promise1 = loader.load(1, ['field1', 'field2']);
    const promise2 = loader.load(1, ['field2', 'field3']);

    // Each promise should get it's own requested subset of fields:
    expect(await promise1).toEqual({ field1: 'one', field2: 'two' });
    expect(await promise2).toEqual({ field2: 'two', field3: 'three' });

    // ...but the "batch" function should only run once:
    expect(batcher.mock.calls.length).toBe(1);
    expect(batcher.mock.calls[0]).toEqual([1, ['field1', 'field2', 'field3']]);
  });

  it('caches fields that have already been loaded', async () => {
    const batcher = jest.fn().mockImplementation(exampleResolver);

    const loader = new FieldDataLoader<number>(batcher);
    const promise1 = loader.load(1, ['field1', 'field2']);
    expect(await promise1).toEqual({ field1: 'one', field2: 'two' });
    expect(batcher.mock.calls.length).toBe(1);

    // We should re-return the same field when re-requested, even after
    // the first promise has resolved (and batchFunction has run):
    const promise2 = loader.load(1, ['field1']);
    expect(await promise2).toEqual({ field1: 'one' });

    // ...but the "batch" function should still have only run once:
    expect(batcher.mock.calls.length).toBe(1);
  });

  it.todo('- can clear an individual item from cache');
  it.todo('- can clear entire cache');
  it.todo('- caches additional fields that were returned in response');
});
