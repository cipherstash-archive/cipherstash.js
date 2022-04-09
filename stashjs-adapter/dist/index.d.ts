import { Collection, Mappings, MappingsMeta } from "@cipherstash/stashjs";
export declare type CSType<T> = Omit<T, "id"> & {
    originalId: number;
    id: string;
};
declare type MappingsWrapper<T> = Mappings<CSType<T>>;
declare type MappingsMetaWrapper<T> = MappingsMeta<MappingsWrapper<T>>;
declare type CollectionWrapper<T> = Collection<CSType<T>, MappingsWrapper<T>, MappingsMetaWrapper<T>>;
export declare class CollectionAPI<T extends {
    id: number;
}> {
    collection: Promise<CollectionWrapper<T>>;
    idNamespace: string;
    constructor(name: string, idNamespace: string);
    put(record: T): Promise<string>;
    get(id: number): Promise<T>;
    query: CollectionWrapper<T>["query"];
    list(): Promise<Array<T>>;
}
export {};
