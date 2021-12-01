interface SyncStateOptions<ValueType> {
    defaultValue: ValueType;
    key?: string;
    storage?: Storage | false;
    serialize?: (value: ValueType) => string;
    deserialize?: (stringValue: string | null) => ValueType | null;
    onInit?: (value: ValueType) => void;
    onUpdate?: (value: ValueType) => void;
}
export declare function createSyncState<ValueType>({ defaultValue, key, storage, serialize, deserialize, onInit, onUpdate, }: SyncStateOptions<ValueType>): {
    useSyncValue: {
        (): ValueType;
        <MappedType>(mapper: (originalValue: ValueType) => MappedType): MappedType;
    };
    setSyncValue: (newValue: ValueType | ((oldValue: ValueType) => ValueType)) => void;
};
export {};
