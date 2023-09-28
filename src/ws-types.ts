import { JSONDiff } from "./json-types"
import { log } from "./logger"
import { StateDiff } from "./state-var"

interface Sender {
    send(message: string)
}

interface Receiver {
    onmessage?: (ev: any) => void
    on?: (evType: string, cb: (ev: any) => void) => void
}

type EventType = 
{
    event: 'sync',
    data: {
        name: string,
        value: StateDiff
    }
} | {
    event: 'subscribe',
    data: {
        name: string
    }
}

export function sendEvent<T extends Sender>(ws: T, event: EventType) {
    const msg = JSON.stringify(event);
    log.debug("Sending Event", msg);
    ws.send(msg);
}

export function onEvent<T extends Receiver>(ws: T, callback: (event: EventType) => void) {
    if (typeof window === 'undefined') {
        // Nodejs
        log.debug("Listening to messages");
        ws.on('message', (ev) => {
            const msg = ev.toString();
            log.debug("Received Event", msg);
            callback(JSON.parse(msg));
        });
    } else {
        // Browser
        ws.onmessage = (ev) => {
            log.debug("Received Event", ev.data);
            callback(JSON.parse(ev.data));
        };
    }
}