const express = require("express")
const router = express.Router()

module.exports = (bot) => {
  // Dashboard overview
  router.get("/overview", async (req, res) => {
    try {
      // Get comprehensive statistics
      const stats = await Promise.all([
        // Bot stats
        bot.database.get("SELECT COUNT(*) as total_users FROM users"),
        bot.database.get("SELECT COUNT(*) as total_products FROM products WHERE active = 1"),
        bot.database.get("SELECT COUNT(*) as total_orders FROM orders"),
        bot.database.get('SELECT COUNT(*) as open_tickets FROM tickets WHERE status = "open"'),

        // Revenue stats
        bot.database.get(`
          SELECT 
            SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_revenue,
            COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_sales,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
          FROM orders
        `),

        // Recent activity
        bot.database.all(`
          SELECT 'order' as type, id, user_id, total_amount as value, created_at 
          FROM orders 
          WHERE created_at >= DATE('now', '-24 hours')
          UNION ALL
          SELECT 'ticket' as type, id, user_id, NULL as value, created_at 
          FROM tickets 
          WHERE created_at >= DATE('now', '-24 hours')
          ORDER BY created_at DESC 
          LIMIT 10
        `),
      ])

      const [users, products, orders, tickets, revenue, recentActivity] = stats

      res.json({
        bot_stats: {
          guilds: bot.client.guilds.cache.size,
          users: users.total_users,
          products: products.total_products,
          orders: orders.total_orders,
          tickets: tickets.open_tickets,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          status: bot.client.user ? "online" : "offline",
        },
        revenue_stats: revenue,
        recent_activity: recentActivity,
      })
    } catch (error) {
      console.error("Error fetching dashboard overview:", error)
      res.status(500).json({ error: "Failed to fetch dashboard data" })
    }
  })

  // Get server configurations
  router.get("/config", async (req, res) => {
    try {
      const configs = await bot.database.all("SELECT * FROM server_config ORDER BY key")

      const configObj = {}
      configs.forEach((config) => {
        configObj[config.key] = config.value
      })

      res.json(configObj)
    } catch (error) {
      console.error("Error fetching config:", error)
      res.status(500).json({ error: "Failed to fetch configuration" })
    }
  })

  // Update server configuration
  router.post("/config", async (req, res) => {
    try {
      const updates = req.body

      for (const [key, value] of Object.entries(updates)) {
        await bot.database.setConfig(key, value)
      }

      res.json({ message: "Configuration updated successfully" })
    } catch (error) {
      console.error("Error updating config:", error)
      res.status(500).json({ error: "Failed to update configuration" })
    }
  })

  return router
}
