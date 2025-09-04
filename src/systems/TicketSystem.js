const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
} = require("discord.js")

class TicketSystem {
  constructor(bot) {
    this.bot = bot
  }

  async handleTicketInteraction(interaction) {
    const customId = interaction.customId

    switch (customId) {
      case "create_ticket":
        await this.createTicket(interaction)
        break
      case "ticket_info":
        await this.showTicketInfo(interaction)
        break
      case "confirm_close_ticket":
        await this.confirmCloseTicket(interaction)
        break
      case "cancel_close_ticket":
        await this.cancelCloseTicket(interaction)
        break
      case "rate_ticket":
        await this.showRatingModal(interaction)
        break
      default:
        if (customId.startsWith("rate_")) {
          await this.handleRating(interaction)
        }
        break
    }
  }

  async createTicket(interaction) {
    try {
      // Check if user already has an open ticket
      const existingTicket = await this.bot.database.get(
        "SELECT * FROM tickets WHERE user_id = ? AND status = 'open'",
        [interaction.user.id],
      )

      if (existingTicket) {
        const channel = interaction.guild.channels.cache.get(existingTicket.channel_id)
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Ticket já existe")
              .setDescription(`Você já possui um ticket aberto: ${channel || "Canal não encontrado"}`)
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      await interaction.deferReply({ ephemeral: true })

      // Get configuration
      const categoryId = await this.bot.database.getConfig("ticket_category")
      const supportRoleId = await this.bot.database.getConfig("ticket_support_role")

      if (!categoryId) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Sistema não configurado")
              .setDescription("O sistema de tickets não foi configurado corretamente")
              .setColor("#ff0000"),
          ],
        })
      }

      const category = interaction.guild.channels.cache.get(categoryId)
      const supportRole = interaction.guild.roles.cache.get(supportRoleId)

      // Create ticket channel
      const ticketChannel = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: category,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          ...(supportRole
            ? [
                {
                  id: supportRole.id,
                  allow: [
                    PermissionFlagsBits.ViewChannel,
                    PermissionFlagsBits.SendMessages,
                    PermissionFlagsBits.ReadMessageHistory,
                    PermissionFlagsBits.ManageMessages,
                  ],
                },
              ]
            : []),
        ],
      })

      // Save ticket to database
      await this.bot.database.run("INSERT INTO tickets (channel_id, user_id, category, status) VALUES (?, ?, ?, ?)", [
        ticketChannel.id,
        interaction.user.id,
        "geral",
        "open",
      ])

      // Create welcome embed
      const welcomeEmbed = new EmbedBuilder()
        .setTitle("🎫 Ticket Criado")
        .setDescription(
          `Olá ${interaction.user}! Seu ticket foi criado com sucesso.\n\n` +
            `Nossa equipe de suporte será notificada e responderá em breve.\n` +
            `Por favor, descreva detalhadamente sua dúvida ou problema.`,
        )
        .addFields(
          { name: "👤 Usuário", value: interaction.user.tag, inline: true },
          { name: "🕐 Criado em", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
          { name: "🆔 ID do Ticket", value: ticketChannel.id, inline: true },
        )
        .setColor("#0099ff")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()

      // Create control buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm_close_ticket")
          .setLabel("Fechar Ticket")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔒"),
        new ButtonBuilder()
          .setCustomId("rate_ticket")
          .setLabel("Avaliar Atendimento")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("⭐"),
      )

      await ticketChannel.send({
        content: supportRole ? `${supportRole} - Novo ticket criado!` : "",
        embeds: [welcomeEmbed],
        components: [row],
      })

      // Success response
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅ Ticket Criado")
            .setDescription(`Seu ticket foi criado: ${ticketChannel}`)
            .setColor("#00ff00"),
        ],
      })
    } catch (error) {
      this.bot.logger.error("Error creating ticket:", error)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao criar o ticket")
            .setColor("#ff0000"),
        ],
      })
    }
  }

  async showTicketInfo(interaction) {
    const embed = new EmbedBuilder()
      .setTitle("ℹ️ Informações sobre Tickets")
      .setDescription(
        "**Como funciona o sistema de tickets:**\n\n" +
          "🎫 **Criar Ticket:** Clique no botão 'Abrir Ticket' para criar um novo ticket\n" +
          "💬 **Suporte:** Nossa equipe responderá em breve\n" +
          "🔒 **Fechar:** Use o botão 'Fechar Ticket' quando terminar\n" +
          "⭐ **Avaliar:** Avalie nosso atendimento ao final\n" +
          "📄 **Transcrição:** Todas as conversas são salvas\n\n" +
          "**Regras:**\n" +
          "• Apenas 1 ticket por usuário\n" +
          "• Seja respeitoso com a equipe\n" +
          "• Descreva seu problema claramente\n" +
          "• Não spam ou flood no ticket",
      )
      .setColor("#0099ff")
      .setTimestamp()
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })

    await interaction.reply({ embeds: [embed], ephemeral: true })
  }

  async confirmCloseTicket(interaction) {
    try {
      const tempData = this.bot.tempData?.get(`close_${interaction.channel.id}`)
      if (!tempData) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Erro")
              .setDescription("Dados temporários não encontrados")
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      // Update ticket in database
      await this.bot.database.run(
        "UPDATE tickets SET status = 'closed', closed_at = CURRENT_TIMESTAMP, closed_by = ? WHERE channel_id = ?",
        [tempData.moderator, interaction.channel.id],
      )

      // Get ticket info
      const ticket = await this.bot.database.get("SELECT * FROM tickets WHERE channel_id = ?", [interaction.channel.id])

      // Create closing embed
      const closeEmbed = new EmbedBuilder()
        .setTitle("🔒 Ticket Fechado")
        .setDescription(`Este ticket foi fechado por <@${tempData.moderator}>`)
        .addFields(
          { name: "Razão", value: tempData.reason, inline: false },
          { name: "Fechado em", value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        )
        .setColor("#ff0000")
        .setTimestamp()

      // Create rating buttons
      const ratingRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("rate_1").setLabel("1⭐").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("rate_2").setLabel("2⭐").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("rate_3").setLabel("3⭐").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("rate_4").setLabel("4⭐").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("rate_5").setLabel("5⭐").setStyle(ButtonStyle.Success),
      )

      await interaction.update({
        embeds: [closeEmbed],
        components: [ratingRow],
      })

      // Remove user permissions but keep for staff
      await interaction.channel.permissionOverwrites.edit(ticket.user_id, {
        ViewChannel: true,
        SendMessages: false,
        ReadMessageHistory: true,
      })

      // Clean up temp data
      this.bot.tempData?.delete(`close_${interaction.channel.id}`)

      // Auto-delete channel after 24 hours
      setTimeout(
        async () => {
          try {
            await interaction.channel.delete()
          } catch (error) {
            this.bot.logger.error("Error auto-deleting ticket channel:", error)
          }
        },
        24 * 60 * 60 * 1000,
      )
    } catch (error) {
      this.bot.logger.error("Error confirming ticket close:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao fechar o ticket")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  }

  async cancelCloseTicket(interaction) {
    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setTitle("❌ Fechamento Cancelado")
          .setDescription("O fechamento do ticket foi cancelado")
          .setColor("#ff9900"),
      ],
      components: [],
    })
  }

  async handleRating(interaction) {
    const rating = Number.parseInt(interaction.customId.split("_")[1])

    try {
      // Save rating to database (you can create a ratings table)
      const ticket = await this.bot.database.get("SELECT * FROM tickets WHERE channel_id = ?", [interaction.channel.id])

      // For now, we'll just acknowledge the rating
      const ratingEmbed = new EmbedBuilder()
        .setTitle("⭐ Obrigado pela Avaliação!")
        .setDescription(`Você avaliou nosso atendimento com ${rating} estrela${rating > 1 ? "s" : ""}!`)
        .setColor(rating >= 4 ? "#00ff00" : rating >= 3 ? "#ffaa00" : "#ff0000")
        .setTimestamp()

      await interaction.update({
        embeds: [ratingEmbed],
        components: [],
      })

      // Log rating
      this.bot.logger.info(`Ticket ${interaction.channel.id} rated ${rating} stars by user ${ticket.user_id}`)
    } catch (error) {
      this.bot.logger.error("Error handling rating:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao processar sua avaliação")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  }
}

module.exports = TicketSystem
