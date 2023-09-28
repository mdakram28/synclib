import { Logger } from "../logger";
import { SyncServer } from "../server/server";


const log = new Logger('ServerTest');
const server = new SyncServer(8000);

const nameVar = server.getVar('name');
nameVar.onSync(() => {
    console.log(nameVar.getValue());
});