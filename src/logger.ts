
enum LogLevel {
    ERROR,
    INFO,
    DEBUG
}

export class Logger {
    level: LogLevel.INFO;
    constructor(public name: string) { }

    private format(level: string, ...args: any[]): string {
        return args.map(arg => {
            if (typeof arg === "object" && arg !== null) {
                return JSON.stringify(arg, null, 4);
            } else {
                return "" + arg;
            }
        }).join(" ")
            .split("\n")
            .map(line => `${this.name.padEnd(15)} - ${level.padEnd(6)} ${line}`)
            .join('\n');
    }

    error(...args: any) {
        if (this.level > LogLevel.ERROR) return;
        const msg = this.format("ERROR", ...args);
        console.error(msg);
    }

    info(...args: any) {
        if (this.level > LogLevel.INFO) return;
        const msg = this.format("INFO", ...args);
        console.info(msg);
    }

    debug(...args: any) {
        if (this.level > LogLevel.DEBUG) return;
        const msg = this.format("DEBUG", ...args);
        console.debug(msg);
    }
}

export const log = new Logger('Main');