const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Advertir um usuário")
    .addUserOption((option) => option.setName("usuario").setDescription("Usuário a ser advertido").setRequired(true))
    .addStringOption((option) => option.setName("razao").setDescription("Razão da advertência").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, bot) {
    const target = interaction.options.getUser("usuario")
    const reason = interaction.options.getString("razao")

    try {
      // Log to database
      const result = await bot.database.run(
        "INSERT INTO mod_logs (user_id, moderator_id, action, reason) VALUES (?, ?, ?, ?)",
        [target.id, interaction.user.id, "warn", reason],
      )

      // Get total warns for user
      const warns = await bot.database.all(
        "SELECT * FROM mod_logs WHERE user_id = ? AND action = 'warn' ORDER BY created_at DESC",
        [target.id],
      )

      // Send DM to user
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("⚠️ Você recebeu uma advertência")
          .setDescription(`Você foi advertido no servidor **${interaction.guild.name}**`)
          .addFields(
            { name: "Razão", value: reason, inline: false },
            { name: "Moderador", value: interaction.user.tag, inline: true },
            { name: "Total de advertências", value: warns.length.toString(), inline: true },
          )
          .setColor("#ffaa00")
          .setTimestamp()

        await target.send({ embeds: [dmEmbed] })
      } catch (error) {
        // User has DMs disabled
      }

      // Success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("⚠️ Usuário Advertido")
        .setDescription(`**${target.tag}** foi advertido com sucesso`)
        .addFields(
          { name: "Razão", value: reason, inline: false },
          { name: "Total de advertências", value: warns.length.toString(), inline: true },
          { name: "ID da advertência", value: result.id.toString(), inline: true },
        )
        .setColor("#ffaa00")
        .setTimestamp()
        .setFooter({ text: `Moderador: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })

      await interaction.reply({ embeds: [successEmbed] })

      // Auto-moderation based on warn count
      if (warns.length >= 3) {
        const member = await interaction.guild.members.fetch(target.id).catch(() => null)
        if (member && member.moderatable) {
          // Auto-mute for 1 hour after 3 warns
          await member.timeout(60 * 60 * 1000, "Auto-moderação: 3 advertências")

          const autoModEmbed = new EmbedBuilder()
            .setTitle("🤖 Auto-moderação")
            .setDescription(`**${target.tag}** foi automaticamente silenciado por 1 hora (3 advertências)`)
            .setColor("#ff0000")
            .setTimestamp()

          await interaction.followUp({ embeds: [autoModEmbed] })
        }
      }

      // Log to mod channel
      await bot.logModeration(interaction.guild, {
        action: "Warn",
        target: target,
        moderator: interaction.user,
        reason: reason,
        warnCount: warns.length,
      })
    } catch (error) {
      bot.logger.error("Error in warn command:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao advertir o usuário")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },
}
