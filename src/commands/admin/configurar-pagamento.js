const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("configurar-pagamento")
    .setDescription("Configurar gateways de pagamento para este servidor")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("mercadopago")
        .setDescription("Configurar Mercado Pago")
        .addStringOption((option) =>
          option.setName("access-token").setDescription("Access Token do Mercado Pago").setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("webhook-secret").setDescription("Webhook Secret (opcional)").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("abacatepay")
        .setDescription("Configurar Abacate Pay")
        .addStringOption((option) =>
          option.setName("api-key").setDescription("API Key do Abacate Pay").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("webhook-url")
        .setDescription("Configurar URL do webhook")
        .addStringOption((option) =>
          option.setName("url").setDescription("URL base para webhooks (ex: https://meubot.com)").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("gateway-padrao")
        .setDescription("Definir gateway padrão")
        .addStringOption((option) =>
          option
            .setName("gateway")
            .setDescription("Gateway padrão")
            .setRequired(true)
            .addChoices({ name: "Mercado Pago", value: "mercadopago" }, { name: "Abacate Pay", value: "abacatepay" }),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("listar").setDescription("Listar configurações de pagamento"))
    .addSubcommand((subcommand) =>
      subcommand
        .setName("testar")
        .setDescription("Testar conexão com gateway")
        .addStringOption((option) =>
          option
            .setName("gateway")
            .setDescription("Gateway para testar")
            .setRequired(true)
            .addChoices({ name: "Mercado Pago", value: "mercadopago" }, { name: "Abacate Pay", value: "abacatepay" }),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remover")
        .setDescription("Remover configuração de gateway")
        .addStringOption((option) =>
          option
            .setName("gateway")
            .setDescription("Gateway para remover")
            .setRequired(true)
            .addChoices({ name: "Mercado Pago", value: "mercadopago" }, { name: "Abacate Pay", value: "abacatepay" }),
        ),
    ),

  async execute(interaction, bot) {
    const subcommand = interaction.options.getSubcommand()
    const guildId = interaction.guild.id

    try {
      switch (subcommand) {
        case "mercadopago":
          const mpToken = interaction.options.getString("access-token")
          const mpSecret = interaction.options.getString("webhook-secret")

          // Validate token format
          if (!mpToken.startsWith("APP_USR-") && !mpToken.startsWith("TEST-")) {
            return interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("❌ Token Inválido")
                  .setDescription("O Access Token do Mercado Pago deve começar com 'APP_USR-' ou 'TEST-'")
                  .setColor("#ff0000"),
              ],
              ephemeral: true,
            })
          }

          await bot.database.setConfig(guildId, "mercadopago_token", mpToken)
          if (mpSecret) {
            await bot.database.setConfig(guildId, "mercadopago_webhook_secret", mpSecret)
          }

          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("✅ Mercado Pago Configurado")
                .setDescription(
                  "Access Token configurado com sucesso!\n\n⚠️ **Importante:** Mantenha seu token seguro e não compartilhe com terceiros.",
                )
                .addFields(
                  { name: "🔑 Token", value: `${mpToken.substring(0, 15)}...`, inline: true },
                  { name: "🔒 Webhook Secret", value: mpSecret ? "Configurado" : "Não configurado", inline: true },
                )
                .setColor("#00ff00"),
            ],
            ephemeral: true,
          })
          break

        case "abacatepay":
          const abacateKey = interaction.options.getString("api-key")

          await bot.database.setConfig(guildId, "abacatepay_token", abacateKey)

          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("✅ Abacate Pay Configurado")
                .setDescription(
                  "API Key configurada com sucesso!\n\n⚠️ **Importante:** Mantenha sua chave segura e não compartilhe com terceiros.",
                )
                .addFields({ name: "🔑 API Key", value: `${abacateKey.substring(0, 15)}...`, inline: true })
                .setColor("#00ff00"),
            ],
            ephemeral: true,
          })
          break

        case "webhook-url":
          const webhookUrl = interaction.options.getString("url")

          // Validate URL format
          if (!webhookUrl.startsWith("http://") && !webhookUrl.startsWith("https://")) {
            return interaction.reply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("❌ URL Inválida")
                  .setDescription("A URL deve começar com 'http://' ou 'https://'")
                  .setColor("#ff0000"),
              ],
              ephemeral: true,
            })
          }

          await bot.database.setConfig(guildId, "webhook_url", webhookUrl)

          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("✅ Webhook URL Configurada")
                .setDescription(`URL configurada: ${webhookUrl}`)
                .addFields(
                  { name: "📡 Mercado Pago", value: `${webhookUrl}/webhook/mercadopago`, inline: false },
                  { name: "📡 Abacate Pay", value: `${webhookUrl}/webhook/abacatepay`, inline: false },
                )
                .setColor("#00ff00"),
            ],
            ephemeral: true,
          })
          break

        case "gateway-padrao":
          const gateway = interaction.options.getString("gateway")
          await bot.database.setConfig(guildId, "payment_gateway_default", gateway)

          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("✅ Gateway Padrão Configurado")
                .setDescription(
                  `Gateway padrão definido como **${gateway === "mercadopago" ? "Mercado Pago" : "Abacate Pay"}**`,
                )
                .setColor("#00ff00"),
            ],
            ephemeral: true,
          })
          break

        case "listar":
          const configs = await bot.database.getGuildConfigs(guildId)
          const paymentConfigs = configs.filter(
            (c) =>
              c.key.includes("mercadopago") ||
              c.key.includes("abacatepay") ||
              c.key.includes("webhook") ||
              c.key.includes("payment_gateway"),
          )

          const embed = new EmbedBuilder().setTitle("⚙️ Configurações de Pagamento").setColor("#0099ff").setTimestamp()

          if (paymentConfigs.length === 0) {
            embed.setDescription("Nenhuma configuração de pagamento definida")
          } else {
            let description = ""

            // Mercado Pago
            const mpToken = paymentConfigs.find((c) => c.key === "mercadopago_token")
            const mpSecret = paymentConfigs.find((c) => c.key === "mercadopago_webhook_secret")
            if (mpToken) {
              description += `🟢 **Mercado Pago:** Configurado\n`
              description += `   Token: ${mpToken.value.substring(0, 15)}...\n`
              description += `   Webhook Secret: ${mpSecret ? "Configurado" : "Não configurado"}\n\n`
            } else {
              description += `🔴 **Mercado Pago:** Não configurado\n\n`
            }

            // Abacate Pay
            const abacateToken = paymentConfigs.find((c) => c.key === "abacatepay_token")
            if (abacateToken) {
              description += `🟢 **Abacate Pay:** Configurado\n`
              description += `   API Key: ${abacateToken.value.substring(0, 15)}...\n\n`
            } else {
              description += `🔴 **Abacate Pay:** Não configurado\n\n`
            }

            // Webhook URL
            const webhookUrl = paymentConfigs.find((c) => c.key === "webhook_url")
            if (webhookUrl) {
              description += `🟢 **Webhook URL:** ${webhookUrl.value}\n\n`
            } else {
              description += `🔴 **Webhook URL:** Não configurado\n\n`
            }

            // Gateway Padrão
            const defaultGateway = paymentConfigs.find((c) => c.key === "payment_gateway_default")
            if (defaultGateway) {
              description += `⚙️ **Gateway Padrão:** ${defaultGateway.value === "mercadopago" ? "Mercado Pago" : "Abacate Pay"}`
            } else {
              description += `⚙️ **Gateway Padrão:** Não definido`
            }

            embed.setDescription(description)
          }

          await interaction.reply({ embeds: [embed], ephemeral: true })
          break

        case "testar":
          const testGateway = interaction.options.getString("gateway")
          await interaction.deferReply({ ephemeral: true })

          try {
            const paymentManager = bot.paymentManager
            const testResult = await paymentManager.testGatewayConnection(guildId, testGateway)

            if (testResult.success) {
              await interaction.editReply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("✅ Teste Bem-sucedido")
                    .setDescription(
                      `Conexão com ${testGateway === "mercadopago" ? "Mercado Pago" : "Abacate Pay"} funcionando corretamente!`,
                    )
                    .addFields({ name: "📊 Detalhes", value: testResult.details || "Conexão validada", inline: false })
                    .setColor("#00ff00"),
                ],
              })
            } else {
              await interaction.editReply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle("❌ Teste Falhou")
                    .setDescription(
                      `Erro ao conectar com ${testGateway === "mercadopago" ? "Mercado Pago" : "Abacate Pay"}`,
                    )
                    .addFields({ name: "❗ Erro", value: testResult.error || "Erro desconhecido", inline: false })
                    .setColor("#ff0000"),
                ],
              })
            }
          } catch (error) {
            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setTitle("❌ Erro no Teste")
                  .setDescription("Ocorreu um erro ao testar a conexão")
                  .setColor("#ff0000"),
              ],
            })
          }
          break

        case "remover":
          const removeGateway = interaction.options.getString("gateway")

          if (removeGateway === "mercadopago") {
            await bot.database.deleteConfig(guildId, "mercadopago_token")
            await bot.database.deleteConfig(guildId, "mercadopago_webhook_secret")
          } else if (removeGateway === "abacatepay") {
            await bot.database.deleteConfig(guildId, "abacatepay_token")
          }

          await interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setTitle("✅ Configuração Removida")
                .setDescription(
                  `Configurações do ${removeGateway === "mercadopago" ? "Mercado Pago" : "Abacate Pay"} foram removidas`,
                )
                .setColor("#00ff00"),
            ],
            ephemeral: true,
          })
          break
      }
    } catch (error) {
      bot.logger.error("Error in configurar-pagamento command:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao configurar o pagamento")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },
}
