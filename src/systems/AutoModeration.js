const { EmbedBuilder } = require("discord.js")

class AutoModeration {
  constructor(bot) {
    this.bot = bot
    this.spamTracker = new Map()
    this.loadFilters()
  }

  async loadFilters() {
    // Load word filters from database
    this.bannedWords = (await this.bot.database.getConfig("banned_words")) || ""
    this.bannedWords = this.bannedWords.split(",").filter((word) => word.trim())

    this.spamLimit = Number.parseInt(await this.bot.database.getConfig("spam_limit")) || 5
    this.spamTimeWindow = Number.parseInt(await this.bot.database.getConfig("spam_time_window")) || 5000
  }

  async checkMessage(message) {
    if (message.author.bot) return
    if (message.member?.permissions.has("ManageMessages")) return

    // Check for banned words
    if (await this.checkBannedWords(message)) return

    // Check for spam
    if (await this.checkSpam(message)) return

    // Check for excessive caps
    if (await this.checkCaps(message)) return

    // Check for excessive mentions
    if (await this.checkMentions(message)) return

    // Check for invite links
    if (await this.checkInvites(message)) return
  }

  async checkBannedWords(message) {
    const content = message.content.toLowerCase()
    const foundWord = this.bannedWords.find((word) => content.includes(word.toLowerCase()))

    if (foundWord) {
      await message.delete()

      // Warn user
      await this.bot.database.run("INSERT INTO mod_logs (user_id, moderator_id, action, reason) VALUES (?, ?, ?, ?)", [
        message.author.id,
        this.bot.client.user.id,
        "warn",
        `Auto-moderação: Palavra proibida "${foundWord}"`,
      ])

      // Send warning
      const embed = new EmbedBuilder()
        .setTitle("⚠️ Palavra Proibida")
        .setDescription(`${message.author}, sua mensagem foi deletada por conter uma palavra proibida.`)
        .setColor("#ff9900")
        .setTimestamp()

      const warningMsg = await message.channel.send({ embeds: [embed] })
      setTimeout(() => warningMsg.delete().catch(() => {}), 5000)

      return true
    }
    return false
  }

  async checkSpam(message) {
    const userId = message.author.id
    const now = Date.now()

    if (!this.spamTracker.has(userId)) {
      this.spamTracker.set(userId, [])
    }

    const userMessages = this.spamTracker.get(userId)

    // Remove old messages outside time window
    const recentMessages = userMessages.filter((timestamp) => now - timestamp < this.spamTimeWindow)
    recentMessages.push(now)

    this.spamTracker.set(userId, recentMessages)

    if (recentMessages.length >= this.spamLimit) {
      // Delete recent messages
      const messagesToDelete = await message.channel.messages.fetch({ limit: this.spamLimit })
      const userSpamMessages = messagesToDelete.filter(
        (msg) => msg.author.id === userId && now - msg.createdTimestamp < this.spamTimeWindow,
      )

      await message.channel.bulkDelete(userSpamMessages)

      // Mute user for 5 minutes
      if (message.member?.moderatable) {
        await message.member.timeout(5 * 60 * 1000, "Auto-moderação: Spam")
      }

      // Log action
      await this.bot.database.run(
        "INSERT INTO mod_logs (user_id, moderator_id, action, reason, duration) VALUES (?, ?, ?, ?, ?)",
        [message.author.id, this.bot.client.user.id, "mute", "Auto-moderação: Spam", 5],
      )

      const embed = new EmbedBuilder()
        .setTitle("🤖 Auto-moderação")
        .setDescription(`${message.author} foi silenciado por 5 minutos por spam.`)
        .setColor("#ff0000")
        .setTimestamp()

      await message.channel.send({ embeds: [embed] })

      // Clear spam tracker for user
      this.spamTracker.delete(userId)
      return true
    }

    return false
  }

  async checkCaps(message) {
    const content = message.content
    if (content.length < 10) return false

    const capsCount = (content.match(/[A-Z]/g) || []).length
    const capsPercentage = (capsCount / content.length) * 100

    if (capsPercentage > 70) {
      await message.delete()

      const embed = new EmbedBuilder()
        .setTitle("⚠️ Excesso de Maiúsculas")
        .setDescription(`${message.author}, evite usar muitas letras maiúsculas.`)
        .setColor("#ff9900")
        .setTimestamp()

      const warningMsg = await message.channel.send({ embeds: [embed] })
      setTimeout(() => warningMsg.delete().catch(() => {}), 5000)

      return true
    }
    return false
  }

  async checkMentions(message) {
    const mentionLimit = 5
    const totalMentions = message.mentions.users.size + message.mentions.roles.size

    if (totalMentions > mentionLimit) {
      await message.delete()

      const embed = new EmbedBuilder()
        .setTitle("⚠️ Excesso de Menções")
        .setDescription(`${message.author}, evite mencionar muitos usuários/cargos de uma vez.`)
        .setColor("#ff9900")
        .setTimestamp()

      const warningMsg = await message.channel.send({ embeds: [embed] })
      setTimeout(() => warningMsg.delete().catch(() => {}), 5000)

      return true
    }
    return false
  }

  async checkInvites(message) {
    const inviteRegex = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/[a-zA-Z0-9]+/gi

    if (inviteRegex.test(message.content)) {
      await message.delete()

      // Warn user
      await this.bot.database.run("INSERT INTO mod_logs (user_id, moderator_id, action, reason) VALUES (?, ?, ?, ?)", [
        message.author.id,
        this.bot.client.user.id,
        "warn",
        "Auto-moderação: Link de convite",
      ])

      const embed = new EmbedBuilder()
        .setTitle("⚠️ Link de Convite")
        .setDescription(`${message.author}, links de convite não são permitidos.`)
        .setColor("#ff9900")
        .setTimestamp()

      const warningMsg = await message.channel.send({ embeds: [embed] })
      setTimeout(() => warningMsg.delete().catch(() => {}), 5000)

      return true
    }
    return false
  }
}

module.exports = AutoModeration
