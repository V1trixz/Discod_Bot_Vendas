module.exports = {
  name: "ready",
  once: true,
  async execute(client, bot) {
    bot.logger.success(`Bot logged in as ${client.user.tag}`)
    bot.logger.info(`Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} users`)

    // Set custom status
    await bot.setCustomStatus()

    // Register slash commands
    await bot.registerSlashCommands()

    bot.logger.success("Bot is ready and operational!")
  },
}
