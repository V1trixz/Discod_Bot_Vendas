const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-tickets")
    .setDescription("Configurar o sistema de tickets")
    .addChannelOption((option) =>
      option
        .setName("categoria")
        .setDescription("Categoria onde os tickets serão criados")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("canal_painel")
        .setDescription("Canal onde o painel de tickets será enviado")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true),
    )
    .addRoleOption((option) =>
      option.setName("cargo_suporte").setDescription("Cargo que terá acesso aos tickets").setRequired(true),
    )
    .addStringOption((option) =>
      option.setName("titulo").setDescription("Título do painel de tickets").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("descricao").setDescription("Descrição do painel de tickets").setRequired(false),
    )
    .addStringOption((option) =>
      option.setName("cor").setDescription("Cor do embed (hex, ex: #0099ff)").setRequired(false),
    )
    .addStringOption((option) => option.setName("imagem").setDescription("URL da imagem do painel").setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, bot) {
    const category = interaction.options.getChannel("categoria")
    const panelChannel = interaction.options.getChannel("canal_painel")
    const supportRole = interaction.options.getRole("cargo_suporte")
    const title = interaction.options.getString("titulo") || "🎫 Sistema de Tickets"
    const description =
      interaction.options.getString("descricao") ||
      "Clique no botão abaixo para abrir um ticket e receber suporte da nossa equipe!"
    const color = interaction.options.getString("cor") || "#0099ff"
    const imageUrl = interaction.options.getString("imagem")

    try {
      // Save configuration to database
      await bot.database.setConfig("ticket_category", category.id)
      await bot.database.setConfig("ticket_panel_channel", panelChannel.id)
      await bot.database.setConfig("ticket_support_role", supportRole.id)
      await bot.database.setConfig("ticket_panel_title", title)
      await bot.database.setConfig("ticket_panel_description", description)
      await bot.database.setConfig("ticket_panel_color", color)
      if (imageUrl) await bot.database.setConfig("ticket_panel_image", imageUrl)

      // Create ticket panel embed
      const panelEmbed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })

      if (imageUrl) {
        panelEmbed.setImage(imageUrl)
      }

      // Create buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("create_ticket")
          .setLabel("Abrir Ticket")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🎫"),
        new ButtonBuilder()
          .setCustomId("ticket_info")
          .setLabel("Informações")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("ℹ️"),
      )

      // Send panel to channel
      await panelChannel.send({
        embeds: [panelEmbed],
        components: [row],
      })

      // Success response
      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Sistema de Tickets Configurado")
        .setDescription("O sistema de tickets foi configurado com sucesso!")
        .addFields(
          { name: "Categoria", value: category.toString(), inline: true },
          { name: "Canal do Painel", value: panelChannel.toString(), inline: true },
          { name: "Cargo de Suporte", value: supportRole.toString(), inline: true },
        )
        .setColor("#00ff00")
        .setTimestamp()

      await interaction.reply({ embeds: [successEmbed], ephemeral: true })
    } catch (error) {
      bot.logger.error("Error in setup-tickets command:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao configurar o sistema de tickets")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },
}
