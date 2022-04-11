import { Mappings, QueryBuilder, Query, QueryOptions } from "@cipherstash/stashjs";
export declare type CSType<T> = Omit<T, "id"> & {
    id?: string;
    originalId: number;
};
declare type MappingsWrapper<T> = Mappings<CSType<T>>;
export declare type QueryCallback<T> = (where: QueryBuilder<CSType<T>, MappingsWrapper<T>>) => Query<CSType<T>, MappingsWrapper<T>>;
export declare type CollectionQueryOptions<T> = QueryOptions<CSType<T>, MappingsWrapper<T>>;
export declare type QueryCallbackOrOptions<T> = QueryCallback<T> | CollectionQueryOptions<T>;
export interface RecordMapper {
    setStashId: (record: {
        id: number;
    }, stashId: string | null) => void;
    findStashIdsFor: (id: Array<number>) => Promise<Array<string>>;
    newIdFor: (stashId: string) => Promise<number>;
}
export declare class CollectionAPI<T extends {
    id: number;
    stashId?: string | null;
}> {
    #private;
    constructor(name: string, plaintextStore: RecordMapper);
    create(record: Omit<T, "id" | "stashId">): Promise<T>;
    put(record: T): Promise<T>;
    get(id: number): Promise<T | null>;
    getAll(ids: Array<number>): Promise<Array<T>>;
    delete(id: number): Promise<void>;
    query(callbackOrQueryOptions: QueryCallbackOrOptions<T>, queryOptions?: CollectionQueryOptions<T>): Promise<Array<T>>;
    list(options?: CollectionQueryOptions<T>): Promise<Array<T>>;
}
export {};
