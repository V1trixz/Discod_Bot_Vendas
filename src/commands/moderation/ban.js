const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Banir um usuário do servidor")
    .addUserOption((option) => option.setName("usuario").setDescription("Usuário a ser banido").setRequired(true))
    .addStringOption((option) => option.setName("razao").setDescription("Razão do banimento").setRequired(false))
    .addIntegerOption((option) =>
      option
        .setName("duracao")
        .setDescription("Duração do ban em dias (0 = permanente)")
        .setMinValue(0)
        .setMaxValue(365)
        .setRequired(false),
    )
    .addBooleanOption((option) =>
      option.setName("deletar_mensagens").setDescription("Deletar mensagens dos últimos 7 dias").setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, bot) {
    const target = interaction.options.getUser("usuario")
    const reason = interaction.options.getString("razao") || "Nenhuma razão fornecida"
    const duration = interaction.options.getInteger("duracao") || 0
    const deleteMessages = interaction.options.getBoolean("deletar_mensagens") || false

    try {
      // Check if user can be banned
      const member = await interaction.guild.members.fetch(target.id).catch(() => null)

      if (member) {
        if (member.roles.highest.position >= interaction.member.roles.highest.position) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("❌ Erro")
                .setDescription("Você não pode banir este usuário (cargo superior ou igual)")
                .setColor("#ff0000"),
            ],
            ephemeral: true,
          })
        }

        if (!member.bannable) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder().setTitle("❌ Erro").setDescription("Não posso banir este usuário").setColor("#ff0000"),
            ],
            ephemeral: true,
          })
        }
      }

      // Send DM to user before ban
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("🔨 Você foi banido")
          .setDescription(`Você foi banido do servidor **${interaction.guild.name}**`)
          .addFields(
            { name: "Razão", value: reason, inline: false },
            { name: "Moderador", value: interaction.user.tag, inline: true },
            { name: "Duração", value: duration === 0 ? "Permanente" : `${duration} dias`, inline: true },
          )
          .setColor("#ff0000")
          .setTimestamp()

        await target.send({ embeds: [dmEmbed] })
      } catch (error) {
        // User has DMs disabled
      }

      // Ban the user
      await interaction.guild.members.ban(target, {
        reason: `${reason} | Moderador: ${interaction.user.tag}`,
        deleteMessageDays: deleteMessages ? 7 : 0,
      })

      // Calculate expiration date
      let expiresAt = null
      if (duration > 0) {
        expiresAt = new Date()
        expiresAt.setDate(expiresAt.getDate() + duration)
      }

      // Log to database
      await bot.database.run(
        "INSERT INTO mod_logs (user_id, moderator_id, action, reason, duration, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
        [target.id, interaction.user.id, "ban", reason, duration, expiresAt],
      )

      // Success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("🔨 Usuário Banido")
        .setDescription(`**${target.tag}** foi banido com sucesso`)
        .addFields(
          { name: "Razão", value: reason, inline: false },
          { name: "Duração", value: duration === 0 ? "Permanente" : `${duration} dias`, inline: true },
          { name: "Mensagens deletadas", value: deleteMessages ? "Sim (7 dias)" : "Não", inline: true },
        )
        .setColor("#ff0000")
        .setTimestamp()
        .setFooter({ text: `Moderador: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })

      await interaction.reply({ embeds: [successEmbed] })

      // Log to mod channel
      await bot.logModeration(interaction.guild, {
        action: "Ban",
        target: target,
        moderator: interaction.user,
        reason: reason,
        duration: duration,
      })
    } catch (error) {
      bot.logger.error("Error in ban command:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao banir o usuário")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },
}
