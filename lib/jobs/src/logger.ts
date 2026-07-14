import pino, { type Logger } from "pino";

const isProduction = process.env.NODE_ENV === "production";
const inNextJs = Boolean(process.env.NEXT_RUNTIME);

declare global {
  // eslint-disable-next-line no-var -- shared with @workspace/content-engine/logger
  var __goalsAcPinoLogger: Logger | undefined;
}

function createLogger(): Logger {
  const base = { level: process.env.LOG_LEVEL ?? "info" };

  if (isProduction || inNextJs) {
    return pino(base);
  }

  return pino({
    ...base,
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });
}

export const logger = globalThis.__goalsAcPinoLogger ?? createLogger();

if (!isProduction) {
  globalThis.__goalsAcPinoLogger = logger;
}
