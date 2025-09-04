const express = require("express")
const router = express.Router()

// Get bot stats
router.get("/stats", async (req, res) => {
  try {
    const bot = req.app.locals.bot

    const stats = {
      guilds: bot.client.guilds.cache.size,
      users: bot.client.users.cache.size,
      channels: bot.client.channels.cache.size,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      status: bot.client.user ? "online" : "offline",
    }

    res.json(stats)
  } catch (error) {
    res.status(500).json({ error: "Failed to get stats" })
  }
})

// Get server configuration
router.get("/config", async (req, res) => {
  try {
    const bot = req.app.locals.bot

    const config = {
      server_name: (await bot.database.getConfig("server_name")) || "Meu Servidor",
      welcome_channel: await bot.database.getConfig("welcome_channel"),
      ticket_category: await bot.database.getConfig("ticket_category"),
      mod_log_channel: await bot.database.getConfig("mod_log_channel"),
    }

    res.json(config)
  } catch (error) {
    res.status(500).json({ error: "Failed to get configuration" })
  }
})

module.exports = router
