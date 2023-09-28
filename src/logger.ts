
enum LogLevel {
    ERROR,
    INFO,
    DEBUG
}

export class Logger {
    level: LogLevel.INFO;
    constructor(public name: string) {}

    error(...args: any) {
        if (this.level > LogLevel.ERROR) return;
        console.error(`${this.name.padEnd(15)} - ERROR`, ...args);
    }

    info(...args: any) {
        if (this.level > LogLevel.INFO) return;
        console.log  (`${this.name.padEnd(15)} - INFO `, ...args);
    }

    debug(...args: any) {
        if (this.level > LogLevel.DEBUG) return;
        console.debug(`${this.name.padEnd(15)} - DEBUG`, ...args);
    }
}