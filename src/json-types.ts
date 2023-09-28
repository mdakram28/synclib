export type JSONValue =
    | null
    | string
    | number
    | boolean
    | JSONObject
    | JSONArray;

export interface JSONObject {
    [x: string]: JSONValue;
}

export interface JSONArray extends Array<JSONValue> { }

export type JSONDiff = JSONValue
    | {_t: "P"} & JSONObject
    | {_t: "X"}

export enum JSONEnum {
    Null,
    String,
    Number,
    Boolean,
    Object,
    Array
}