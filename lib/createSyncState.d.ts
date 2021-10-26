interface SyncStateOptions<ValueType> {
    defaultValue: ValueType;
    key?: string;
    storage?: Storage | false;
    serialize?: (value: ValueType) => string;
    deserialize?: (stringValue: string | null) => ValueType | null;
}
export declare function createSyncState<ValueType>({ defaultValue, key, storage, serialize, deserialize, }: SyncStateOptions<ValueType>): {
    useSyncValue: {
        (): ValueType;
        <MappedType>(mapper: (originalValue: ValueType) => MappedType): MappedType;
    };
    setSyncValue: (newValue: ValueType | ((oldValue: ValueType) => ValueType)) => void;
};
export {};
