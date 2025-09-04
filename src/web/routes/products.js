const express = require("express")
const router = express.Router()

module.exports = (bot) => {
  // Get all products
  router.get("/", async (req, res) => {
    try {
      const products = await bot.database.all(`
        SELECT p.*, 
               COUNT(ps.id) as stock_count,
               COUNT(CASE WHEN ps.used = 1 THEN 1 END) as sold_count
        FROM products p 
        LEFT JOIN product_stock ps ON p.id = ps.product_id 
        WHERE p.active = 1 
        GROUP BY p.id 
        ORDER BY p.created_at DESC
      `)

      res.json(products)
    } catch (error) {
      console.error("Error fetching products:", error)
      res.status(500).json({ error: "Failed to fetch products" })
    }
  })

  // Get product by ID
  router.get("/:id", async (req, res) => {
    try {
      const product = await bot.database.get("SELECT * FROM products WHERE id = ? AND active = 1", [req.params.id])

      if (!product) {
        return res.status(404).json({ error: "Product not found" })
      }

      const stockItems = await bot.database.all("SELECT * FROM product_stock WHERE product_id = ?", [req.params.id])

      res.json({ ...product, stock_items: stockItems })
    } catch (error) {
      console.error("Error fetching product:", error)
      res.status(500).json({ error: "Failed to fetch product" })
    }
  })

  // Create new product
  router.post("/", async (req, res) => {
    try {
      const { name, description, price, category, image_url, embed_color } = req.body

      const result = await bot.database.run(
        "INSERT INTO products (name, description, price, category, image_url, embed_color, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, description, price, category, image_url, embed_color, "dashboard"],
      )

      res.json({ id: result.id, message: "Product created successfully" })
    } catch (error) {
      console.error("Error creating product:", error)
      res.status(500).json({ error: "Failed to create product" })
    }
  })

  // Update product
  router.put("/:id", async (req, res) => {
    try {
      const { name, description, price, category, image_url, embed_color } = req.body

      await bot.database.run(
        "UPDATE products SET name = ?, description = ?, price = ?, category = ?, image_url = ?, embed_color = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [name, description, price, category, image_url, embed_color, req.params.id],
      )

      res.json({ message: "Product updated successfully" })
    } catch (error) {
      console.error("Error updating product:", error)
      res.status(500).json({ error: "Failed to update product" })
    }
  })

  // Delete product
  router.delete("/:id", async (req, res) => {
    try {
      await bot.database.run("UPDATE products SET active = 0 WHERE id = ?", [req.params.id])
      res.json({ message: "Product deleted successfully" })
    } catch (error) {
      console.error("Error deleting product:", error)
      res.status(500).json({ error: "Failed to delete product" })
    }
  })

  return router
}
