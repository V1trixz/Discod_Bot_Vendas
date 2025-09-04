const express = require("express")
const router = express.Router()

module.exports = (bot) => {
  // Get all orders
  router.get("/", async (req, res) => {
    try {
      const { status, limit = 50, offset = 0 } = req.query

      let query = `
        SELECT o.*, p.name as product_name, u.username 
        FROM orders o 
        LEFT JOIN products p ON o.product_id = p.id 
        LEFT JOIN users u ON o.user_id = u.id
      `
      const params = []

      if (status) {
        query += " WHERE o.status = ?"
        params.push(status)
      }

      query += " ORDER BY o.created_at DESC LIMIT ? OFFSET ?"
      params.push(Number.parseInt(limit), Number.parseInt(offset))

      const orders = await bot.database.all(query, params)

      // Get total count
      const countQuery = status
        ? "SELECT COUNT(*) as total FROM orders WHERE status = ?"
        : "SELECT COUNT(*) as total FROM orders"
      const countParams = status ? [status] : []
      const { total } = await bot.database.get(countQuery, countParams)

      res.json({ orders, total, limit: Number.parseInt(limit), offset: Number.parseInt(offset) })
    } catch (error) {
      console.error("Error fetching orders:", error)
      res.status(500).json({ error: "Failed to fetch orders" })
    }
  })

  // Get order statistics
  router.get("/stats", async (req, res) => {
    try {
      const stats = await bot.database.get(`
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
          SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as total_revenue,
          AVG(CASE WHEN status = 'completed' THEN total_amount ELSE NULL END) as avg_order_value
        FROM orders
      `)

      // Get daily sales for the last 7 days
      const dailySales = await bot.database.all(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as orders,
          SUM(CASE WHEN status = 'completed' THEN total_amount ELSE 0 END) as revenue
        FROM orders 
        WHERE created_at >= DATE('now', '-7 days')
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `)

      res.json({ ...stats, daily_sales: dailySales })
    } catch (error) {
      console.error("Error fetching order stats:", error)
      res.status(500).json({ error: "Failed to fetch order statistics" })
    }
  })

  // Update order status
  router.put("/:id/status", async (req, res) => {
    try {
      const { status } = req.body

      await bot.database.run("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
        status,
        req.params.id,
      ])

      res.json({ message: "Order status updated successfully" })
    } catch (error) {
      console.error("Error updating order status:", error)
      res.status(500).json({ error: "Failed to update order status" })
    }
  })

  return router
}
