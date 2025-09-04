const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Desbanir um usuário")
    .addStringOption((option) =>
      option.setName("usuario_id").setDescription("ID do usuário a ser desbanido").setRequired(true),
    )
    .addStringOption((option) => option.setName("razao").setDescription("Razão do desbanimento").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction, bot) {
    const userId = interaction.options.getString("usuario_id")
    const reason = interaction.options.getString("razao") || "Nenhuma razão fornecida"

    try {
      // Check if user is banned
      const bans = await interaction.guild.bans.fetch()
      const bannedUser = bans.get(userId)

      if (!bannedUser) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder().setTitle("❌ Erro").setDescription("Este usuário não está banido").setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      // Unban the user
      await interaction.guild.members.unban(userId, `${reason} | Moderador: ${interaction.user.tag}`)

      // Log to database
      await bot.database.run("INSERT INTO mod_logs (user_id, moderator_id, action, reason) VALUES (?, ?, ?, ?)", [
        userId,
        interaction.user.id,
        "unban",
        reason,
      ])

      // Success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Usuário Desbanido")
        .setDescription(`**${bannedUser.user.tag}** foi desbanido com sucesso`)
        .addFields({ name: "Razão", value: reason, inline: false })
        .setColor("#00ff00")
        .setTimestamp()
        .setFooter({ text: `Moderador: ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })

      await interaction.reply({ embeds: [successEmbed] })

      // Log to mod channel
      await bot.logModeration(interaction.guild, {
        action: "Unban",
        target: bannedUser.user,
        moderator: interaction.user,
        reason: reason,
      })
    } catch (error) {
      bot.logger.error("Error in unban command:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao desbanir o usuário")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },
}
