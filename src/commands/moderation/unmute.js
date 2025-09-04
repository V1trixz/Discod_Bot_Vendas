const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Remover silenciamento de um usuário")
    .addUserOption((option) =>
      option.setName("usuario").setDescription("Usuário para remover silenciamento").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("razao").setDescription("Razão da remoção do silenciamento").setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, bot) {
    const target = interaction.options.getUser("usuario")
    const reason = interaction.options.getString("razao") || "Nenhuma razão fornecida"

    try {
      const member = await interaction.guild.members.fetch(target.id)

      if (!member.isCommunicationDisabled()) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Erro")
              .setDescription("Este usuário não está silenciado")
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      // Remove timeout
      await member.timeout(null, `${reason} | Moderador: ${interaction.user.tag}`)

      // Log to database
      await bot.database.run("INSERT INTO mod_logs (user_id, moderator_id, action, reason) VALUES (?, ?, ?, ?)", [
        target.id,
        interaction.user.id,
        "unmute",
        reason,
      ])

      // Success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("🔊 Silenciamento Removido")
        .setDescription(`**${target.tag}** pode falar novamente`)
        .addFields({ name: "Razão", value: reason, inline: false })
        .setColor("#00ff00")
        .setTimestamp()
        .setFooter({ text: `Moderador: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })

      await interaction.reply({ embeds: [successEmbed] })

      // Log to mod channel
      await bot.logModeration(interaction.guild, {
        action: "Unmute",
        target: target,
        moderator: interaction.user,
        reason: reason,
      })
    } catch (error) {
      bot.logger.error("Error in unmute command:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao remover o silenciamento")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },
}
