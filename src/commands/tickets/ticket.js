const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Gerenciar tickets")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("fechar")
        .setDescription("Fechar o ticket atual")
        .addStringOption((option) =>
          option.setName("razao").setDescription("Razão para fechar o ticket").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("adicionar")
        .setDescription("Adicionar usuário ao ticket")
        .addUserOption((option) =>
          option.setName("usuario").setDescription("Usuário para adicionar").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remover")
        .setDescription("Remover usuário do ticket")
        .addUserOption((option) => option.setName("usuario").setDescription("Usuário para remover").setRequired(true)),
    )
    .addSubcommand((subcommand) => subcommand.setName("transcricao").setDescription("Gerar transcrição do ticket"))
    .addSubcommand((subcommand) => subcommand.setName("reabrir").setDescription("Reabrir um ticket fechado"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, bot) {
    const subcommand = interaction.options.getSubcommand()

    // Check if command is being used in a ticket channel
    const ticket = await bot.database.get("SELECT * FROM tickets WHERE channel_id = ?", [interaction.channel.id])

    if (!ticket && subcommand !== "reabrir") {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Este comando só pode ser usado em canais de ticket")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }

    switch (subcommand) {
      case "fechar":
        await this.closeTicket(interaction, bot, ticket)
        break
      case "adicionar":
        await this.addUser(interaction, bot, ticket)
        break
      case "remover":
        await this.removeUser(interaction, bot, ticket)
        break
      case "transcricao":
        await this.generateTranscript(interaction, bot, ticket)
        break
      case "reabrir":
        await this.reopenTicket(interaction, bot)
        break
    }
  },

  async closeTicket(interaction, bot, ticket) {
    const reason = interaction.options.getString("razao") || "Nenhuma razão fornecida"

    try {
      // Create confirmation buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("confirm_close_ticket")
          .setLabel("Confirmar")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("✅"),
        new ButtonBuilder()
          .setCustomId("cancel_close_ticket")
          .setLabel("Cancelar")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("❌"),
      )

      const confirmEmbed = new EmbedBuilder()
        .setTitle("🎫 Fechar Ticket")
        .setDescription(`Tem certeza que deseja fechar este ticket?\n\n**Razão:** ${reason}`)
        .setColor("#ff9900")
        .setTimestamp()

      await interaction.reply({
        embeds: [confirmEmbed],
        components: [row],
        ephemeral: true,
      })

      // Store close reason temporarily
      bot.tempData = bot.tempData || new Map()
      bot.tempData.set(`close_${interaction.channel.id}`, { reason, moderator: interaction.user.id })
    } catch (error) {
      bot.logger.error("Error closing ticket:", error)
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
  },

  async addUser(interaction, bot, ticket) {
    const user = interaction.options.getUser("usuario")

    try {
      // Add user permissions to channel
      await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      })

      const embed = new EmbedBuilder()
        .setTitle("✅ Usuário Adicionado")
        .setDescription(`${user} foi adicionado ao ticket`)
        .setColor("#00ff00")
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })

      // Notify in channel
      const notifyEmbed = new EmbedBuilder()
        .setDescription(`${user} foi adicionado ao ticket por ${interaction.user}`)
        .setColor("#0099ff")
        .setTimestamp()

      await interaction.channel.send({ embeds: [notifyEmbed] })
    } catch (error) {
      bot.logger.error("Error adding user to ticket:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao adicionar o usuário")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },

  async removeUser(interaction, bot, ticket) {
    const user = interaction.options.getUser("usuario")

    try {
      // Remove user permissions from channel
      await interaction.channel.permissionOverwrites.delete(user.id)

      const embed = new EmbedBuilder()
        .setTitle("✅ Usuário Removido")
        .setDescription(`${user} foi removido do ticket`)
        .setColor("#00ff00")
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })

      // Notify in channel
      const notifyEmbed = new EmbedBuilder()
        .setDescription(`${user} foi removido do ticket por ${interaction.user}`)
        .setColor("#0099ff")
        .setTimestamp()

      await interaction.channel.send({ embeds: [notifyEmbed] })
    } catch (error) {
      bot.logger.error("Error removing user from ticket:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao remover o usuário")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },

  async generateTranscript(interaction, bot, ticket) {
    try {
      await interaction.deferReply({ ephemeral: true })

      // Fetch all messages from the channel
      const messages = []
      let lastMessageId

      while (true) {
        const fetchedMessages = await interaction.channel.messages.fetch({
          limit: 100,
          before: lastMessageId,
        })

        if (fetchedMessages.size === 0) break

        messages.push(...fetchedMessages.values())
        lastMessageId = fetchedMessages.last().id
      }

      // Reverse to get chronological order
      messages.reverse()

      // Generate transcript content
      let transcript = `TRANSCRIÇÃO DO TICKET\n`
      transcript += `Canal: ${interaction.channel.name}\n`
      transcript += `Criado por: ${ticket.user_id}\n`
      transcript += `Data de criação: ${new Date(ticket.created_at).toLocaleString("pt-BR")}\n`
      transcript += `Total de mensagens: ${messages.length}\n`
      transcript += `\n${"=".repeat(50)}\n\n`

      for (const message of messages) {
        const timestamp = message.createdAt.toLocaleString("pt-BR")
        const author = message.author.tag
        const content = message.content || "[Sem conteúdo]"

        transcript += `[${timestamp}] ${author}: ${content}\n`

        if (message.attachments.size > 0) {
          message.attachments.forEach((attachment) => {
            transcript += `  📎 Anexo: ${attachment.url}\n`
          })
        }

        if (message.embeds.length > 0) {
          transcript += `  📋 Embed: ${message.embeds[0].title || "Sem título"}\n`
        }

        transcript += "\n"
      }

      // Create file buffer
      const buffer = Buffer.from(transcript, "utf-8")

      // Send transcript file
      await interaction.editReply({
        content: "📄 Transcrição gerada com sucesso!",
        files: [
          {
            attachment: buffer,
            name: `transcript-${interaction.channel.name}-${Date.now()}.txt`,
          },
        ],
      })
    } catch (error) {
      bot.logger.error("Error generating transcript:", error)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao gerar a transcrição")
            .setColor("#ff0000"),
        ],
      })
    }
  },

  async reopenTicket(interaction, bot) {
    try {
      // Check if channel was a ticket
      const closedTicket = await bot.database.get("SELECT * FROM tickets WHERE channel_id = ? AND status = 'closed'", [
        interaction.channel.id,
      ])

      if (!closedTicket) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Erro")
              .setDescription("Este canal não é um ticket fechado")
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      // Reopen ticket
      await bot.database.run("UPDATE tickets SET status = 'open', closed_at = NULL, closed_by = NULL WHERE id = ?", [
        closedTicket.id,
      ])

      // Update channel permissions
      const supportRoleId = await bot.database.getConfig("ticket_support_role")
      const supportRole = interaction.guild.roles.cache.get(supportRoleId)

      await interaction.channel.permissionOverwrites.edit(closedTicket.user_id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      })

      if (supportRole) {
        await interaction.channel.permissionOverwrites.edit(supportRole, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
          ManageMessages: true,
        })
      }

      const embed = new EmbedBuilder()
        .setTitle("🎫 Ticket Reaberto")
        .setDescription(`Ticket reaberto por ${interaction.user}`)
        .setColor("#00ff00")
        .setTimestamp()

      await interaction.reply({ embeds: [embed] })
    } catch (error) {
      bot.logger.error("Error reopening ticket:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao reabrir o ticket")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },
}
