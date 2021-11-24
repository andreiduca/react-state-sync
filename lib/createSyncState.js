"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSyncState = void 0;
const react_1 = require("react");
function createSyncState({ defaultValue, key, storage, serialize = JSON.stringify, deserialize = stringValue => JSON.parse(stringValue || 'null'), onInit, }) {
    if (storage && !key) {
        throw new Error('You must specify a key to use local storage.');
    }
    const updaters = [];
    function callUpdaters(newValue) {
        updaters.forEach((updater) => updater(newValue));
    }
    function persistToStorage(newValue) {
        if (storage && key) {
            storage.setItem(key, serialize(newValue));
        }
    }
    function getInitialValue() {
        if (storage && key) {
            const storageValue = deserialize(storage.getItem(key));
            if (storageValue !== null) {
                return storageValue;
            }
        }
        persistToStorage(defaultValue);
        return defaultValue;
    }
    let value = getInitialValue();
    onInit === null || onInit === void 0 ? void 0 : onInit(value);
    function storageEventListener(storageEvent) {
        if (storageEvent.storageArea === storage && storageEvent.key === key) {
            const newValue = deserialize(storageEvent.newValue);
            if (newValue !== null) {
                value = newValue;
                callUpdaters(value);
            }
        }
    }
    function setSyncValue(newValue) {
        if (typeof newValue === 'function') {
            value = newValue(value);
        }
        else {
            value = newValue;
        }
        callUpdaters(value);
        persistToStorage(value);
    }
    function useSyncValue(mapper) {
        const [state, setState] = (0, react_1.useState)(() => mapper ? mapper(value) : value);
        const mapperRef = (0, react_1.useRef)();
        mapperRef.current = mapper;
        const stateUpdater = (0, react_1.useCallback)((newValue) => {
            setState(() => mapperRef.current ? mapperRef.current(newValue) : newValue);
        }, []);
        (0, react_1.useEffect)(() => {
            updaters.push(stateUpdater);
            if (updaters.length === 1 && storage && key) {
                window.addEventListener('storage', storageEventListener);
            }
            return () => {
                updaters.splice(updaters.indexOf(stateUpdater), 1);
                if (updaters.length === 0 && storage && key) {
                    window.removeEventListener('storage', storageEventListener);
                }
            };
        }, [stateUpdater]);
        return state;
    }
    return {
        useSyncValue,
        setSyncValue
    };
}
exports.createSyncState = createSyncState;
//# sourceMappingURL=createSyncState.js.map