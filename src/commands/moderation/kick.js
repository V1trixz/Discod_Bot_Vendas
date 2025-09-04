const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Expulsar um usuário do servidor")
    .addUserOption((option) => option.setName("usuario").setDescription("Usuário a ser expulso").setRequired(true))
    .addStringOption((option) => option.setName("razao").setDescription("Razão da expulsão").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction, bot) {
    const target = interaction.options.getUser("usuario")
    const reason = interaction.options.getString("razao") || "Nenhuma razão fornecida"

    try {
      const member = await interaction.guild.members.fetch(target.id)

      // Check permissions
      if (member.roles.highest.position >= interaction.member.roles.highest.position) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Erro")
              .setDescription("Você não pode expulsar este usuário (cargo superior ou igual)")
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      if (!member.kickable) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Erro")
              .setDescription("Não posso expulsar este usuário")
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      // Send DM to user
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("👢 Você foi expulso")
          .setDescription(`Você foi expulso do servidor **${interaction.guild.name}**`)
          .addFields(
            { name: "Razão", value: reason, inline: false },
            { name: "Moderador", value: interaction.user.tag, inline: true },
          )
          .setColor("#ff9900")
          .setTimestamp()

        await target.send({ embeds: [dmEmbed] })
      } catch (error) {
        // User has DMs disabled
      }

      // Kick the user
      await member.kick(`${reason} | Moderador: ${interaction.user.tag}`)

      // Log to database
      await bot.database.run("INSERT INTO mod_logs (user_id, moderator_id, action, reason) VALUES (?, ?, ?, ?)", [
        target.id,
        interaction.user.id,
        "kick",
        reason,
      ])

      // Success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("👢 Usuário Expulso")
        .setDescription(`**${target.tag}** foi expulso com sucesso`)
        .addFields({ name: "Razão", value: reason, inline: false })
        .setColor("#ff9900")
        .setTimestamp()
        .setFooter({ text: `Moderador: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })

      await interaction.reply({ embeds: [successEmbed] })

      // Log to mod channel
      await bot.logModeration(interaction.guild, {
        action: "Kick",
        target: target,
        moderator: interaction.user,
        reason: reason,
      })
    } catch (error) {
      bot.logger.error("Error in kick command:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao expulsar o usuário")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },
}
