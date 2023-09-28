import { SyncClient } from "../src/client";
import { JSONArray } from "../src/json-types";

const client = new SyncClient(`ws://localhost:8000`);

client.getVar('name').updateSelf('akram');

const arr = client.getVar('array');
setInterval(() => {
    console.log('Updating....');
    const val = (arr.self.value || [])as JSONArray;
    arr.updateSelf([...val, val.length]);
}, 5000);