import { useEffect, useState, useCallback, useRef } from 'react';

interface SyncStateOptions<ValueType> {
  defaultValue: ValueType;
  key?: string;
  storage?: Storage | false;
  serialize?: (value: ValueType) => string;
  deserialize?: (stringValue: string | null) => ValueType | null;
}

export function createSyncState<ValueType>({
  defaultValue,
  key,
  storage,
  serialize = JSON.stringify,
  deserialize = stringValue => JSON.parse(stringValue || 'null'),
}: SyncStateOptions<ValueType>) {
  if (storage instanceof Storage && !key) {
    throw new Error('You must specify a key to use local storage.');
  }

  // a list of observes to be notified of any value updates
  const updaters: Array<(newState: ValueType) => void> = [];

  // a function to call all registered updaters with the new value
  function callUpdaters(newValue: ValueType) {
    updaters.forEach((updater) => updater(newValue));
  }

  // a function to persist the serialized value to storage
  function persistToStorage(newValue: ValueType) {
    if (storage && key) {
      storage.setItem(key, serialize(newValue));
    }
  }

  // save the initial (default) value to the storage layer
  persistToStorage(defaultValue);

  // an updated local copy of the value, initialized with the default
  let value = defaultValue;

  // an event listener to respond to external storage updates
  function storageEventListener(storageEvent: StorageEvent) {
    // match by storage type and key
    if (storageEvent.storageArea === storage && storageEvent.key === key) {
      const newValue = deserialize(storageEvent.newValue);
      // if deserialization did not fail
      if (newValue !== null) {
        // update the local copy of the value
        value = newValue;
        // notify registered updaters
        callUpdaters(value);
      }
    }
  }

  type ValueUpdaterFn = (oldValue: ValueType) => ValueType;

  // combined function to persist value and call updaters
  function setSyncValue(newValue: ValueType | ValueUpdaterFn) {
    if (typeof newValue === 'function') {
      // generate a new value from the passed function
      value = (newValue as ValueUpdaterFn)(value);
    } else {
      // or just set to new passed value
      value = newValue;
    }
    callUpdaters(value);
    persistToStorage(value);
  }

  type ValueMapper<MappedType> = (originalValue: ValueType) => MappedType;

  // the custom hook for sync state
  function useSyncValue(): ValueType;
  function useSyncValue<MappedType>(mapper: ValueMapper<MappedType>): MappedType;
  function useSyncValue<MappedType>(mapper?: ValueMapper<MappedType>) {
    // initialize the state from storage, or from a default
    const [state, setState] = useState(() => mapper ? mapper(value) : value);

    // keep a reference to any latest version of the passed mapper
    const mapperRef = useRef<undefined | ValueMapper<MappedType>>();
    mapperRef.current = mapper;

    // a wrapped state updater, using the most current version of the mapper function
    const stateUpdater = useCallback((newValue: ValueType) => {
      setState(() =>
        mapperRef.current ? mapperRef.current(newValue) : newValue
      );
    }, []);

    useEffect(() => {
      // register the wrapped state updater
      updaters.push(stateUpdater);

      // attach the event listener for the first registered updater
      if (updaters.length === 1 && storage && key) {
        window.addEventListener('storage', storageEventListener);
      }

      return () => {
        // remove the wrapped state updater
        updaters.splice(updaters.indexOf(stateUpdater), 1);

        // unregister event listener if no updaters left
        if (updaters.length === 0 && storage && key) {
          window.removeEventListener('storage', storageEventListener);
        }
      };
    }, [stateUpdater]);

    // only return the state, since the updater will be called with the others
    return state;
  }

  return {
    // the custom hook returning the state
    useSyncValue,
    // the function calling all updaters and persisting to storage
    setSyncValue
  };
}
