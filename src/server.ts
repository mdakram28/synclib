import WebSocket, { WebSocketServer } from 'ws';
import { StateDiff, StateStore } from './state-var';
import { JSONValue } from './json-types';
import { Logger } from './logger';

let clientIdCounter = 1;

export class SyncServer {
    log = new Logger('SyncServer');
    wss: WebSocketServer
    stateVars: Map<string, StateStore> = new Map();


    getVar(name: string) {
        if (!this.stateVars.has(name)) {
            this.stateVars.set(name, new StateStore());
        }
        return this.stateVars.get(name);
    }

    constructor(public port: number) {
        this.wss = new WebSocketServer({
            port: this.port,
            perMessageDeflate: {
                zlibDeflateOptions: {
                    chunkSize: 1024,
                    memLevel: 7,
                    level: 3
                },
                zlibInflateOptions: {
                    chunkSize: 10 * 1024
                },
                threshold: 1024
            }
        });

        this.wss.on('connection', (ws) => {
            ws.on('error', this.log.error);
            const peerId = `CLIENT_${clientIdCounter++}`;
            this.log.info('New Client', peerId);

            ws.on('message', (message: string) => {
                const { event, data } = JSON.parse(message);
                this.log.info('Message', event, data);
                if (event === "sync") {
                    const name: string = data.name;
                    const stateDiff: StateDiff = data.value;

                    const stateVar = this.getVar(name);
                    stateVar.getPeerState(peerId).updateDiff(stateDiff);
                    stateVar.syncThrottled();

                } else if (event === "subscribe") {
                    const name: string = data.name;
                    const stateVar = this.getVar(name);
                    stateVar.getPeerState(peerId).onUpdate = (stateDiff: StateDiff) => {
                        ws.send(JSON.stringify({
                            event: 'sync',
                            data: {
                                name,
                                value: stateDiff
                            }
                        }));
                    }
                    stateVar.syncThrottled();
                }
            });
        });
    }

}