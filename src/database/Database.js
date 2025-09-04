const sqlite3 = require("sqlite3").verbose()
const path = require("path")
const fs = require("fs")

class Database {
  constructor() {
    this.dbPath = process.env.DATABASE_PATH || "./data/database.sqlite"
    this.db = null
  }

  async init() {
    // Create data directory if it doesn't exist
    const dataDir = path.dirname(this.dbPath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err)
        } else {
          this.createTables()
          resolve()
        }
      })
    })
  }

  createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT NOT NULL,
                discriminator TEXT,
                avatar TEXT,
                balance REAL DEFAULT 0,
                total_spent REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`,

      // Products table
      `CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                stock INTEGER DEFAULT 0,
                category TEXT,
                image_url TEXT,
                embed_color TEXT DEFAULT '#0099ff',
                created_by TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                active BOOLEAN DEFAULT 1
            )`,

      // Product stock items
      `CREATE TABLE IF NOT EXISTS product_stock (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER,
                content TEXT NOT NULL,
                used BOOLEAN DEFAULT 0,
                used_by TEXT,
                used_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products (id)
            )`,

      `CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                user_name TEXT,
                user_email TEXT,
                user_cpf TEXT,
                product_id INTEGER,
                product_name TEXT,
                quantity INTEGER DEFAULT 1,
                total_amount REAL NOT NULL,
                payment_method TEXT,
                payment_gateway TEXT,
                payment_id TEXT,
                payment_status TEXT DEFAULT 'pending',
                qr_code TEXT,
                pix_copy_paste TEXT,
                status TEXT DEFAULT 'pending',
                delivered_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products (id)
            )`,

      // Tickets table - Updated tickets table with more fields
      `CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT UNIQUE,
                user_id TEXT NOT NULL,
                category TEXT DEFAULT 'geral',
                status TEXT DEFAULT 'open',
                priority TEXT DEFAULT 'normal',
                assigned_to TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                closed_at DATETIME,
                closed_by TEXT,
                close_reason TEXT
            )`,

      `CREATE TABLE IF NOT EXISTS ticket_ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER,
                user_id TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                feedback TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ticket_id) REFERENCES tickets (id)
            )`,

      // Moderation logs
      `CREATE TABLE IF NOT EXISTS mod_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                moderator_id TEXT NOT NULL,
                action TEXT NOT NULL,
                reason TEXT,
                duration INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME
            )`,

      // Server configuration
      `CREATE TABLE IF NOT EXISTS server_config (
                guild_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (guild_id, key)
            )`,

      `CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                order_id TEXT,
                amount REAL NOT NULL,
                payment_method TEXT,
                payment_gateway TEXT,
                gateway_payment_id TEXT,
                status TEXT DEFAULT 'pending',
                webhook_data TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                FOREIGN KEY (order_id) REFERENCES orders (id)
            )`,
    ]

    tables.forEach((table) => {
      this.db.run(table)
    })
  }

  // Generic query methods
  async get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) reject(err)
        else resolve(row)
      })
    })
  }

  async all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err)
        else resolve(rows)
      })
    })
  }

  async run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function (err) {
        if (err) reject(err)
        else resolve({ id: this.lastID, changes: this.changes })
      })
    })
  }

  // User methods
  async getUser(userId) {
    return await this.get("SELECT * FROM users WHERE id = ?", [userId])
  }

  async createUser(userData) {
    const { id, username, discriminator, avatar } = userData
    return await this.run("INSERT OR REPLACE INTO users (id, username, discriminator, avatar) VALUES (?, ?, ?, ?)", [
      id,
      username,
      discriminator,
      avatar,
    ])
  }

  async updateUserBalance(userId, amount) {
    return await this.run("UPDATE users SET balance = balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
      amount,
      userId,
    ])
  }

  // Product methods
  async getProducts() {
    return await this.all("SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC")
  }

  async getProduct(productId) {
    return await this.get("SELECT * FROM products WHERE id = ? AND active = 1", [productId])
  }

  async createProduct(productData) {
    const { name, description, price, stock, category, image_url, embed_color, created_by } = productData
    return await this.run(
      "INSERT INTO products (name, description, price, stock, category, image_url, embed_color, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [name, description, price, stock, category, image_url, embed_color, created_by],
    )
  }

  // Configuration methods
  async getConfig(guildId, key) {
    const result = await this.get("SELECT value FROM server_config WHERE guild_id = ? AND key = ?", [guildId, key])
    return result ? result.value : null
  }

  async setConfig(guildId, key, value) {
    return await this.run(
      "INSERT OR REPLACE INTO server_config (guild_id, key, value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
      [guildId, key, value],
    )
  }

  async getGuildConfigs(guildId) {
    return await this.all("SELECT * FROM server_config WHERE guild_id = ? ORDER BY key", [guildId])
  }

  async deleteConfig(guildId, key) {
    return await this.run("DELETE FROM server_config WHERE guild_id = ? AND key = ?", [guildId, key])
  }

  // Ticket methods
  async getTicket(ticketId) {
    return await this.get("SELECT * FROM tickets WHERE id = ?", [ticketId])
  }

  async createTicket(ticketData) {
    const { channel_id, user_id, category, priority, assigned_to } = ticketData
    return await this.run(
      "INSERT INTO tickets (channel_id, user_id, category, priority, assigned_to) VALUES (?, ?, ?, ?, ?)",
      [channel_id, user_id, category, priority, assigned_to],
    )
  }

  async updateTicketStatus(ticketId, status) {
    return await this.run("UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [
      status,
      ticketId,
    ])
  }

  async closeTicket(ticketId, closedBy, closeReason) {
    return await this.run(
      "UPDATE tickets SET status = 'closed', closed_by = ?, closed_at = CURRENT_TIMESTAMP, close_reason = ? WHERE id = ?",
      [closedBy, closeReason, ticketId],
    )
  }

  // Ticket ratings methods
  async getTicketRatings(ticketId) {
    return await this.all("SELECT * FROM ticket_ratings WHERE ticket_id = ?", [ticketId])
  }

  async createTicketRating(ticketRatingData) {
    const { ticket_id, user_id, rating, feedback } = ticketRatingData
    return await this.run("INSERT INTO ticket_ratings (ticket_id, user_id, rating, feedback) VALUES (?, ?, ?, ?)", [
      ticket_id,
      user_id,
      rating,
      feedback,
    ])
  }

  // Order management methods for payment system
  async getOrder(orderId) {
    return await this.get("SELECT * FROM orders WHERE id = ?", [orderId])
  }

  async createOrder(orderData) {
    const { id, user_id, user_name, user_email, user_cpf, product_id, product_name, quantity, total_amount } = orderData
    return await this.run(
      "INSERT INTO orders (id, user_id, user_name, user_email, user_cpf, product_id, product_name, quantity, total_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, user_id, user_name, user_email, user_cpf, product_id, product_name, quantity, total_amount],
    )
  }

  async updateOrder(orderId, updateData) {
    const fields = Object.keys(updateData)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(updateData)
    values.push(orderId)

    return await this.run(`UPDATE orders SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values)
  }

  async getAvailableStockItem(productId) {
    return await this.get(
      "SELECT * FROM product_stock WHERE product_id = ? AND used = 0 ORDER BY created_at ASC LIMIT 1",
      [productId],
    )
  }

  async updateStockItem(stockItemId, updateData) {
    const fields = Object.keys(updateData)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(updateData)
    values.push(stockItemId)

    return await this.run(`UPDATE product_stock SET ${fields} WHERE id = ?`, values)
  }

  // Transaction management methods
  async createTransaction(transactionData) {
    const { id, user_id, order_id, amount, payment_method, payment_gateway, gateway_payment_id } = transactionData
    return await this.run(
      "INSERT INTO transactions (id, user_id, order_id, amount, payment_method, payment_gateway, gateway_payment_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, user_id, order_id, amount, payment_method, payment_gateway, gateway_payment_id],
    )
  }

  async updateTransaction(transactionId, updateData) {
    const fields = Object.keys(updateData)
      .map((key) => `${key} = ?`)
      .join(", ")
    const values = Object.values(updateData)
    values.push(transactionId)

    return await this.run(`UPDATE transactions SET ${fields} WHERE id = ?`, values)
  }

  async getTransaction(transactionId) {
    return await this.get("SELECT * FROM transactions WHERE id = ?", [transactionId])
  }
}

module.exports = Database
