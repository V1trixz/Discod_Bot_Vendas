const fs = require("fs")
const path = require("path")
const readline = require("readline")

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve))
}

async function setup() {
  console.log("🤖 Configuração do Bot de Discord Avançado\n")

  const config = {}

  config.DISCORD_TOKEN = await question("Discord Bot Token: ")
  config.CLIENT_ID = await question("Client ID: ")
  config.GUILD_ID = await question("Guild ID (opcional): ")
  config.BOT_PREFIX = (await question("Prefixo do bot (padrão: !): ")) || "!"
  config.BOT_STATUS =
    (await question("Status do bot (padrão: Assistindo: Criado por v1trixzthegod): ")) ||
    "Assistindo: Criado por v1trixzthegod"

  // Create .env file
  let envContent = ""
  for (const [key, value] of Object.entries(config)) {
    envContent += `${key}=${value}\n`
  }

  // Add other default values
  envContent += `
# Database Configuration
DATABASE_PATH=./data/database.sqlite

# Web Dashboard Configuration
WEB_PORT=3000
JWT_SECRET=${generateRandomString(32)}

# Bot Configuration
BOT_ACTIVITY_TYPE=WATCHING
BOT_STATUS_TYPE=idle

# Server Configuration
SERVER_NAME=Meu Servidor
SERVER_LOGO=https://example.com/logo.png
`

  fs.writeFileSync(".env", envContent)

  // Create necessary directories
  const dirs = ["data", "logs", "temp"]
  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  })

  console.log("\n✅ Configuração concluída!")
  console.log("📁 Arquivo .env criado")
  console.log("📂 Diretórios necessários criados")
  console.log("\n🚀 Para iniciar o bot, execute: npm start")

  rl.close()
}

function generateRandomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

setup().catch(console.error)
