const {
  Client,
  GatewayIntentBits,
  Collection,
  ActivityType,
  PresenceUpdateStatus,
  EmbedBuilder,
} = require("discord.js")
const fs = require("fs")
const path = require("path")
require("dotenv").config()

const Database = require("./database/Database")
const Logger = require("./utils/Logger")
const WebServer = require("./web/WebServer")
const AutoModeration = require("./systems/AutoModeration")
const PaymentManager = require("./payments/PaymentManager")
const SalesSystem = require("./systems/SalesSystem")

class AdvancedBot {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.DirectMessages,
      ],
    })

    this.commands = new Collection()
    this.events = new Collection()
    this.database = new Database()
    this.logger = new Logger()
    this.webServer = new WebServer(this)
    this.autoMod = null
    this.paymentManager = null
    this.salesSystem = null

    this.init()
  }

  async init() {
    try {
      await this.database.init()
      this.logger.success("Database initialized successfully")

      this.paymentManager = new PaymentManager(this.client)
      this.salesSystem = new SalesSystem(this)
      this.logger.success("Payment systems initialized successfully")

      await this.loadCommands()
      await this.loadEvents()

      this.autoMod = new AutoModeration(this)

      await this.webServer.start()

      await this.registerSlashCommands()

      await this.client.login(process.env.DISCORD_TOKEN)

      await this.setCustomStatus()
    } catch (error) {
      this.logger.error("Failed to initialize bot:", error)
      process.exit(1)
    }
  }

  async loadCommands() {
    const commandsPath = path.join(__dirname, "commands")
    const commandFolders = fs.readdirSync(commandsPath)

    for (const folder of commandFolders) {
      const folderPath = path.join(commandsPath, folder)
      const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith(".js"))

      for (const file of commandFiles) {
        const filePath = path.join(folderPath, file)
        const command = require(filePath)

        if ("data" in command && "execute" in command) {
          this.commands.set(command.data.name, command)
          this.logger.info(`Loaded command: ${command.data.name}`)
        } else {
          this.logger.warn(`Command at ${filePath} is missing required "data" or "execute" property`)
        }
      }
    }
  }

  async loadEvents() {
    const eventsPath = path.join(__dirname, "events")
    const eventFiles = fs.readdirSync(eventsPath).filter((file) => file.endsWith(".js"))

    for (const file of eventFiles) {
      const filePath = path.join(eventsPath, file)
      const event = require(filePath)

      if (event.once) {
        this.client.once(event.name, (...args) => event.execute(...args, this))
      } else {
        this.client.on(event.name, (...args) => event.execute(...args, this))
      }
      this.logger.info(`Loaded event: ${event.name}`)
    }
  }

  async setCustomStatus() {
    const statusText = process.env.BOT_STATUS || "Assistindo: Criado por v1trixzthegod"
    const activityType = ActivityType[process.env.BOT_ACTIVITY_TYPE] || ActivityType.Watching
    const statusType = PresenceUpdateStatus[process.env.BOT_STATUS_TYPE] || PresenceUpdateStatus.Idle

    this.client.user.setPresence({
      activities: [
        {
          name: statusText,
          type: activityType,
        },
      ],
      status: statusType,
    })

    this.logger.success(`Status set to: ${statusText}`)
  }

  async logModeration(guild, data) {
    const modLogChannelId = await this.database.getConfig("mod_log_channel")
    if (!modLogChannelId) return

    const modLogChannel = guild.channels.cache.get(modLogChannelId)
    if (!modLogChannel) return

    const embed = new EmbedBuilder()
      .setTitle(`🛡️ ${data.action}`)
      .addFields(
        { name: "Usuário", value: `${data.target.tag} (${data.target.id})`, inline: true },
        { name: "Moderador", value: `${data.moderator.tag} (${data.moderator.id})`, inline: true },
        { name: "Razão", value: data.reason || "Nenhuma razão fornecida", inline: false },
      )
      .setColor(this.getModerationColor(data.action))
      .setTimestamp()
      .setThumbnail(data.target.displayAvatarURL({ dynamic: true }))

    if (data.duration) {
      embed.addFields({
        name: "Duração",
        value: `${data.duration} ${data.action === "mute" ? "minutos" : "dias"}`,
        inline: true,
      })
    }

    if (data.channel) {
      embed.addFields({ name: "Canal", value: data.channel.toString(), inline: true })
    }

    if (data.warnCount) {
      embed.addFields({ name: "Total de Warns", value: data.warnCount.toString(), inline: true })
    }

    await modLogChannel.send({ embeds: [embed] })
  }

  getModerationColor(action) {
    const colors = {
      ban: "#ff0000",
      unban: "#00ff00",
      kick: "#ff9900",
      mute: "#ff9900",
      unmute: "#00ff00",
      warn: "#ffaa00",
      clear: "#0099ff",
    }
    return colors[action.toLowerCase()] || "#0099ff"
  }

  async registerSlashCommands() {
    const { REST, Routes } = require("discord.js")

    const commands = []
    this.commands.forEach((command) => {
      commands.push(command.data.toJSON())
    })

    const rest = new REST().setToken(process.env.DISCORD_TOKEN)

    try {
      this.logger.info(`Started refreshing ${commands.length} application (/) commands.`)

      const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands })

      this.logger.success(`Successfully reloaded ${data.length} application (/) commands.`)
    } catch (error) {
      this.logger.error("Error registering slash commands:", error)
    }
  }
}

new AdvancedBot()
