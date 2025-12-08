const winston = require("winston");

export class Logger {
  constructor() {
    loglevel = ["error", "warn", "info", "http", "verbose", "debug", "silly"];
  }

  createLogger({ level = 0 }) {
    const logger = winston.createLogger({
      level: this.loglevel[level],
      format: winston.format.json,
      exitOnError: true,
      silent: false,
      levels: winston.config.npm.colors,
      transports: [
        new winston.transports.File({
          filename: `${this.loglevel[level]}.log`,
        }),
        new winston.transports.Console(),
        new winston.transports.Http({}),
      ],
    });

    return { logger };
  }
}
