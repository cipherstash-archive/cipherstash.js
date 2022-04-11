"use strict";
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _CollectionAPI_collection, _CollectionAPI_recordMapper;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectionAPI = void 0;
const stashjs_1 = require("@cipherstash/stashjs");
const uuid_1 = require("uuid");
/*
 * Wrapper class for `Collection` that simplifies storing of types with numeric IDs
 * in CipherStash as well as manages the collection loading handshake step.
 *
 * If you have a type in your app (say a `User`), you can use this class to define an API that wraps
 * the underlying Collection and automatically converts the type to a CSType.
 *
 * `CSType<T>` is defined in terms of `T` but adds an `originalId` attribute and changes
 * the type of `id` from `number` to a `string` so that it can be used with CipherStash secure IDs.
 *
 * A mapper is used to link CipherStash generated IDs to whatever ID scheme is used in the rest of the system.
 *
 * All functions in this class deal with `T` to the caller but map to `CSType<T>` internally.
 *
 * ## Collection Loading
 *
 * The `loadCollection` step in CipherStash can take a few hundred milliseconds so this class
 * loads it once the first time any function is called and caches it.
 *
 * See also https://docs.cipherstash.com/tsdoc/modules/_cipherstash_stashjs.html
 */
class CollectionAPI {
    constructor(name, plaintextStore) {
        _CollectionAPI_collection.set(this, void 0);
        _CollectionAPI_recordMapper.set(this, void 0);
        __classPrivateFieldSet(this, _CollectionAPI_recordMapper, plaintextStore, "f");
        /* Keep a promise to load the collection. The first time we await this will resolve.
         * Subsequent awaits will just pass through the resolved promise. */
        __classPrivateFieldSet(this, _CollectionAPI_collection, stashjs_1.Stash.connect()
            .then(stash => stash.loadCollection(name)), "f");
    }
    async create(record) {
        const cln = await __classPrivateFieldGet(this, _CollectionAPI_collection, "f");
        const stashId = (0, uuid_1.v4)();
        let newId = await __classPrivateFieldGet(this, _CollectionAPI_recordMapper, "f").newIdFor(stashId);
        await cln.put({ ...record, id: stashId, originalId: newId });
        return { ...record, id: newId, stashId };
    }
    /*
     * Wrapper for `Collection.put` but takes a numeric ID
     * and returns `T`.
     *
     * See also https://docs.cipherstash.com/tsdoc/classes/_cipherstash_stashjs.Collection.html#get
     */
    async put(record) {
        const cln = await __classPrivateFieldGet(this, _CollectionAPI_collection, "f");
        // FIXME: Do this in a transaction
        if (record.stashId) {
            await cln.put({
                ...record,
                id: record.stashId,
                originalId: record.id
            });
            return record;
        }
        else {
            const stashId = (0, uuid_1.v4)();
            await cln.put({ ...record, id: stashId, originalId: record.id });
            await __classPrivateFieldGet(this, _CollectionAPI_recordMapper, "f").setStashId(record, stashId);
            return { ...record, stashId };
        }
    }
    /*
     * Wrapper for `Collection.get` but takes a numeric ID
     * and returns `T`.
     *
     * See also https://docs.cipherstash.com/tsdoc/classes/_cipherstash_stashjs.Collection.html#get
     */
    async get(id) {
        const cln = await __classPrivateFieldGet(this, _CollectionAPI_collection, "f");
        let stashIds = await __classPrivateFieldGet(this, _CollectionAPI_recordMapper, "f").findStashIdsFor([id]);
        if (stashIds && stashIds[0]) {
            const result = await cln.get(stashIds[0]);
            if (result) {
                return { ...result, stashId: result.id, id };
            }
        }
        return null;
    }
    async getAll(ids) {
        const cln = await __classPrivateFieldGet(this, _CollectionAPI_collection, "f");
        let stashIds = await __classPrivateFieldGet(this, _CollectionAPI_recordMapper, "f").findStashIdsFor(ids);
        let results = await cln.getAll(stashIds);
        return results.map((record) => {
            const originalId = record.originalId;
            delete record.originalId;
            return { ...record, stashId: record.id, id: originalId };
        });
    }
    async delete(id) {
        const cln = await __classPrivateFieldGet(this, _CollectionAPI_collection, "f");
        let stashIds = await __classPrivateFieldGet(this, _CollectionAPI_recordMapper, "f").findStashIdsFor([id]);
        if (stashIds.length == 0)
            return;
        if (!stashIds[0])
            return;
        await cln.delete(stashIds[0]);
        await __classPrivateFieldGet(this, _CollectionAPI_recordMapper, "f").setStashId({ id }, null);
    }
    async query(callbackOrQueryOptions, queryOptions) {
        const collection = await __classPrivateFieldGet(this, _CollectionAPI_collection, "f");
        let result = await (queryOptions ?
            collection.query(callbackOrQueryOptions, queryOptions) :
            collection.query(callbackOrQueryOptions));
        return result.documents.map(record => ({ ...record, id: record.originalId }));
    }
    async list(options) {
        return await this.query(options ? options : {});
    }
}
exports.CollectionAPI = CollectionAPI;
_CollectionAPI_collection = new WeakMap(), _CollectionAPI_recordMapper = new WeakMap();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esa0RBQW1IO0FBQ25ILCtCQUFtQztBQTJDbkM7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHO0FBQ0gsTUFBYSxhQUFhO0lBSXhCLFlBQVksSUFBWSxFQUFFLGNBQTRCO1FBSHRELDRDQUEwQztRQUMxQyw4Q0FBMkI7UUFHekIsdUJBQUEsSUFBSSwrQkFBaUIsY0FBYyxNQUFBLENBQUE7UUFDbkM7NEVBQ29FO1FBQ3BFLHVCQUFBLElBQUksNkJBQWUsZUFBSyxDQUFDLE9BQU8sRUFBRTthQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFZLElBQUksQ0FBQyxDQUFDLE1BQUEsQ0FBQTtJQUN6RCxDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxNQUFpQztRQUM1QyxNQUFNLEdBQUcsR0FBRyxNQUFNLHVCQUFBLElBQUksaUNBQVksQ0FBQTtRQUVsQyxNQUFNLE9BQU8sR0FBRyxJQUFBLFNBQU0sR0FBRSxDQUFBO1FBQ3hCLElBQUksS0FBSyxHQUFHLE1BQU0sdUJBQUEsSUFBSSxtQ0FBYyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN0RCxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQWMsQ0FBQyxDQUFBO1FBQ3ZFLE9BQU8sRUFBQyxHQUFHLE1BQU0sRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBa0IsQ0FBQTtJQUN6RCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQVM7UUFDakIsTUFBTSxHQUFHLEdBQUcsTUFBTSx1QkFBQSxJQUFJLGlDQUFZLENBQUE7UUFFbEMsa0NB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akQsWUFBd0M7UUFFeEMsTUFBTSxVQUFVLEdBQUcsTUFBTSx1QkFBQSxJQUFJLGlDQUFZLENBQUE7UUFDekMsSUFBSSxNQUFNLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ2hDLFVBQVUsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLEVBQUUsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUN4RCxVQUFVLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQTtRQUUzQyxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FDcEMsRUFBRSxHQUFHLE1BQU0sRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLFVBQVUsRUFDbkMsQ0FBQSxDQUFDLENBQUE7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFtQztRQUM1QyxPQUFPLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDakQsQ0FBQztDQUNGO0FBekdELHNDQXlHQyIsInNvdXJjZXNDb250ZW50IjpbIlxuaW1wb3J0IHsgU3Rhc2gsIENvbGxlY3Rpb24sIE1hcHBpbmdzLCBNYXBwaW5nc01ldGEsIFF1ZXJ5QnVpbGRlciwgUXVlcnksIFF1ZXJ5T3B0aW9ucyB9IGZyb20gXCJAY2lwaGVyc3Rhc2gvc3Rhc2hqc1wiXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJ1xuXG5leHBvcnQgdHlwZSBDU1R5cGU8VD4gPSBPbWl0PFQsIFwiaWRcIj4gJiB7IGlkPzogc3RyaW5nLCBvcmlnaW5hbElkOiBudW1iZXIgfVxudHlwZSBNYXBwaW5nc1dyYXBwZXI8VD4gPSBNYXBwaW5nczxDU1R5cGU8VD4+XG50eXBlIE1hcHBpbmdzTWV0YVdyYXBwZXI8VD4gPSBNYXBwaW5nc01ldGE8TWFwcGluZ3NXcmFwcGVyPFQ+PlxudHlwZSBDb2xsZWN0aW9uV3JhcHBlcjxUPiA9IENvbGxlY3Rpb248Q1NUeXBlPFQ+LCBNYXBwaW5nc1dyYXBwZXI8VD4sIE1hcHBpbmdzTWV0YVdyYXBwZXI8VD4+XG5cbmV4cG9ydCB0eXBlIFF1ZXJ5Q2FsbGJhY2s8VD4gPSAod2hlcmU6IFF1ZXJ5QnVpbGRlcjxDU1R5cGU8VD4sIE1hcHBpbmdzV3JhcHBlcjxUPj4pID0+IFF1ZXJ5PENTVHlwZTxUPiwgTWFwcGluZ3NXcmFwcGVyPFQ+PlxuZXhwb3J0IHR5cGUgQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUPiA9IFF1ZXJ5T3B0aW9uczxDU1R5cGU8VD4sIE1hcHBpbmdzV3JhcHBlcjxUPj5cbmV4cG9ydCB0eXBlIFF1ZXJ5Q2FsbGJhY2tPck9wdGlvbnM8VD4gPSBRdWVyeUNhbGxiYWNrPFQ+IHwgQ29sbGVjdGlvblF1ZXJ5T3B0aW9uczxUPlxuXG5cbi8qXG4gKiBJbnRlcmZhY2UgZm9yIGEgYFJlY29yZE1hcHBlcmAgd2hpY2ggcHJvdmlkZXMgZnVuY3Rpb25zIHRvIGNvbnZlcnQgQ2lwaGVyU3Rhc2ggSURzXG4gKiB0byBJRHMgaW4gYW4gZXhpc3Rpbmcgc3lzdGVtIChzYXkgbnVtZXJpYyBJRHMgaW4gYSBQcmlzbWEgbW9kZWwpLlxuICogXG4gKiBUaGlzIGlzIG1vc3QgbGlrZWx5IGEgam9pbiB0YWJsZSBpbiB5b3VyIGV4aXN0aW5nIGRhdGFiYXNlIHdoaWNoIG1hcHMgYW4gaW50ZWdlciBJRCB0b1xuICogYSBDaXBoZXJTdGFzaCBJRC5cbiAqIFxuICogYGBgXG4gKiB8IC0tLSBpZCAtLS0gfCAtLS0tLS0tLS0tLS0tLSBzdGFzaElkIC0tLS0tLS0tLS0tLS0gfFxuICogfCAtLS0tLS0tLS0tLXwgLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLXxcbiAqIHwgICAgMTAwICAgICB8IDIyZDAzODMyLTEwZTEtNDFjZi05NzkwLTRlZmEyMjhkNTQ2YSB8XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBSZWNvcmRNYXBwZXIge1xuICAvKlxuICAgKiBTZXQgdGhlIGdpdmVuIHN0YXNoSWQgb24gdGhlIHJlY29yZCB3aXRoIHByaW1hcnkga2V5PWlkXG4gICAqL1xuICBzZXRTdGFzaElkOiAocmVjb3JkOiB7aWQ6IG51bWJlcn0sIHN0YXNoSWQ6IHN0cmluZyB8IG51bGwpID0+IHZvaWQsXG5cbiAgLypcbiAgICogRmluZCBhbGwgdGhlIGNvcmVzcG9uZGluZyBzdGFzaElkcyBmb3IgcmVjb3JkcyB3aXRoIHRoZSBnaXZlbiBpZHNcbiAgICovXG4gIGZpbmRTdGFzaElkc0ZvcjogKGlkOiBBcnJheTxudW1iZXI+KSA9PiBQcm9taXNlPEFycmF5PHN0cmluZz4+LFxuXG4gIC8qXG4gICAqIENyZWF0ZSBhIG5ldyByZWNvcmQgYW5kIGFzc2lnbiBpdCB0aGUgZ2l2ZW4gc3Rhc2hJZC5cbiAgICogVXNlZnVsIHdoZW4gdGhlIGV4aXN0aW5nIGRhdGFiYXNlIGdlbmVyYXRlcyBpdHMgb3duIElEcyAoc2F5IHdpdGggYSBzZXF1ZW5jZSkuXG4gICAqL1xuICBuZXdJZEZvcjogKHN0YXNoSWQ6IHN0cmluZykgPT4gUHJvbWlzZTxudW1iZXI+XG59XG5cbi8qXG4gKiBXcmFwcGVyIGNsYXNzIGZvciBgQ29sbGVjdGlvbmAgdGhhdCBzaW1wbGlmaWVzIHN0b3Jpbmcgb2YgdHlwZXMgd2l0aCBudW1lcmljIElEc1xuICogaW4gQ2lwaGVyU3Rhc2ggYXMgd2VsbCBhcyBtYW5hZ2VzIHRoZSBjb2xsZWN0aW9uIGxvYWRpbmcgaGFuZHNoYWtlIHN0ZXAuXG4gKiBcbiAqIElmIHlvdSBoYXZlIGEgdHlwZSBpbiB5b3VyIGFwcCAoc2F5IGEgYFVzZXJgKSwgeW91IGNhbiB1c2UgdGhpcyBjbGFzcyB0byBkZWZpbmUgYW4gQVBJIHRoYXQgd3JhcHNcbiAqIHRoZSB1bmRlcmx5aW5nIENvbGxlY3Rpb24gYW5kIGF1dG9tYXRpY2FsbHkgY29udmVydHMgdGhlIHR5cGUgdG8gYSBDU1R5cGUuXG4gKiBcbiAqIGBDU1R5cGU8VD5gIGlzIGRlZmluZWQgaW4gdGVybXMgb2YgYFRgIGJ1dCBhZGRzIGFuIGBvcmlnaW5hbElkYCBhdHRyaWJ1dGUgYW5kIGNoYW5nZXNcbiAqIHRoZSB0eXBlIG9mIGBpZGAgZnJvbSBgbnVtYmVyYCB0byBhIGBzdHJpbmdgIHNvIHRoYXQgaXQgY2FuIGJlIHVzZWQgd2l0aCBDaXBoZXJTdGFzaCBzZWN1cmUgSURzLlxuICogXG4gKiBBIG1hcHBlciBpcyB1c2VkIHRvIGxpbmsgQ2lwaGVyU3Rhc2ggZ2VuZXJhdGVkIElEcyB0byB3aGF0ZXZlciBJRCBzY2hlbWUgaXMgdXNlZCBpbiB0aGUgcmVzdCBvZiB0aGUgc3lzdGVtLlxuICogXG4gKiBBbGwgZnVuY3Rpb25zIGluIHRoaXMgY2xhc3MgZGVhbCB3aXRoIGBUYCB0byB0aGUgY2FsbGVyIGJ1dCBtYXAgdG8gYENTVHlwZTxUPmAgaW50ZXJuYWxseS5cbiAqIFxuICogIyMgQ29sbGVjdGlvbiBMb2FkaW5nXG4gKiBcbiAqIFRoZSBgbG9hZENvbGxlY3Rpb25gIHN0ZXAgaW4gQ2lwaGVyU3Rhc2ggY2FuIHRha2UgYSBmZXcgaHVuZHJlZCBtaWxsaXNlY29uZHMgc28gdGhpcyBjbGFzc1xuICogbG9hZHMgaXQgb25jZSB0aGUgZmlyc3QgdGltZSBhbnkgZnVuY3Rpb24gaXMgY2FsbGVkIGFuZCBjYWNoZXMgaXQuXG4gKiBcbiAqIFNlZSBhbHNvIGh0dHBzOi8vZG9jcy5jaXBoZXJzdGFzaC5jb20vdHNkb2MvbW9kdWxlcy9fY2lwaGVyc3Rhc2hfc3Rhc2hqcy5odG1sXG4gKi9cbmV4cG9ydCBjbGFzcyBDb2xsZWN0aW9uQVBJPFQgZXh0ZW5kcyB7IGlkOiBudW1iZXIsIHN0YXNoSWQ/OiBzdHJpbmcgfCBudWxsIH0+IHtcbiAgI2NvbGxlY3Rpb246IFByb21pc2U8Q29sbGVjdGlvbldyYXBwZXI8VD4+XG4gICNyZWNvcmRNYXBwZXI6IFJlY29yZE1hcHBlclxuXG4gIGNvbnN0cnVjdG9yKG5hbWU6IHN0cmluZywgcGxhaW50ZXh0U3RvcmU6IFJlY29yZE1hcHBlcikge1xuICAgIHRoaXMuI3JlY29yZE1hcHBlciA9IHBsYWludGV4dFN0b3JlXG4gICAgLyogS2VlcCBhIHByb21pc2UgdG8gbG9hZCB0aGUgY29sbGVjdGlvbi4gVGhlIGZpcnN0IHRpbWUgd2UgYXdhaXQgdGhpcyB3aWxsIHJlc29sdmUuXG4gICAgICogU3Vic2VxdWVudCBhd2FpdHMgd2lsbCBqdXN0IHBhc3MgdGhyb3VnaCB0aGUgcmVzb2x2ZWQgcHJvbWlzZS4gKi9cbiAgICB0aGlzLiNjb2xsZWN0aW9uID0gU3Rhc2guY29ubmVjdCgpXG4gICAgICAudGhlbihzdGFzaCA9PiBzdGFzaC5sb2FkQ29sbGVjdGlvbjxDU1R5cGU8VD4+KG5hbWUpKVxuICB9XG5cbiAgYXN5bmMgY3JlYXRlKHJlY29yZDogT21pdDxULCBcImlkXCIgfCBcInN0YXNoSWRcIj4pOiBQcm9taXNlPFQ+IHtcbiAgICBjb25zdCBjbG4gPSBhd2FpdCB0aGlzLiNjb2xsZWN0aW9uXG5cbiAgICBjb25zdCBzdGFzaElkID0gdXVpZHY0KClcbiAgICBsZXQgbmV3SWQgPSBhd2FpdCB0aGlzLiNyZWNvcmRNYXBwZXIubmV3SWRGb3Ioc3Rhc2hJZClcbiAgICBhd2FpdCBjbG4ucHV0KHsuLi5yZWNvcmQsIGlkOiBzdGFzaElkLCBvcmlnaW5hbElkOiBuZXdJZH0gYXMgQ1NUeXBlPFQ+KVxuICAgIHJldHVybiB7Li4ucmVjb3JkLCBpZDogbmV3SWQsIHN0YXNoSWQgfSBhcyB1bmtub3duIGFzIFRcbiAgfVxuXG4gIC8qXG4gICAqIFdyYXBwZXIgZm9yIGBDb2xsZWN0aW9uLnB1dGAgYnV0IHRha2VzIGEgbnVtZXJpYyBJRFxuICAgKiBhbmQgcmV0dXJucyBgVGAuXG4gICAqIFxuICAgKiBTZWUgYWxzbyBodHRwczovL2RvY3MuY2lwaGVyc3Rhc2guY29tL3RzZG9jL2NsYXNzZXMvX2NpcGhlcnN0YXNoX3N0YXNoanMuQ29sbGVjdGlvbi5odG1sI2dldFxuICAgKi9cbiAgYXN5bmMgcHV0KHJlY29yZDogVCk6IFByb21pc2U8VD4ge1xuICAgIGNvbnN0IGNsbiA9IGF3YWl0IHRoaXMuI2NvbGxlY3Rpb25cblxuICAgIC8vIEZJWE1FOiBEbyB0aGlzIGluIGEgdHJhbnNhY3Rpb25cbiAgICBpZiAocmVjb3JkLnN0YXNoSWQpIHtcbiAgICAgIGF3YWl0IGNsbi5wdXQoe1xuICAgICAgICAuLi5yZWNvcmQsXG4gICAgICAgIGlkOiByZWNvcmQuc3Rhc2hJZCxcbiAgICAgICAgb3JpZ2luYWxJZDogcmVjb3JkLmlkXG4gICAgICB9KVxuICAgICAgcmV0dXJuIHJlY29yZFxuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBzdGFzaElkID0gdXVpZHY0KClcbiAgICAgIGF3YWl0IGNsbi5wdXQoey4uLnJlY29yZCwgaWQ6IHN0YXNoSWQsIG9yaWdpbmFsSWQ6IHJlY29yZC5pZH0pXG4gICAgICBhd2FpdCB0aGlzLiNyZWNvcmRNYXBwZXIuc2V0U3Rhc2hJZChyZWNvcmQsIHN0YXNoSWQpXG4gICAgICByZXR1cm4gey4uLnJlY29yZCwgc3Rhc2hJZH1cbiAgICB9XG4gIH1cblxuICAvKlxuICAgKiBXcmFwcGVyIGZvciBgQ29sbGVjdGlvbi5nZXRgIGJ1dCB0YWtlcyBhIG51bWVyaWMgSURcbiAgICogYW5kIHJldHVybnMgYFRgLlxuICAgKiBcbiAgICogU2VlIGFsc28gaHR0cHM6Ly9kb2NzLmNpcGhlcnN0YXNoLmNvbS90c2RvYy9jbGFzc2VzL19jaXBoZXJzdGFzaF9zdGFzaGpzLkNvbGxlY3Rpb24uaHRtbCNnZXRcbiAgICovXG4gIGFzeW5jIGdldChpZDogbnVtYmVyKTogUHJvbWlzZTxUIHwgbnVsbD4ge1xuICAgIGNvbnN0IGNsbiA9IGF3YWl0IHRoaXMuI2NvbGxlY3Rpb25cbiAgICBsZXQgc3Rhc2hJZHMgPSBhd2FpdCB0aGlzLiNyZWNvcmRNYXBwZXIuZmluZFN0YXNoSWRzRm9yKFtpZF0pXG4gIFxuICAgIGlmIChzdGFzaElkcyAmJiBzdGFzaElkc1swXSkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY2xuLmdldChzdGFzaElkc1swXSlcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgcmV0dXJuIHsgLi4ucmVzdWx0LCBzdGFzaElkOiByZXN1bHQuaWQsIGlkIH0gYXMgdW5rbm93biBhcyBUXG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsXG4gIH1cblxuICBhc3luYyBnZXRBbGwoaWRzOiBBcnJheTxudW1iZXI+KTogUHJvbWlzZTxBcnJheTxUPj4ge1xuICAgIGNvbnN0IGNsbiA9IGF3YWl0IHRoaXMuI2NvbGxlY3Rpb25cbiAgICBsZXQgc3Rhc2hJZHMgPSBhd2FpdCB0aGlzLiNyZWNvcmRNYXBwZXIuZmluZFN0YXNoSWRzRm9yKGlkcylcbiAgICBsZXQgcmVzdWx0cyA9IGF3YWl0IGNsbi5nZXRBbGwoc3Rhc2hJZHMpXG5cbiAgICByZXR1cm4gcmVzdWx0cy5tYXAoKHJlY29yZCkgPT4ge1xuICAgICAgY29uc3Qgb3JpZ2luYWxJZCA9IHJlY29yZC5vcmlnaW5hbElkXG4gICAgICBkZWxldGUgKHJlY29yZCBhcyBhbnkpLm9yaWdpbmFsSWRcbiAgICAgIHJldHVybiB7Li4ucmVjb3JkLCBzdGFzaElkOiByZWNvcmQuaWQsIGlkOiBvcmlnaW5hbElkfSBhcyB1bmtub3duIGFzIFRcbiAgICB9KVxuICB9XG5cbiAgYXN5bmMgZGVsZXRlKGlkOiBudW1iZXIpIHtcbiAgICBjb25zdCBjbG4gPSBhd2FpdCB0aGlzLiNjb2xsZWN0aW9uXG4gICAgbGV0IHN0YXNoSWRzID0gYXdhaXQgdGhpcy4jcmVjb3JkTWFwcGVyLmZpbmRTdGFzaElkc0ZvcihbaWRdKVxuICBcbiAgICBpZiAoc3Rhc2hJZHMubGVuZ3RoID09IDApIHJldHVyblxuICAgIGlmICghc3Rhc2hJZHNbMF0pIHJldHVyblxuXG4gICAgYXdhaXQgY2xuLmRlbGV0ZShzdGFzaElkc1swXSlcbiAgICBhd2FpdCB0aGlzLiNyZWNvcmRNYXBwZXIuc2V0U3Rhc2hJZCh7aWR9LCBudWxsKVxuICB9XG5cbiAgYXN5bmMgcXVlcnkoXG4gICAgY2FsbGJhY2tPclF1ZXJ5T3B0aW9uczogUXVlcnlDYWxsYmFja09yT3B0aW9uczxUPixcbiAgICBxdWVyeU9wdGlvbnM/OiBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFQ+XG4gICk6IFByb21pc2U8QXJyYXk8VD4+IHtcbiAgICBjb25zdCBjb2xsZWN0aW9uID0gYXdhaXQgdGhpcy4jY29sbGVjdGlvblxuICAgIGxldCByZXN1bHQgPSBhd2FpdCAocXVlcnlPcHRpb25zID8gXG4gICAgICBjb2xsZWN0aW9uLnF1ZXJ5KGNhbGxiYWNrT3JRdWVyeU9wdGlvbnMsIHF1ZXJ5T3B0aW9ucykgOlxuICAgICAgY29sbGVjdGlvbi5xdWVyeShjYWxsYmFja09yUXVlcnlPcHRpb25zKSlcblxuICAgIHJldHVybiByZXN1bHQuZG9jdW1lbnRzLm1hcChyZWNvcmQgPT4gKFxuICAgICAgeyAuLi5yZWNvcmQsIGlkOiByZWNvcmQub3JpZ2luYWxJZCB9IGFzIHVua25vd24gYXMgVFxuICAgICkpXG4gIH1cblxuICBhc3luYyBsaXN0KG9wdGlvbnM/OiBDb2xsZWN0aW9uUXVlcnlPcHRpb25zPFQ+KTogUHJvbWlzZTxBcnJheTxUPj4ge1xuICAgIHJldHVybiBhd2FpdCB0aGlzLnF1ZXJ5KG9wdGlvbnMgPyBvcHRpb25zIDoge30pXG4gIH1cbn1cbiJdfQ==