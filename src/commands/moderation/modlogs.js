const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("modlogs")
    .setDescription("Ver histórico de moderação de um usuário")
    .addUserOption((option) =>
      option.setName("usuario").setDescription("Usuário para ver o histórico").setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("limite")
        .setDescription("Número de logs para mostrar (padrão: 10)")
        .setMinValue(1)
        .setMaxValue(50)
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, bot) {
    const target = interaction.options.getUser("usuario")
    const limit = interaction.options.getInteger("limite") || 10

    try {
      await interaction.deferReply()

      // Get moderation logs
      const logs = await bot.database.all("SELECT * FROM mod_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", [
        target.id,
        limit,
      ])

      if (logs.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("📋 Histórico de Moderação")
              .setDescription(`**${target.tag}** não possui histórico de moderação`)
              .setColor("#0099ff"),
          ],
        })
      }

      // Count actions
      const actionCounts = {}
      logs.forEach((log) => {
        actionCounts[log.action] = (actionCounts[log.action] || 0) + 1
      })

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle("📋 Histórico de Moderação")
        .setDescription(`Histórico de **${target.tag}**`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setColor("#0099ff")
        .setTimestamp()

      // Add summary
      const summary = Object.entries(actionCounts)
        .map(([action, count]) => `**${action}**: ${count}`)
        .join(" • ")
      embed.addFields({ name: "📊 Resumo", value: summary, inline: false })

      // Add recent logs
      const recentLogs = logs
        .slice(0, 5)
        .map((log, index) => {
          const moderator = interaction.guild.members.cache.get(log.moderator_id)
          const moderatorName = moderator ? moderator.user.tag : "Usuário desconhecido"
          const date = new Date(log.created_at).toLocaleDateString("pt-BR")

          return (
            `**${index + 1}.** ${log.action.toUpperCase()} - ${log.reason}\n` + `Moderador: ${moderatorName} • ${date}`
          )
        })
        .join("\n\n")

      embed.addFields({ name: "📝 Logs Recentes", value: recentLogs || "Nenhum log encontrado", inline: false })

      // Add footer with total count
      embed.setFooter({
        text: `Total de ${logs.length} ações • Mostrando ${Math.min(5, logs.length)} mais recentes`,
        iconURL: interaction.guild.iconURL(),
      })

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      bot.logger.error("Error in modlogs command:", error)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao buscar o histórico de moderação")
            .setColor("#ff0000"),
        ],
      })
    }
  },
}
