const { EmbedBuilder } = require("discord.js")

module.exports = {
  name: "guildMemberAdd",
  async execute(member, bot) {
    try {
      // Add user to database
      await bot.database.createUser({
        id: member.user.id,
        username: member.user.username,
        discriminator: member.user.discriminator,
        avatar: member.user.avatar,
      })

      // Get welcome channel from config
      const welcomeChannelId = await bot.database.getConfig("welcome_channel")
      if (!welcomeChannelId) return

      const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId)
      if (!welcomeChannel) return

      const welcomeEmbed = new EmbedBuilder()
        .setTitle("🎉 Bem-vindo(a)!")
        .setDescription(`Olá ${member.user}, seja bem-vindo(a) ao **${member.guild.name}**!`)
        .setColor("#00ff00")
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: "👥 Membro", value: `#${member.guild.memberCount}`, inline: true },
          { name: "📅 Conta criada", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
        )
        .setTimestamp()
        .setFooter({ text: member.guild.name, iconURL: member.guild.iconURL() })

      await welcomeChannel.send({ embeds: [welcomeEmbed] })
    } catch (error) {
      bot.logger.error("Error in guildMemberAdd event:", error)
    }
  },
}
