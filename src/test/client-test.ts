import { SyncClient } from "../client";
import { JSONArray } from "../json-types";
import { Logger } from "../logger";
import { StateStore } from "../state-var";

const log = new Logger('clientTest');
const client = new SyncClient(`ws://localhost:8000`);

const nameVar: StateStore<string> = client.getVar('name')
nameVar.updateValue('akram');


const arrVar: StateStore<number[]> = client.getVar('array');
arrVar.onSync(value => console.log(value));

setInterval(() => {
    console.log('Updating....');
    const val = arrVar.getValue() || [];
    arrVar.updateValue([...val, val.length]);
    // setTimeout(() => {
    //     process.exit();
    // }, 2000);
}, 5000);