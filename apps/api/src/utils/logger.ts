type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const metaString = meta ? ` | ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`;
}

export const logger = {
  debug(message: string, meta?: unknown) {
    if (LEVEL_SEVERITY['debug'] >= LEVEL_SEVERITY[currentLevel]) {
      console.debug(formatMessage('debug', message, meta));
    }
  },
  info(message: string, meta?: unknown) {
    if (LEVEL_SEVERITY['info'] >= LEVEL_SEVERITY[currentLevel]) {
      console.log(formatMessage('info', message, meta));
    }
  },
  warn(message: string, meta?: unknown) {
    if (LEVEL_SEVERITY['warn'] >= LEVEL_SEVERITY[currentLevel]) {
      console.warn(formatMessage('warn', message, meta));
    }
  },
  error(message: string, meta?: unknown) {
    if (LEVEL_SEVERITY['error'] >= LEVEL_SEVERITY[currentLevel]) {
      console.error(formatMessage('error', message, meta));
    }
  },
};
