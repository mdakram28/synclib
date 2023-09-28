import { SyncClient } from "../client";
import { JSONArray } from "../json-types";
import { Logger } from "../logger";

const log = new Logger('clientTest');
const client = new SyncClient(`ws://localhost:8000`);

client.getVar('name').updateSelf('akram');

const arr = client.getVar('array');

arr.self.onUpdate = () => {
    log.info(arr.self.value);
}

setInterval(() => {
    console.log('Updating....');
    const val = (arr.self.value || [])as JSONArray;
    arr.updateSelf([...val, val.length]);
}, 5000);