# React State Sync - a custom hook for synchronizing state

Create synchronized state instances, then use them throughout your app.
Opt into localStorage or sessionStorage persistence to sync the state across multiple tabs. 

## ✨ Basic usage

```tsx
import { createSyncState } from 'react-state-sync';

// create a synchronized state instance
const counter = createSyncState({ defaultValue: 0 });

// extract the getter custom hook and an updater function
const { useSyncValue, setSyncValue } = counter;

function CounterDisplay() {
  // get the count value
  const count = useSyncValue();
  
  return <div>Count is: {count}</div>;
}

function DoubleDisplay() {
  // get the count value and transform it
  const doubleCount = useSyncValue(n => n * 2);

  return <div>Double is: {doubleCount}</div>;
}

function Counter() {
  return <button onClick={() => setSyncValue(n => n + 1)}>increment</button>;
}

function Reset() {
  return <button onClick={() => setSyncValue(0)}>reset</button>;
}

function App() {
  return (
    <>
      <CounterDisplay />
      <DoubleDisplay />
      <Counter />
      <Reset />
    </>
  );
}
```

## With `localStorage`

Persisting the state to a storage layer will sync your state across multiple opened tabs.

First, initialize the state instance with the `storage` option set to `window.localStorage` and give it a unique `key` name:

```tsx
// in ./sharedState
export const counter = createSyncState({
  defaultValue: 0,
  storage: window.localStorage,
  key: 'counter',
});
```

Then just use the state as normal in one tab and watch your app get updated in the other tabs:

```tsx
import { counter } from './sharedState';

const { useSyncValue, setSyncValue } = counter;

// part of the app rendering in a browser tab
function Counter() {
  const count = useSyncValue();
  return <button onClick={() => setSyncValue(n => n + 1)}>increment {count}</button>;
}
```

```tsx
import { counter } from './sharedState';

const { useSyncValue } = counter;

// part of the app rendering in a different tab
function CounterDisplay() {
  const count = useSyncValue();
  
  return <div>Count is: {count}</div>;
}
```
