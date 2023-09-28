import getDiff, { applyDiff } from "./diff-lib";
import { JSONDiff, JSONValue } from "./json-types";
import { throttle } from "lodash";
import { Logger } from "./logger";

export type StateDiff = {
    time: number
    seqNum: number
    diff: JSONDiff
}

type OnUpdateCallback = (stateDiff: StateDiff) => void;

class StateValue {
    public value: JSONValue
    public time: number
    public seqNum: number;
    onUpdate: OnUpdateCallback;

    constructor() {
        this.value = null;
        this.time = 1;
        this.seqNum = 1;
    }

    update(newState: StateValue) {
        const diff = getDiff(this.value, newState.value);
        this.value = newState.value;
        this.time = newState.time;
        this.seqNum++;

        if (this.onUpdate) {
            this.onUpdate({
                time: this.time,
                seqNum: this.seqNum,
                diff
            });
        }
    }

    updateDiff(stateDiff: StateDiff) {
        if (stateDiff.time <= this.time || stateDiff.seqNum <= this.seqNum) return;
        if (stateDiff.seqNum > this.seqNum+1) throw Error("Out of sequence state diff received");

        this.value = applyDiff(this.value, stateDiff.diff);
        this.time = stateDiff.time;
        this.seqNum = stateDiff.seqNum;
    }

}

const SELF = 'SELF';

export class StateStore {
    log = new Logger('StateStore')
    self: StateValue
    peerStates: Map<string, StateValue>
    syncThrottled: () => void

    constructor() {
        this.peerStates = new Map();
        this.self = new StateValue();
        this.peerStates.set(SELF, this.self);
        this.syncThrottled = throttle(this.sync, 1000, {leading: true});
    }

    getPeerState(peerId: string): StateValue {
        if (!this.peerStates.has(peerId)) {
            this.peerStates.set(peerId, new StateValue());
        }
        return this.peerStates.get(peerId);
    }
 
    sync() {
        this.log.debug('Sync');
        let latestState = this.self;
        for (const [peerId, peerState] of this.peerStates) {
            if (peerState.time > latestState.time) {
                latestState = peerState;
            }
        }
        
        for(const [peerId, peerState] of this.peerStates) {
            // Skip the latest state for sync
            if (peerState.time === latestState.time) continue;
            peerState.update(latestState);
        }
    }

    updateSelf(newValue: JSONValue) {
        this.self.value = newValue;
        this.self.time = Date.now();
        this.self.seqNum++;
        this.syncThrottled();
    }

}