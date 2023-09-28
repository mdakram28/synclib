import { WebSocketServer } from 'ws';
import { StateDiff, StateStore } from '../state-var';
import { JSONValue } from '../json-types';
import { Logger } from '../logger';
import getDiff from '../diff-lib';
import { onEvent, sendEvent } from '../ws-types';

let clientIdCounter = 1;

export class SyncServer {
    log = new Logger('SyncServer');
    wss: WebSocketServer
    stateVars: Map<string, StateStore<any>> = new Map();


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

            onEvent(ws, message => {
                if (message.event === "sync") {
                    const {name, value: stateDiff} = message.data;

                    const stateVar = this.getVar(name);
                    stateVar.getPeerState(peerId).updateDiff(stateDiff);
                } else if (message.event === "subscribe") {
                    const name = message.data.name;
                    const stateVar = this.getVar(name);
                    const peerState = stateVar.getPeerState(peerId);
                    peerState.onSync((value, oldValue) => {
                        sendEvent(ws, {
                            event: 'sync',
                            data: {
                                name,
                                value: peerState.getDiffFrom(oldValue)
                            }
                        });
                    });
                    stateVar.syncPeers();
                }
            });
        });
    }

}