const fs = require("fs")
const path = require("path")

async function setup() {
  try {
    console.log("🤖 Configuração do Discord Bot Avançado")
    console.log("=====================================\n")

    const defaultConfig = {
      discordToken: process.env.DISCORD_TOKEN || "SEU_DISCORD_TOKEN_AQUI",
      clientId: process.env.CLIENT_ID || "SEU_CLIENT_ID_AQUI",
      botStatus: process.env.BOT_STATUS || "Assistindo: Criado por v1trixzthegod",
      activityType: process.env.BOT_ACTIVITY_TYPE || "Watching",
      statusType: process.env.BOT_STATUS_TYPE || "Idle",
      webPort: process.env.WEB_PORT || "3000",
      webhookUrl: process.env.WEBHOOK_URL || "https://seubot.com",
      dbPath: process.env.DATABASE_PATH || "./data/database.sqlite",
      mpToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || "",
      mpSecret: process.env.MERCADO_PAGO_WEBHOOK_SECRET || "",
      abacateKey: process.env.ABACATE_PAY_API_KEY || "",
    }

    // Verificar se .env já existe
    if (fs.existsSync(".env")) {
      console.log("⚠️  Arquivo .env já existe. Fazendo backup...")
      fs.copyFileSync(".env", ".env.backup")
    }

    // Criar arquivo .env
    const envContent = `# Discord Bot Configuration
DISCORD_TOKEN=${defaultConfig.discordToken}
CLIENT_ID=${defaultConfig.clientId}

# Bot Status
BOT_STATUS=${defaultConfig.botStatus}
BOT_ACTIVITY_TYPE=${defaultConfig.activityType}
BOT_STATUS_TYPE=${defaultConfig.statusType}

# Web Server
WEB_PORT=${defaultConfig.webPort}
WEBHOOK_URL=${defaultConfig.webhookUrl}

# Database
DATABASE_PATH=${defaultConfig.dbPath}

# Payment Gateways (Configure via /configurar-pagamento command)
MERCADO_PAGO_ACCESS_TOKEN=${defaultConfig.mpToken}
MERCADO_PAGO_WEBHOOK_SECRET=${defaultConfig.mpSecret}
ABACATE_PAY_API_KEY=${defaultConfig.abacateKey}
`

    fs.writeFileSync(".env", envContent)

    const dataDir = path.dirname(defaultConfig.dbPath)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
      console.log(`📂 Diretório criado: ${dataDir}`)
    }

    const directories = [
      "src/commands/admin",
      "src/commands/moderation",
      "src/commands/tickets",
      "src/commands/sales",
      "src/events",
      "src/systems",
      "src/payments",
      "src/web/public",
      "src/web/routes",
      "logs",
    ]

    directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        console.log(`📁 Diretório criado: ${dir}`)
      }
    })

    console.log("\n✅ Configuração concluída!")
    console.log("📁 Arquivo .env criado com sucesso")
    console.log("📂 Estrutura de diretórios criada")
    console.log("\n🔧 Próximos passos:")
    console.log("1. Configure seu DISCORD_TOKEN no arquivo .env")
    console.log("2. Configure seu CLIENT_ID no arquivo .env")
    console.log("3. Execute: npm install")
    console.log("4. Execute: npm start")
    console.log(`5. Dashboard: http://localhost:${defaultConfig.webPort}`)
    console.log("\n💡 Use /configurar-pagamento para configurar gateways por servidor")
  } catch (error) {
    console.error("❌ Erro durante a configuração:", error.message)
    process.exit(1)
  }
}

setup()
