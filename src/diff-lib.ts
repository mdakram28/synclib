/**
 * No Change: undefined
 * Merge:
 * {
 *      "_t": "P",
 *      "newVar": "newValue"
 * }
 * 
 * Delete:
 * {
 *      "_t": "X"
 * }
 * 
 * X: Delete
 * P: Patch Object
 * A: Patch Array
 * S: Patch String
 * U: Unchanged/Undefined
 * 
 * Default behaviour is add
 */
import { JSONArray, JSONDiff, JSONEnum, JSONObject, JSONValue } from './json-types';

const DIFF_DELETE: JSONDiff = { _t: "X" };
const DIFF_UNCHANGED: JSONDiff = { _t: "U" };

export const log = {
    debug: console.debug
}

var diffCache = new WeakMap<JSONObject, WeakMap<JSONObject, JSONDiff>>();

const diffCacheHas = (o1, o2) => diffCache.has(o1) && diffCache.get(o1).has(o2);
const diffCacheGet = (o1, o2) => diffCache.get(o1).get(o2);
const diffCacheSet = (o1, o2, val) => diffCache.get(o1) && diffCache.get(o1).has(o2);

function getJSONType(value: JSONValue): JSONEnum {
    switch (typeof value) {
        case "boolean": return JSONEnum.Boolean;
        case "number": return JSONEnum.Number;
        case "string": return JSONEnum.String;
        case "object":
            // null, array, object
            if (value === null) return JSONEnum.Null;
            else if (Array.isArray(value)) return JSONEnum.Array;
            else return JSONEnum.Object;
        default:
            throw new Error("Invalid JSON Type");
    }
}

const Diff_P_Get = (oldObj: JSONObject, newObj: JSONObject): JSONDiff => {

    if (diffCache.has(oldObj) && diffCache.get(oldObj).has(newObj)) {
        return diffCache.get(oldObj).get(newObj);
    }

    const diff: JSONDiff = {
        '_t': "P"
    };

    // @ts-ignore : We know oldObj and newObj are objects
    for (const key in oldObj) {
        if (oldObj[key] === undefined) continue;

        if (newObj[key] !== undefined) {
            const childDiff = getDiff(oldObj[key], newObj[key]);
            if (childDiff !== undefined) {
                diff[key] = childDiff;
            }
        } else {
            diff[key] = DIFF_DELETE;
        }
    }

    // @ts-ignore : We know oldObj and newObj are objects
    for (const key in newObj) {
        if (newObj[key] === undefined) continue;

        // @ts-ignore : We know oldObj and newObj are objects
        if (oldObj[key] !== undefined) continue;

        diff[key] = newObj[key];
        log.debug(`New key in newObj: ${key}`);
    }

    let ret = undefined;
    for (const key in diff) {
        if (diff[key] !== '_t') {
            ret = diff;
            break;
        };
    }

    if (!diffCache.has(oldObj)) diffCache.set(oldObj, new WeakMap());
    diffCache.get(oldObj).set(newObj, ret);
    return ret;
}

const Diff_P_Apply = (obj: JSONObject, diff: JSONDiff): JSONObject => {

    // @ts-ignore
    for (const key in diff) {
        if (key === '_t') continue;
        const updated = applyDiff(obj[key], diff[key]);
        if (updated !== undefined) {
            obj[key] = updated
        } else {
            delete obj[key];
        }
    }

    return obj;
}

const Diff_A_Get = (oldArr: JSONArray, newArr: JSONArray): JSONDiff => {
    if (oldArr.length === 0) return newArr;

    let start = 0;
    const minLength = Math.min(oldArr.length, newArr.length);

    const diffCache = {};
    for (; start < minLength; start++) {
        const itemDiff = getDiff(oldArr[start], newArr[start]);
        if (itemDiff !== undefined) {
            diffCache[start] = itemDiff;
            break;
        }
    }

    let fromEnd = 0;
    for (; (start + fromEnd) < minLength; fromEnd++) {
        const itemDiff = getDiff(oldArr[oldArr.length - fromEnd - 1], newArr[newArr.length - fromEnd - 1]);
        if (itemDiff !== undefined) {
            diffCache[oldArr.length - fromEnd - 1] = itemDiff;
            break;
        }
    }

    const end = oldArr.length - fromEnd;

    if (end <= start && oldArr.length === newArr.length) {
        return undefined;
    }

    const diffCount = newArr.length - (start + fromEnd);

    const subDiffs = [];
    // [start, end)
    let i = start;
    for (; i < end && i < start + diffCount; i++) {
        const itemDiff = diffCache[i] || getDiff(oldArr[i], newArr[i]);
        if (itemDiff === undefined) {
            subDiffs.push(DIFF_UNCHANGED)
        } else {
            subDiffs.push(itemDiff);
        };
    }

    for (; i < newArr.length - fromEnd; i++) {
        subDiffs.push(newArr[i]);
    }

    const key = `${start}:${end}`;
    return {
        '_t': 'A',
        [key]: subDiffs
    };
}

