const chalk = require("chalk")
const moment = require("moment")

class Logger {
  constructor() {
    this.levels = {
      ERROR: { color: chalk.red, label: "ERROR" },
      WARN: { color: chalk.yellow, label: "WARN" },
      INFO: { color: chalk.blue, label: "INFO" },
      SUCCESS: { color: chalk.green, label: "SUCCESS" },
      DEBUG: { color: chalk.gray, label: "DEBUG" },
    }
  }

  log(level, message, ...args) {
    const timestamp = moment().format("YYYY-MM-DD HH:mm:ss")
    const levelConfig = this.levels[level]

    console.log(chalk.gray(`[${timestamp}]`), levelConfig.color(`[${levelConfig.label}]`), message, ...args)
  }

  error(message, ...args) {
    this.log("ERROR", message, ...args)
  }

  warn(message, ...args) {
    this.log("WARN", message, ...args)
  }

  info(message, ...args) {
    this.log("INFO", message, ...args)
  }

  success(message, ...args) {
    this.log("SUCCESS", message, ...args)
  }

  debug(message, ...args) {
    this.log("DEBUG", message, ...args)
  }
}

module.exports = Logger
