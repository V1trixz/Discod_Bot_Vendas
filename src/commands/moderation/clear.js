const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Limpar mensagens do canal")
    .addIntegerOption((option) =>
      option
        .setName("quantidade")
        .setDescription("Quantidade de mensagens para deletar (1-100)")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true),
    )
    .addUserOption((option) =>
      option.setName("usuario").setDescription("Deletar apenas mensagens deste usuário").setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("filtro")
        .setDescription("Filtro de mensagens")
        .addChoices(
          { name: "Todas", value: "all" },
          { name: "Apenas bots", value: "bots" },
          { name: "Apenas humanos", value: "humans" },
          { name: "Com anexos", value: "attachments" },
          { name: "Com embeds", value: "embeds" },
        )
        .setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction, bot) {
    const amount = interaction.options.getInteger("quantidade")
    const targetUser = interaction.options.getUser("usuario")
    const filter = interaction.options.getString("filtro") || "all"

    try {
      await interaction.deferReply({ ephemeral: true })

      // Fetch messages
      const messages = await interaction.channel.messages.fetch({ limit: amount })
      let messagesToDelete = messages

      // Apply filters
      if (targetUser) {
        messagesToDelete = messagesToDelete.filter((msg) => msg.author.id === targetUser.id)
      }

      switch (filter) {
        case "bots":
          messagesToDelete = messagesToDelete.filter((msg) => msg.author.bot)
          break
        case "humans":
          messagesToDelete = messagesToDelete.filter((msg) => !msg.author.bot)
          break
        case "attachments":
          messagesToDelete = messagesToDelete.filter((msg) => msg.attachments.size > 0)
          break
        case "embeds":
          messagesToDelete = messagesToDelete.filter((msg) => msg.embeds.length > 0)
          break
      }

      // Filter messages older than 14 days (Discord limitation)
      const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000
      messagesToDelete = messagesToDelete.filter((msg) => msg.createdTimestamp > twoWeeksAgo)

      if (messagesToDelete.size === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Nenhuma mensagem encontrada")
              .setDescription("Não foram encontradas mensagens para deletar com os filtros aplicados")
              .setColor("#ff0000"),
          ],
        })
      }

      // Delete messages
      const deleted = await interaction.channel.bulkDelete(messagesToDelete, true)

      // Log to database
      await bot.database.run("INSERT INTO mod_logs (user_id, moderator_id, action, reason) VALUES (?, ?, ?, ?)", [
        interaction.user.id,
        interaction.user.id,
        "clear",
        `Deletadas ${deleted.size} mensagens no canal ${interaction.channel.name}`,
      ])

      // Success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("🧹 Mensagens Deletadas")
        .setDescription(`**${deleted.size}** mensagens foram deletadas com sucesso`)
        .addFields(
          { name: "Canal", value: interaction.channel.toString(), inline: true },
          { name: "Filtro", value: filter === "all" ? "Todas" : filter, inline: true },
          { name: "Usuário específico", value: targetUser ? targetUser.tag : "Nenhum", inline: true },
        )
        .setColor("#00ff00")
        .setTimestamp()
        .setFooter({ text: `Moderador: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })

      await interaction.editReply({ embeds: [successEmbed] })

      // Log to mod channel
      await bot.logModeration(interaction.guild, {
        action: "Clear",
        moderator: interaction.user,
        reason: `Deletadas ${deleted.size} mensagens no canal ${interaction.channel.name}`,
        channel: interaction.channel,
      })

      // Auto-delete success message after 5 seconds
      setTimeout(async () => {
        try {
          await interaction.deleteReply()
        } catch (error) {
          // Message already deleted or bot lacks permissions
        }
      }, 5000)
    } catch (error) {
      bot.logger.error("Error in clear command:", error)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao deletar as mensagens")
            .setColor("#ff0000"),
        ],
      })
    }
  },
}
