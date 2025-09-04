const TicketSystem = require("../systems/TicketSystem")
const SalesSystem = require("../systems/SalesSystem")

module.exports = {
  name: "interactionCreate",
  async execute(interaction, bot) {
    // Initialize systems if not exists
    if (!bot.ticketSystem) {
      bot.ticketSystem = new TicketSystem(bot)
    }
    if (!bot.salesSystem) {
      bot.salesSystem = new SalesSystem(bot)
    }

    if (interaction.isChatInputCommand()) {
      const command = bot.commands.get(interaction.commandName)

      if (!command) {
        bot.logger.warn(`No command matching ${interaction.commandName} was found.`)
        return
      }

      try {
        // Ensure user exists in database
        await bot.database.createUser({
          id: interaction.user.id,
          username: interaction.user.username,
          discriminator: interaction.user.discriminator,
          avatar: interaction.user.avatar,
        })

        await command.execute(interaction, bot)
      } catch (error) {
        bot.logger.error(`Error executing command ${interaction.commandName}:`, error)

        const errorMessage = "Houve um erro ao executar este comando!"

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true })
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true })
        }
      }
    } else if (interaction.isButton()) {
      // Handle ticket system buttons
      const ticketButtons = [
        "create_ticket",
        "ticket_info",
        "confirm_close_ticket",
        "cancel_close_ticket",
        "rate_ticket",
      ]

      // Handle sales system buttons
      const salesButtons = ["shop_refresh", "shop_cart", "shop_help"]

      if (ticketButtons.includes(interaction.customId) || interaction.customId.startsWith("rate_")) {
        try {
          await bot.ticketSystem.handleTicketInteraction(interaction)
        } catch (error) {
          bot.logger.error("Error handling ticket interaction:", error)

          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: "Ocorreu um erro ao processar sua solicitação.",
              ephemeral: true,
            })
          }
        }
      } else if (
        salesButtons.includes(interaction.customId) ||
        interaction.customId.startsWith("pay_") ||
        interaction.customId.startsWith("cancel_order_") ||
        interaction.customId.startsWith("confirm_delete_product_") ||
        interaction.customId.startsWith("cancel_delete_product_")
      ) {
        try {
          await bot.salesSystem.handleSalesInteraction(interaction)
        } catch (error) {
          bot.logger.error("Error handling sales interaction:", error)

          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: "Ocorreu um erro ao processar sua solicitação.",
              ephemeral: true,
            })
          }
        }
      }
    } else if (interaction.isStringSelectMenu()) {
      // Handle select menus
      if (interaction.customId === "shop_category_filter") {
        try {
          await bot.salesSystem.handleCategoryFilter(interaction)
        } catch (error) {
          bot.logger.error("Error handling category filter:", error)
        }
      }
    }
  },
}
