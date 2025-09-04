const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Silenciar um usuário")
    .addUserOption((option) => option.setName("usuario").setDescription("Usuário a ser silenciado").setRequired(true))
    .addIntegerOption((option) =>
      option
        .setName("duracao")
        .setDescription("Duração em minutos (máximo 40320 = 28 dias)")
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true),
    )
    .addStringOption((option) => option.setName("razao").setDescription("Razão do silenciamento").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, bot) {
    const target = interaction.options.getUser("usuario")
    const duration = interaction.options.getInteger("duracao")
    const reason = interaction.options.getString("razao") || "Nenhuma razão fornecida"

    try {
      const member = await interaction.guild.members.fetch(target.id)

      // Check permissions
      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Erro")
              .setDescription("Você não pode silenciar este usuário (cargo superior ou igual)")
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      if (!member.moderatable) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Erro")
              .setDescription("Não posso silenciar este usuário")
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      // Calculate timeout duration
      const timeoutDuration = duration * 60 * 1000 // Convert minutes to milliseconds
      const expiresAt = new Date(Date.now() + timeoutDuration)

      // Send DM to user
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("🔇 Você foi silenciado")
          .setDescription(`Você foi silenciado no servidor **${interaction.guild.name}**`)
          .addFields(
            { name: "Razão", value: reason, inline: false },
            { name: "Duração", value: `${duration} minutos`, inline: true },
            { name: "Expira em", value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
            { name: "Moderador", value: interaction.user.tag, inline: true },
          )
          .setColor("#ff9900")
          .setTimestamp()

        await target.send({ embeds: [dmEmbed] })
      } catch (error) {
        // User has DMs disabled
      }

      // Timeout the user
      await member.timeout(timeoutDuration, `${reason} | Moderador: ${interaction.user.tag}`)

      // Log to database
      await bot.database.run(
        "INSERT INTO mod_logs (user_id, moderator_id, action, reason, duration, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
        [target.id, interaction.user.id, "mute", reason, duration, expiresAt],
      )

      // Success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("🔇 Usuário Silenciado")
        .setDescription(`**${target.tag}** foi silenciado com sucesso`)
        .addFields(
          { name: "Razão", value: reason, inline: false },
          { name: "Duração", value: `${duration} minutos`, inline: true },
          { name: "Expira em", value: `<t:${Math.floor(expiresAt.getTime() / 1000)}:R>`, inline: true },
        )
        .setColor("#ff9900")
        .setTimestamp()
        .setFooter({ text: `Moderador: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })

      await interaction.reply({ embeds: [successEmbed] })

      // Log to mod channel
      await bot.logModeration(interaction.guild, {
        action: "Mute",
        target: target,
        moderator: interaction.user,
        reason: reason,
        duration: duration,
      })
    } catch (error) {
      bot.logger.error("Error in mute command:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao silenciar o usuário")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },
}
