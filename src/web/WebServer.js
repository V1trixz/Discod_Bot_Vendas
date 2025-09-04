const express = require("express")
const cors = require("cors")
const path = require("path")

class WebServer {
  constructor(bot) {
    this.bot = bot
    this.app = express()
    this.port = process.env.WEB_PORT || 3000

    this.setupMiddleware()
    this.setupRoutes()
  }

  setupMiddleware() {
    this.app.use(cors())
    this.app.use(express.json())
    this.app.use(express.static(path.join(__dirname, "public")))

    this.app.locals.bot = this.bot
  }

  setupRoutes() {
    // API Routes
    this.app.use("/api", require("./routes/api"))
    this.app.use("/api/products", require("./routes/products")(this.bot))
    this.app.use("/api/orders", require("./routes/orders")(this.bot))
    this.app.use("/api/dashboard", require("./routes/dashboard")(this.bot))

    this.app.use("/webhook", require("./routes/webhooks")(this.bot.paymentManager))

    // Dashboard route
    this.app.get("/", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"))
    })

    this.app.get("/dashboard", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "dashboard.html"))
    })

    // Health check
    this.app.get("/health", (req, res) => {
      res.json({
        status: "ok",
        uptime: process.uptime(),
        bot_status: this.bot.client.user ? "online" : "offline",
      })
    })
  }

  async start() {
    return new Promise((resolve) => {
      this.server = this.app.listen(this.port, () => {
        this.bot.logger.success(`Web server started on port ${this.port}`)
        resolve()
      })
    })
  }

  stop() {
    if (this.server) {
      this.server.close()
    }
  }
}

module.exports = WebServer
