const timestamp = () => new Date().toISOString();

export const logger = {
    info: (msg: string, ...args: unknown[]) =>
        console.log(JSON.stringify({ level: "info", time: timestamp(), msg, ...flatArgs(args) })),
    warn: (msg: string, ...args: unknown[]) =>
        console.warn(JSON.stringify({ level: "warn", time: timestamp(), msg, ...flatArgs(args) })),
    error: (msg: string, ...args: unknown[]) =>
        console.error(JSON.stringify({ level: "error", time: timestamp(), msg, ...flatArgs(args) })),
    debug: (msg: string, ...args: unknown[]) =>
        process.env["NODE_ENV"] !== "production" &&
        console.debug(JSON.stringify({ level: "debug", time: timestamp(), msg, ...flatArgs(args) })),
};

function flatArgs(args: unknown[]) {
    if (args.length === 0) return {};
    if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) return args[0];
    return { extra: args };
}
