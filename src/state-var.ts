import getDiff, { applyDiff } from "./diff-lib";
import { JSONDiff, JSONValue } from "./json-types";
import { throttle } from "lodash";
import { Logger } from "./logger";

export type StateDiff = {
    time: number
    seqNum: number
    diff: JSONDiff
}

type OnSyncCallback<T> = (value: T, oldValue: T) => void;
type OnUpdateCallback<T> = (value: T, oldValue: T) => void;

class StateValue<T extends JSONValue> {
    private value: T
    private time: number
    private seqNum: number;
    private onSyncListeners: Set<OnSyncCallback<T>>;
    private onUpdateListeners: Set<OnUpdateCallback<T>>;

    constructor() {
        this.value = null;
        this.time = 1;
        this.seqNum = 1;
        this.onSyncListeners = new Set();
        this.onUpdateListeners = new Set();
    }

    getValue(): T {
        return this.value;
    }

    onSync(callback: OnSyncCallback<T>) {
        this.onSyncListeners.add(callback);
    }

    onUpdate(callback: OnUpdateCallback<T>) {
        this.onUpdateListeners.add(callback);
    }

    removeListener(callback: OnSyncCallback<T> | OnUpdateCallback<T>): boolean {
        return this.onSyncListeners.delete(callback) || this.onUpdateListeners.delete(callback);
    }

    sync(newState: StateValue<T>) {
        if (newState.time <= this.time) return;

        const oldValue = this.value;
        this.value = newState.value;
        this.time = newState.time;
        this.seqNum++;
        this.onSyncListeners.forEach((listener) => {
            listener(this.value, oldValue);
        })
    }

    updateDiff(stateDiff: StateDiff) {
        if (stateDiff.time <= this.time || stateDiff.seqNum <= this.seqNum) return;
        if (stateDiff.seqNum > this.seqNum + 1) throw Error("Out of sequence state diff received");

        const oldValue = this.value;
        this.value = applyDiff(this.value, stateDiff.diff) as T;
        this.time = stateDiff.time;
        this.seqNum = stateDiff.seqNum;
        
        this.onUpdateListeners.forEach((listener) => {
            listener(this.value, oldValue);
        })
    }

    updateValue(newValue: T) {
        const oldValue = this.value;
        this.value = newValue;
        this.time = Date.now();
        this.seqNum++;

        this.onUpdateListeners.forEach(listener => {
            listener(this.value, oldValue);
        });
    }

    isNewerThan(otherState: StateValue<T>): boolean {
        return this.time > otherState.time;
    }

    getDiffFrom(oldValue: T): StateDiff {
        return {
            time: this.time,
            seqNum: this.seqNum,
            diff: getDiff(oldValue, this.value)
        }
    }

}

const SELF = 'SELF';

export class StateStore<T extends JSONValue> extends StateValue<T> {
    private log: Logger;
    private peerStates: Map<string, StateValue<T>>
    syncPeersThrottled: () => void

    constructor() {
        super();
        this.log = new Logger('StateStore');
        this.peerStates = new Map();
        this.peerStates.set(SELF, this);
        this.syncPeersThrottled = throttle(this.syncPeers, 100, { leading: true }).bind(this);
        this.onUpdate(this.syncPeersThrottled);
        this.onSync(this.syncPeersThrottled);
    }

    getPeerState(peerId: string): StateValue<T> {
        if (!this.peerStates.has(peerId)) {
            const peerValue = new StateValue<T>();
            peerValue.onUpdate(() => {
                this.sync(peerValue);
            });
            this.peerStates.set(peerId, peerValue);
        }
        return this.peerStates.get(peerId);
    }

    syncPeers() {
        let latestState: StateValue<T> = this;
        for (const [peerId, peerState] of this.peerStates) {
            if (peerState.isNewerThan(latestState)) {
                latestState = peerState;
            }
        }

        for (const [peerId, peerState] of this.peerStates) {
            // Skip the latest state for sync
            if (latestState.isNewerThan(peerState)){
                peerState.sync(latestState);
            }
        }
    }
}