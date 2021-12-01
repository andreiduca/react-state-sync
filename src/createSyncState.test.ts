import { act, renderHook } from '@testing-library/react-hooks';

import { createSyncState } from './createSyncState';

function wait(timeoutMs: number) {
  return new Promise((res) => {
    setTimeout(res, timeoutMs);
  });
}

describe('createSyncState', () => {
  describe('simple state management', () => {
    it('create a new state', () => {
      const { useSyncValue, setSyncValue } = createSyncState({
        defaultValue: 0,
      });

      expect(typeof useSyncValue).toBe('function');
      expect(typeof setSyncValue).toBe('function');

      const { result } = renderHook(() => useSyncValue());
      expect(result.current).toStrictEqual(0);
    });

    it('update the state with a new value', () => {
      const { useSyncValue, setSyncValue } = createSyncState({
        defaultValue: 0,
      });

      const { result } = renderHook(() => useSyncValue());
      expect(result.current).toStrictEqual(0);

      act(() => { setSyncValue(1); });
      expect(result.current).toStrictEqual(1);
    });

    it('update the state with a setter function', () => {
      const { useSyncValue, setSyncValue } = createSyncState({
        defaultValue: 1,
      });

      const { result } = renderHook(() => useSyncValue());
      expect(result.current).toStrictEqual(1);

      act(() => { setSyncValue(val => val * 2); });
      expect(result.current).toStrictEqual(2);

      act(() => { setSyncValue(val => val * 3); });
      expect(result.current).toStrictEqual(6);
    });

    it('get derived state', () => {
      const { useSyncValue, setSyncValue } = createSyncState({
        defaultValue: [1, 2, 3],
      });

      const { result: items } = renderHook(() => useSyncValue());
      expect(items.current).toStrictEqual([1, 2, 3]);

      const { result: itemsLength } = renderHook(() => useSyncValue(numbers => numbers.length));
      expect(itemsLength.current).toStrictEqual(3);

      act(() => { setSyncValue(numbers => [...numbers, 4]); });
      expect(itemsLength.current).toStrictEqual(4);
    });

    it('synchronize the state between hooks', () => {
      const { useSyncValue, setSyncValue } = createSyncState({
        defaultValue: { id: 1 },
      });

      const { result: stateA } = renderHook(() => useSyncValue());
      const { result: stateB } = renderHook(() => useSyncValue());
      expect(stateA.current).toStrictEqual({ id: 1 });
      expect(stateB.current).toStrictEqual({ id: 1 });
      expect(stateB.current).toBe(stateA.current);

      act(() => {
        setSyncValue({ id: 2 });
      });

      expect(stateA.current).toStrictEqual({ id: 2 });
      expect(stateB.current).toStrictEqual({ id: 2 });
      expect(stateB.current).toBe(stateA.current);

      const { result: stateC } = renderHook(() => useSyncValue());
      expect(stateC.current).toStrictEqual({ id: 2 });
      expect(stateC.current).toBe(stateA.current);

      act(() => {
        setSyncValue({ id: 3 });
      });

      expect(stateA.current).toStrictEqual({ id: 3 });
      expect(stateB.current).toStrictEqual({ id: 3 });
      expect(stateC.current).toStrictEqual({ id: 3 });
      expect(stateB.current).toBe(stateA.current);
      expect(stateC.current).toBe(stateA.current);
    });

    it('call the init callback', () => {
      const initCallback = jest.fn();

      createSyncState({
        defaultValue: 0,
        onInit: initCallback,
      });

      expect(initCallback).toHaveBeenCalledWith(0);
    });

    it('call the update callback', async () => {
      const updateCallback = jest.fn();

      const { setSyncValue } = createSyncState({
        defaultValue: 0,
        onUpdate: updateCallback,
      });

      expect(updateCallback).not.toHaveBeenCalled();

      act(() => setSyncValue(1));
      await wait(1);
      expect(updateCallback).toHaveBeenCalledWith(1);
    });
  });

  describe('persistence to a storage layer', () => {
    afterEach(() => {
      global.window.localStorage.clear();
    });

    it('throw if initialized without a key', () => {
      const generator = () => createSyncState({
        defaultValue: 0,
        storage: global.window.localStorage,
      });

      expect(generator).toThrow();
    });

    it('persist a value to the storage layer', () => {
      createSyncState({
        defaultValue: 0,
        key: 'test',
        storage: global.window.localStorage,
      });

      expect(global.window.localStorage.length).toEqual(1);
      expect(global.window.localStorage.getItem('test')).toStrictEqual('0');
    });

    it('update a value to the storage layer', async () => {
      const { useSyncValue, setSyncValue } = createSyncState({
        defaultValue: 1,
        key: 'test',
        storage: global.window.localStorage,
      });

      const { result } = renderHook(() => useSyncValue());
      expect(result.current).toStrictEqual(1);
      await wait(1);
      expect(global.window.localStorage.getItem('test')).toStrictEqual('1');

      act(() => { setSyncValue(2); });
      expect(result.current).toStrictEqual(2);
      await wait(1);
      expect(global.window.localStorage.getItem('test')).toStrictEqual('2');
    });

    it('initialize with value from storage', () => {
      const initCallback = jest.fn();

      global.window.localStorage.setItem('test', JSON.stringify('bar'));

      const { useSyncValue } = createSyncState({
        defaultValue: 'foo',
        key: 'test',
        storage: global.window.localStorage,
        onInit: initCallback,
      });

      const { result } = renderHook(() => useSyncValue());

      expect(result.current).toStrictEqual('bar');
      expect(initCallback).toHaveBeenCalledWith('bar');
    });

    it('use custom serializer and deserializer', async () => {
      const { setSyncValue } = createSyncState({
        defaultValue: { id: 1 },
        key: 'test/custom',
        storage: global.window.localStorage,
        serialize: (value) => value.id.toString(),
        deserialize: (value) => value !== null
          ? { id: parseInt(value, 10) }
          : null
      });

      expect(global.window.localStorage.getItem('test/custom')).toStrictEqual('1');
      act(() => { setSyncValue({ id: 2 }); });
      await wait(1);
      expect(global.window.localStorage.getItem('test/custom')).toStrictEqual('2');
    });
  });

  describe('storage layer listeners', () => {
    afterEach(() => {
      global.window.localStorage.clear();
    });

    it('listen to storage layer updates', () => {
      const { useSyncValue } = createSyncState({
        defaultValue: { id: 1 },
        key: 'test/json',
        storage: global.window.localStorage,
      });

      const { result: stateA } = renderHook(() => useSyncValue());
      const { result: stateB } = renderHook(() => useSyncValue());
      const { result: IdState } = renderHook(() => useSyncValue(item => item.id));
      expect(stateA.current).toStrictEqual({ id: 1 });
      expect(stateB.current).toStrictEqual({ id: 1 });
      expect(IdState.current).toStrictEqual(1);

      act(() => {
        global.window.dispatchEvent(new StorageEvent(
          'storage',
          {
            // bubbles: true,
            // cancelable: true,
            storageArea: global.window.localStorage,
            key: 'test/json',
            oldValue: global.window.localStorage.getItem('test/json'),
            newValue: '{"id":2}',
          }
        ));
      });

      expect(stateA.current).toStrictEqual({ id: 2 });
      expect(stateB.current).toStrictEqual({ id: 2 });
      expect(IdState.current).toStrictEqual(2);

      act(() => {
        global.window.dispatchEvent(new StorageEvent(
          'storage',
          {
            // bubbles: true,
            // cancelable: true,
            storageArea: global.window.localStorage,
            key: 'test/json',
            oldValue: global.window.localStorage.getItem('test/json'),
            newValue: null,
          }
        ));
      });

      expect(stateA.current).toStrictEqual({ id: 2 });
      expect(stateB.current).toStrictEqual({ id: 2 });
      expect(IdState.current).toStrictEqual(2);
    });

    it('listen to updates with custom serializers', () => {
      const { useSyncValue } = createSyncState({
        defaultValue: { name: 'foo' },
        key: 'test/custom',
        storage: global.window.localStorage,
        serialize: value => value.name,
        deserialize: value => value ? { name: value } : null,
      });

      const { result: stateA } = renderHook(() => useSyncValue());
      const { result: stateB } = renderHook(() => useSyncValue());
      const { result: firstCharState } = renderHook(() => useSyncValue(item => item.name[0]));
      expect(stateA.current).toStrictEqual({ name: 'foo' });
      expect(stateB.current).toStrictEqual({ name: 'foo' });
      expect(firstCharState.current).toStrictEqual('f');

      act(() => {
        global.window.dispatchEvent(new StorageEvent(
          'storage',
          {
            bubbles: true,
            cancelable: true,
            storageArea: global.window.localStorage,
            key: 'test/custom',
            oldValue: global.window.localStorage.getItem('test/custom'),
            newValue: 'bar',
          }
        ));
      });

      expect(stateA.current).toStrictEqual({ name: 'bar' });
      expect(stateB.current).toStrictEqual({ name: 'bar' });
      expect(firstCharState.current).toStrictEqual('b');

      act(() => {
        global.window.dispatchEvent(new StorageEvent(
          'storage',
          {
            bubbles: true,
            cancelable: true,
            storageArea: global.window.localStorage,
            key: 'test/custom',
            oldValue: global.window.localStorage.getItem('test/custom'),
            newValue: null,
          }
        ));
      });

      expect(stateA.current).toStrictEqual({ name: 'bar' });
      expect(stateB.current).toStrictEqual({ name: 'bar' });
      expect(firstCharState.current).toStrictEqual('b');
    });

    it('do not respond to unrelated window events', () => {
      const { useSyncValue } = createSyncState({
        defaultValue: 'foo',
        key: 'test',
        storage: global.window.localStorage,
      });

      const { result } = renderHook(() => useSyncValue());
      expect (result.current).toStrictEqual('foo');

      act(() => {
        global.window.dispatchEvent(new StorageEvent(
          'storage',
          {
            bubbles: true,
            cancelable: true,
            storageArea: global.window.localStorage,
            key: 'test/custom',
            oldValue: global.window.localStorage.getItem('test/custom'),
            newValue: 'bar',
          }
        ));
      });

      expect (result.current).toStrictEqual('foo');

      act(() => {
        global.window.dispatchEvent(new StorageEvent(
          'storage',
          {
            bubbles: true,
            cancelable: true,
            storageArea: global.window.sessionStorage,
            key: 'test',
            oldValue: global.window.sessionStorage.getItem('test'),
            newValue: 'baz',
          }
        ));
      });

      expect (result.current).toStrictEqual('foo');
    });
  });
});
