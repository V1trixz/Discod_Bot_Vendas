const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dashboard")
    .setDescription("Acessar o dashboard web do bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, bot) {
    try {
      const dashboardUrl = `${process.env.WEBHOOK_URL || "http://localhost:3000"}/dashboard`

      const embed = new EmbedBuilder()
        .setTitle("🌐 Dashboard Web")
        .setDescription(
          "Acesse o dashboard completo do bot para gerenciar:\n\n" +
            "📊 **Estatísticas e Relatórios**\n" +
            "🛒 **Produtos e Vendas**\n" +
            "🎫 **Sistema de Tickets**\n" +
            "⚙️ **Configurações Avançadas**\n" +
            "💳 **Gateways de Pagamento**\n" +
            "👥 **Gerenciamento de Usuários**\n" +
            "🛡️ **Logs de Moderação**\n\n" +
            `[**Acessar Dashboard**](${dashboardUrl})`,
        )
        .setColor("#0099ff")
        .setTimestamp()
        .setFooter({
          text: "Dashboard seguro - apenas administradores",
          iconURL: interaction.guild.iconURL(),
        })

      await interaction.reply({ embeds: [embed], ephemeral: true })
    } catch (error) {
      bot.logger.error("Error in dashboard command:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao gerar o link do dashboard")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },
}
