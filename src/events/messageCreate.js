module.exports = {
  name: "messageCreate",
  async execute(message, bot) {
    if (message.author.bot) return

    try {
      // Auto-moderation check
      if (bot.autoMod) {
        await bot.autoMod.checkMessage(message)
      }
    } catch (error) {
      bot.logger.error("Error in messageCreate event:", error)
    }
  },
}
