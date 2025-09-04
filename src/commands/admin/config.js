const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Configurar o bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("canal-mod")
        .setDescription("Definir canal de logs de moderação")
        .addChannelOption((option) =>
          option.setName("canal").setDescription("Canal para logs de moderação").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("canal-vendas")
        .setDescription("Definir canal de notificações de vendas")
        .addChannelOption((option) =>
          option.setName("canal").setDescription("Canal para notificações de vendas").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("categoria-tickets")
        .setDescription("Definir categoria para tickets")
        .addChannelOption((option) =>
          option.setName("categoria").setDescription("Categoria para criar tickets").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cargo-suporte")
        .setDescription("Definir cargo de suporte")
        .addRoleOption((option) =>
          option.setName("cargo").setDescription("Cargo que pode gerenciar tickets").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("gateway-pagamento")
        .setDescription("Configurar gateway de pagamento padrão")
        .addStringOption((option) =>
          option
            .setName("gateway")
            .setDescription("Gateway de pagamento")
            .setRequired(true)
            .addChoices({ name: "Mercado Pago", value: "mercadopago" }, { name: "Abacate Pay", value: "abacatepay" }),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cor-embed")
        .setDescription("Definir cor padrão dos embeds")
        .addStringOption((option) =>
          option.setName("cor").setDescription("Cor em hexadecimal (ex: #0099ff)").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("listar").setDescription("Listar todas as configurações")),

  async execute(interaction, bot) {
    const subcommand = interaction.options.getSubcommand()

    try {
      switch (subcommand) {
        case "canal-mod":
          const modChannel = interaction.options.getChannel("canal")
          await bot.database.setConfig("mod_log_channel", modChannel.id)

          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("✅ Configuração Atualizada")
                .setDescription(`Canal de logs de moderação definido como ${modChannel}`)
                .setColor("#00ff00"),
            ],
            ephemeral: true,
          })
          break

        case "canal-vendas":
          const salesChannel = interaction.options.getChannel("canal")
          await bot.database.setConfig("sales_channel", salesChannel.id)

          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("✅ Configuração Atualizada")
                .setDescription(`Canal de vendas definido como ${salesChannel}`)
                .setColor("#00ff00"),
            ],
            ephemeral: true,
          })
          break

        case "categoria-tickets":
          const ticketCategory = interaction.options.getChannel("categoria")
          await bot.database.setConfig("ticket_category", ticketCategory.id)

          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("✅ Configuração Atualizada")
                .setDescription(`Categoria de tickets definida como ${ticketCategory}`)
                .setColor("#00ff00"),
            ],
            ephemeral: true,
          })
          break

        case "cargo-suporte":
          const supportRole = interaction.options.getRole("cargo")
          await bot.database.setConfig("support_role", supportRole.id)

          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("✅ Configuração Atualizada")
                .setDescription(`Cargo de suporte definido como ${supportRole}`)
                .setColor("#00ff00"),
            ],
            ephemeral: true,
          })
          break

        case "gateway-pagamento":
          const gateway = interaction.options.getString("gateway")
          await bot.database.setConfig("payment_gateway", gateway)

          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("✅ Configuração Atualizada")
                .setDescription(`Gateway de pagamento padrão definido como **${gateway}**`)
                .setColor("#00ff00"),
            ],
            ephemeral: true,
          })
          break

        case "cor-embed":
          const color = interaction.options.getString("cor")

          // Validate hex color
          if (!/^#[0-9A-F]{6}$/i.test(color)) {
            return interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("❌ Cor Inválida")
                  .setDescription("Use o formato hexadecimal: #0099ff")
                  .setColor("#ff0000"),
              ],
              ephemeral: true,
            })
          }

          await bot.database.setConfig("embed_color", color)

          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("✅ Configuração Atualizada")
                .setDescription(`Cor padrão dos embeds definida como **${color}**`)
                .setColor(color),
            ],
            ephemeral: true,
          })
          break

        case "listar":
          const configs = await bot.database.all("SELECT * FROM server_config ORDER BY key")

          const embed = new EmbedBuilder().setTitle("⚙️ Configurações do Servidor").setColor("#0099ff").setTimestamp()

          if (configs.length === 0) {
            embed.setDescription("Nenhuma configuração definida")
          } else {
            const configText = configs
              .map((config) => {
                let value = config.value

                // Format channel/role mentions
                if (config.key.includes("channel") || config.key.includes("category")) {
                  value = `<#${config.value}>`
                } else if (config.key.includes("role")) {
                  value = `<@&${config.value}>`
                }

                return `**${config.key}:** ${value}`
              })
              .join("\n")

            embed.setDescription(configText)
          }

          await interaction.reply({ embeds: [embed], ephemeral: true })
          break
      }
    } catch (error) {
      bot.logger.error("Error in config command:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao atualizar a configuração")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },
}
