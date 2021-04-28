/**
 * Inspired by https://github.com/dirigeants/cache/blob/master/src/Cache.ts
 * @author: Dirigeants Organization (dirigeants)
 */

export class Cache<K, V> extends Map<K, V> {
    public get first(): [K, V] | null {
        return this.size ? this.entries().next().value : null;
    }

    public get firstValue(): V | null {
        return this.size ? this.values().next().value : null;
    }

    public get firstKey(): K | null {
        return this.size ? this.keys().next().value : null;
    }

    public get last(): [K, V] | null {
        return this.size ? [...this.entries()][this.size - 1] : null;
    }

    public get lastValue(): V | null {
        return this.size ? [...this.values()][this.size - 1] : null;
    }

    public get lastKey(): K | null {
        return this.size ? [...this.keys()][this.size - 1] : null;
    }

    public find(fn: (value: V, key: K, map: this) => boolean, thisArg?: any): [K, V] | undefined {
        if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);

        for (const [key, val] of this) if (fn(val, key, this)) return [key, val];
        return undefined;
    }

    public findKey(fn: (value: V, key: K, map: this) => boolean, thisArg?: any): K | undefined {
        if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);

        for (const [key, val] of this) if (fn(val, key, this)) return key;
        return undefined;
    }

    public findValue(fn: (value: V, key: K, map: this) => boolean, thisArg?: any): V | undefined {
        if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);

        for (const [key, val] of this) if (fn(val, key, this)) return val;
        return undefined;
    }

    public sweep(fn: (value: V, key: K, map: this) => boolean, thisArg?: any): number {
        if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);

        const previousSize = this.size;
        for (const [key, val] of this) if (fn(val, key, this)) this.delete(key);
        return previousSize - this.size;
    }

    public filter(fn: (value: V, key: K, map: this) => boolean, thisArg?: any): Cache<K, V> {
        if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);

        const results = new (this.constructor as typeof Cache)[Symbol.species]() as Cache<K, V>;
        for (const [key, val] of this) if (fn(val, key, this)) results.set(key, val);
        return results;
    }

    public map<T = any>(fn: (value: V, key: K, map: this) => T, thisArg?: any): T[] {
        if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);

        const arr = [];
        let i = 0;
        for (const [key, val] of this) arr[i++] = fn(val, key, this);
        return arr;
    }

    public some(fn: (value: V, key: K, map: this) => boolean, thisArg?: any): boolean {
        if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);

        for (const [key, val] of this) if (fn(val, key, this)) return true;
        return false;
    }

    public every(fn: (value: V, key: K, map: this) => boolean, thisArg?: any): boolean {
        if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);

        for (const [key, val] of this) if (!fn(val, key, this)) return false;
        return true;
    }

    public reduce<I>(
        fn: (accumulator: I, value: V, key: K, map: this) => I,
        initialValue: I,
        thisArg?: any
    ): I {
        if (typeof thisArg !== 'undefined') fn = fn.bind(thisArg);
        let accumulator = initialValue;

        for (const [key, val] of this) accumulator = fn(accumulator, val, key, this);
        return accumulator;
    }

    public clone(): Cache<K, V> {
        return new (this.constructor as typeof Cache)[Symbol.species](this) as Cache<K, V>;
    }

    public concat(...caches: Cache<K, V>[]): Cache<K, V> {
        const newColl = this.clone();
        for (const coll of caches) for (const [key, val] of coll) newColl.set(key, val);
        return newColl;
    }

    public equals(cache: Cache<K, V>): boolean {
        return (
            this === cache ||
            (this.size === cache.size && this.every((value, key) => cache.get(key) === value))
        );
    }

    public sort(
        compareFunction: (v0: V, v1: V, k0?: K, k1?: K) => number = (first, second): number =>
            +(first > second) || +(first === second) - 1
    ): this {
        const entries = [...this.entries()].sort((e0, e1) =>
            compareFunction(e0[1], e1[1], e0[0], e1[0])
        );
        this.clear();
        for (const [key, value] of entries) this.set(key, value);
        return this;
    }

    public sorted(
        compareFunction: (v0: V, v1: V, k0?: K, k1?: K) => number = (first, second): number =>
            +(first > second) || +(first === second) - 1
    ): Cache<K, V> {
        const entries = [...this.entries()].sort((e0, e1) =>
            compareFunction(e0[1], e1[1], e0[0], e1[0])
        );
        return new (this.constructor as typeof Cache)(entries);
    }
}
