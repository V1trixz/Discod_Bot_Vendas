const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket-stats")
    .setDescription("Ver estatísticas dos tickets")
    .addUserOption((option) =>
      option.setName("usuario").setDescription("Ver estatísticas de um usuário específico").setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, bot) {
    const targetUser = interaction.options.getUser("usuario")

    try {
      await interaction.deferReply()

      let stats
      let title

      if (targetUser) {
        // User-specific stats
        stats = await bot.database.all(
          "SELECT status, COUNT(*) as count FROM tickets WHERE user_id = ? GROUP BY status",
          [targetUser.id],
        )
        title = `📊 Estatísticas de Tickets - ${targetUser.tag}`
      } else {
        // Server-wide stats
        stats = await bot.database.all("SELECT status, COUNT(*) as count FROM tickets GROUP BY status")
        title = "📊 Estatísticas Gerais de Tickets"
      }

      // Calculate totals
      let totalTickets = 0
      let openTickets = 0
      let closedTickets = 0

      stats.forEach((stat) => {
        totalTickets += stat.count
        if (stat.status === "open") openTickets = stat.count
        if (stat.status === "closed") closedTickets = stat.count
      })

      // Get recent tickets
      const recentQuery = targetUser
        ? "SELECT * FROM tickets WHERE user_id = ? ORDER BY created_at DESC LIMIT 5"
        : "SELECT * FROM tickets ORDER BY created_at DESC LIMIT 5"

      const recentParams = targetUser ? [targetUser.id] : []
      const recentTickets = await bot.database.all(recentQuery, recentParams)

      // Create embed
      const embed = new EmbedBuilder().setTitle(title).setColor("#0099ff").setTimestamp()

      // Add stats fields
      embed.addFields(
        { name: "📈 Total de Tickets", value: totalTickets.toString(), inline: true },
        { name: "🟢 Tickets Abertos", value: openTickets.toString(), inline: true },
        { name: "🔴 Tickets Fechados", value: closedTickets.toString(), inline: true },
      )

      // Add recent tickets
      if (recentTickets.length > 0) {
        const recentList = recentTickets
          .map((ticket, index) => {
            const date = new Date(ticket.created_at).toLocaleDateString("pt-BR")
            const status = ticket.status === "open" ? "🟢" : "🔴"
            const channel = interaction.guild.channels.cache.get(ticket.channel_id)
            const channelName = channel ? channel.name : "Canal deletado"

            return `**${index + 1}.** ${status} ${channelName} - ${date}`
          })
          .join("\n")

        embed.addFields({ name: "📝 Tickets Recentes", value: recentList, inline: false })
      }

      if (targetUser) {
        embed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      } else {
        embed.setThumbnail(interaction.guild.iconURL())
      }

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      bot.logger.error("Error in ticket-stats command:", error)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao buscar as estatísticas")
            .setColor("#ff0000"),
        ],
      })
    }
  },
}
