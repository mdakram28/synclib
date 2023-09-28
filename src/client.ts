import { StateDiff, StateStore } from './state-var';
import { Logger } from './logger';

export class SyncClient {
    socket: WebSocket
    stateVars: Map<string, StateStore> = new Map();
    log = new Logger('SyncClient');

    getVar(name: string) {
        if (!this.stateVars.has(name)) {
            this.stateVars.set(name, new StateStore());
        }
        return this.stateVars.get(name);
    }

    constructor(public url: string) {
        this.socket = new WebSocket(url);
        const peerId = `SERVER`;

        this.socket.onopen = () => {
            this.log.info("Connected");
            this.log.debug("State Vars", this.stateVars);

            for (const [name, stateVar] of this.stateVars) {
                const packet = {
                    event: 'subscribe',
                    data: {
                        name
                    }
                };
                this.log.debug('Sending to WS', packet);
                this.socket.send(JSON.stringify(packet));

                stateVar.getPeerState(peerId).onUpdate = (stateDiff: StateDiff) => {
                    this.socket.send(JSON.stringify({
                        event: 'sync',
                        data: {
                            name,
                            value: stateDiff
                        }
                    }));
                };
                stateVar.syncThrottled();
            }
        };

        this.socket.onmessage = (ev) => {
            // console.log(ev);
            const { event, data } = JSON.parse(ev.data);
            this.log.debug('Message', event, data);
            if (event === "sync") {
                const name: string = data.name;
                const stateDiff: StateDiff = data.value;

                const stateVar = this.getVar(name);
                stateVar.getPeerState(peerId).updateDiff(stateDiff);
                stateVar.syncThrottled();
            }
        };
    }
}