const Diff_A_Apply = (arr: JSONArray, diff: JSONDiff): JSONArray => {
    log.debug("Appying A diff", arr, diff);
    // @ts-ignore
    for (const key in diff) {
        if (key === '_t') continue;
        const [start, end] = key.split(':').map((val) => parseInt(val));
        const diffs = diff[key];
        const replaceItems = [];

        for (let i = start; i < end && i < (start + diffs.length); i++) {
            const updated = applyDiff(arr[i], diffs[i - start]);
            if (updated !== undefined) {
                replaceItems.push(updated);
            } else {
                throw Error(`Cannot delete item from array using diff`);
            }
        }

        log.debug(start, end, replaceItems);
        for (let i = end - start; i < diffs.length; i++) {
            replaceItems.push(diffs[i]);
        }

        arr.splice(start, end - start, ...replaceItems);
    }

    return arr;

}

const Diff_S_Get = (s1: string, s2: string): JSONDiff => {
    if (s1.length < 50 || s2.length < 50) return s2;
    const arr1 = s1.split("\n");
    const arr2 = s2.split("\n");
    const diff = Diff_A_Get(arr1, arr2);
    if (typeof diff == "object" && diff['_t'] == 'A') {
        diff['_t'] = 'S';
    }
    return diff;
}

const Diff_S_Apply = (s: string, diff: JSONDiff): string => {
    const arr = s.split('\n');
    diff['_t'] = 'A';
    const arr2 = Diff_A_Apply(arr, diff);
    return arr2.join('\n');
}


// Undefined: No change
export default function getDiff(oldObj: JSONValue, newObj: JSONValue): JSONDiff {
    log.debug("Diffing", oldObj, newObj);

    // === will compare string in O(N)
    if (newObj === oldObj) return undefined;
    if (oldObj === undefined) return newObj;
    if (newObj === undefined) return DIFF_DELETE;

    const newType = getJSONType(oldObj);
    const oldType = getJSONType(newObj);

    if (newType !== oldType) return newObj;

    switch (newType) {
        case JSONEnum.Null:
        case JSONEnum.Number:
        case JSONEnum.Boolean:
            return newObj;
        case JSONEnum.String:
            return Diff_S_Get(oldObj as string, newObj as string);
        case JSONEnum.Array:
            return Diff_A_Get(oldObj as JSONArray, newObj as JSONArray);
        case JSONEnum.Object:
            return Diff_P_Get(oldObj as JSONObject, newObj as JSONObject);
    }

}

export function applyDiff(obj: JSONValue, diff: JSONDiff): JSONValue {
    // No change
    if (diff === undefined) return obj;
    if (obj === undefined) return diff;

    const objType = getJSONType(obj);
    const diffType = getJSONType(diff);

    if (diffType !== JSONEnum.Object) return diff;

    switch (objType) {
        case JSONEnum.Null:
        case JSONEnum.Number:
        case JSONEnum.Boolean:
            switch (diff['_t']) {
                case undefined: return diff;
                case 'X': return undefined;
                case 'U': return obj;
                default:
                    throw new Error(`Diff type ${diff['_t']} not supported for ${diffType}`);
            }
        case JSONEnum.String:
            switch (diff['_t']) {
                case undefined: return diff;
                case 'X': return undefined;
                case 'U': return obj;
                case 'S': return Diff_S_Apply(obj as string, diff);
                default:
                    throw new Error(`Diff type ${diff['_t']} not supported for ${diffType}`);
            }
        case JSONEnum.Array:
            switch (diff['_t']) {
                case undefined: return diff;
                case 'X': return undefined;
                case 'U': return obj;
                case 'A': return Diff_A_Apply(obj as JSONArray, diff);
                default:
                    throw new Error(`Diff type ${diff['_t']} not supported for ${diffType}`);
            }

        case JSONEnum.Object:
            switch (diff['_t']) {
                case undefined: return diff;
                case 'X': return undefined;
                case 'U': return obj;
                case 'P': return Diff_P_Apply(obj as JSONObject, diff);
                default:
                    throw new Error(`Diff type ${diff['_t']} not supported for Object`);
            }
    }

}



