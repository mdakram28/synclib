import { StateDiff, StateStore } from './state-var';
import { Logger } from './logger';
import getDiff from './diff-lib';
import { onEvent, sendEvent } from './ws-types';

export class SyncClient {
    socket: WebSocket
    stateVars: Map<string, StateStore<any>> = new Map();
    log = new Logger('SyncClient');

    getVar(name: string) {
        if (!this.stateVars.has(name)) {
            this.stateVars.set(name, new StateStore());
        }
        return this.stateVars.get(name);
    }

    constructor(public url: string) {
        if (typeof WebSocket !== 'undefined') {
            // @ts-ignore WebSocket is awailable
            this.socket = new WebSocket(url);
        } else {
            this.socket = new (require('ws'))(url);
        }
        const peerId = `SERVER`;

        this.socket.onopen = () => {
            this.log.info("Connected");

            for (const [name, stateVar] of this.stateVars) {
                const serverState = stateVar.getPeerState(peerId);
                sendEvent(this.socket, {
                    event: 'subscribe',
                    data: { name }
                });

                serverState.onSync((value, oldValue) => {
                    sendEvent(this.socket, {
                        event: 'sync',
                        data: {
                            name,
                            value: serverState.getDiffFrom(oldValue)
                        }
                    });
                });
            }
        };

        onEvent(this.socket, message => {
            if (message.event === 'sync') {
                const {name, value: stateDiff} = message.data;

                const stateVar = this.getVar(name);
                const serverState = stateVar.getPeerState(peerId);
                serverState.updateDiff(stateDiff);
            }
        });
    }
}