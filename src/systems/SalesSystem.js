const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")

class SalesSystem {
  constructor(bot) {
    this.bot = bot
    this.paymentManager = bot.paymentManager
  }

  async handleSalesInteraction(interaction) {
    const customId = interaction.customId

    if (customId.startsWith("pay_")) {
      await this.handlePayment(interaction)
    } else if (customId.startsWith("cancel_order_")) {
      await this.cancelOrder(interaction)
    } else if (customId.startsWith("confirm_delete_product_")) {
      await this.confirmDeleteProduct(interaction)
    } else if (customId.startsWith("cancel_delete_product_")) {
      await this.cancelDeleteProduct(interaction)
    } else if (customId === "shop_refresh") {
      await this.refreshShop(interaction)
    } else if (customId === "shop_cart") {
      await this.showCart(interaction)
    } else if (customId === "shop_help") {
      await this.showShopHelp(interaction)
    } else if (customId === "shop_category_filter") {
      await this.handleCategoryFilter(interaction)
    }
  }

  async handlePayment(interaction) {
    const [, paymentMethod, orderId] = interaction.customId.split("_")

    try {
      // Get order from temp storage
      const orderData = this.bot.tempOrders?.get(orderId)
      if (!orderData) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Pedido Expirado")
              .setDescription("Este pedido expirou ou não foi encontrado")
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      // Check if order still exists and is pending
      const order = await this.bot.database.get("SELECT * FROM orders WHERE id = ? AND status = 'pending'", [orderId])
      if (!order) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Pedido Inválido")
              .setDescription("Este pedido não existe ou já foi processado")
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      await interaction.deferReply({ ephemeral: true })

      // Get product
      const product = await this.bot.database.get("SELECT * FROM products WHERE id = ?", [order.product_id])

      // Check stock again
      const availableStock = await this.bot.database.get(
        "SELECT COUNT(*) as count FROM product_stock WHERE product_id = ? AND used = 0",
        [order.product_id],
      )

      if (availableStock.count < order.quantity) {
        await this.bot.database.run("UPDATE orders SET status = 'cancelled' WHERE id = ?", [orderId])
        this.bot.tempOrders?.delete(orderId)

        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Estoque Insuficiente")
              .setDescription("O produto não possui estoque suficiente no momento")
              .setColor("#ff0000"),
          ],
        })
      }

      const guildId = interaction.guild.id
      const gateway = await this.bot.database.getConfig(guildId, "payment_gateway_default")

      if (!gateway) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Gateway Não Configurado")
              .setDescription(
                "Nenhum gateway de pagamento foi configurado para este servidor.\n\nUse `/configurar-pagamento` para configurar.",
              )
              .setColor("#ff0000"),
          ],
        })
      }

      const paymentResult = await this.paymentManager.processPayment(orderId, guildId, gateway, paymentMethod)

      if (paymentResult.success) {
        await interaction.editReply({
          embeds: [paymentResult.embed],
          components: [],
        })

        this.bot.logger.info(
          `Payment initiated for order ${orderId} via ${gateway}/${paymentMethod} in guild ${guildId}`,
        )
      } else {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Erro no Pagamento")
              .setDescription(`Erro ao processar pagamento: ${paymentResult.error}`)
              .setColor("#ff0000"),
          ],
        })
      }
    } catch (error) {
      this.bot.logger.error("Error handling payment:", error)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro no Pagamento")
            .setDescription("Ocorreu um erro ao processar o pagamento")
            .setColor("#ff0000"),
        ],
      })
    }
  }

  async cancelOrder(interaction) {
    const orderId = interaction.customId.split("_")[2]

    try {
      await this.bot.database.run("UPDATE orders SET status = 'cancelled' WHERE id = ?", [orderId])

      this.bot.tempOrders?.delete(orderId)

      const cancelEmbed = new EmbedBuilder()
        .setTitle("❌ Pedido Cancelado")
        .setDescription("Seu pedido foi cancelado com sucesso")
        .setColor("#ff9900")
        .setTimestamp()

      await interaction.update({ embeds: [cancelEmbed], components: [] })

      this.bot.logger.info(`Order ${orderId} cancelled by user ${interaction.user.tag}`)
    } catch (error) {
      this.bot.logger.error("Error cancelling order:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao cancelar o pedido")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  }

  async confirmDeleteProduct(interaction) {
    const productId = interaction.customId.split("_")[3]

    try {
      const product = await this.bot.database.get("SELECT * FROM products WHERE id = ?", [productId])

      await this.bot.database.run("UPDATE products SET active = 0 WHERE id = ?", [productId])

      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Produto Deletado")
        .setDescription(`Produto **${product.name}** foi deletado com sucesso`)
        .setColor("#00ff00")
        .setTimestamp()

      await interaction.update({ embeds: [successEmbed], components: [] })

      this.bot.logger.info(`Product ${productId} (${product.name}) deleted by ${interaction.user.tag}`)
    } catch (error) {
      this.bot.logger.error("Error deleting product:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao deletar o produto")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  }

  async cancelDeleteProduct(interaction) {
    const cancelEmbed = new EmbedBuilder()
      .setTitle("❌ Exclusão Cancelada")
      .setDescription("A exclusão do produto foi cancelada")
      .setColor("#ff9900")
      .setTimestamp()

    await interaction.update({ embeds: [cancelEmbed], components: [] })
  }

  async refreshShop(interaction) {
    try {
      await interaction.deferUpdate()

      const products = await this.bot.database.all("SELECT * FROM products WHERE active = 1 ORDER BY created_at DESC")

      if (products.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🛒 Loja Vazia")
              .setDescription("Nenhum produto disponível no momento")
              .setColor("#ff9900"),
          ],
          components: [],
        })
      }

      const embed = new EmbedBuilder()
        .setTitle("🛒 Loja Virtual")
        .setDescription(`Loja atualizada! Temos **${products.length}** produtos disponíveis.`)
        .setColor("#0099ff")
        .setTimestamp()

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      this.bot.logger.error("Error refreshing shop:", error)
    }
  }

  async showCart(interaction) {
    try {
      const pendingOrders = await this.bot.database.all(
        `SELECT o.*, p.name as product_name 
         FROM orders o 
         JOIN products p ON o.product_id = p.id 
         WHERE o.user_id = ? AND o.status = 'pending' 
         ORDER BY o.created_at DESC`,
        [interaction.user.id],
      )

      const embed = new EmbedBuilder().setTitle("🛒 Seu Carrinho").setColor("#0099ff").setTimestamp()

      if (pendingOrders.length === 0) {
        embed.setDescription("Seu carrinho está vazio")
      } else {
        const ordersList = pendingOrders
          .map((order) => `**${order.product_name}** - ${order.quantity}x - R$ ${order.total_amount.toFixed(2)}`)
          .join("\n")

        const total = pendingOrders.reduce((sum, order) => sum + order.total_amount, 0)

        embed.setDescription(ordersList)
        embed.addFields({ name: "💰 Total", value: `R$ ${total.toFixed(2)}`, inline: true })
      }

      await interaction.reply({ embeds: [embed], ephemeral: true })
    } catch (error) {
      this.bot.logger.error("Error showing cart:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao mostrar seu carrinho")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  }

  async showShopHelp(interaction) {
    const helpEmbed = new EmbedBuilder()
      .setTitle("❓ Como Comprar")
      .setDescription(
        "**Guia de compras da nossa loja:**\n\n" +
          "🛒 **Ver Produtos:** Use `/loja` para ver todos os produtos\n" +
          "🔍 **Detalhes:** Use `/produto info <id>` para ver detalhes\n" +
          "💳 **Comprar:** Use `/comprar <id>` para iniciar uma compra\n" +
          "📦 **Estoque:** Produtos com estoque 0 não podem ser comprados\n" +
          "💰 **Pagamento:** Aceitamos PIX e cartão de crédito\n" +
          "📱 **Entrega:** Produtos são entregues automaticamente após o pagamento\n" +
          "🎫 **Suporte:** Abra um ticket se tiver problemas\n\n" +
          "**Métodos de Pagamento:**\n" +
          "• PIX (aprovação instantânea)\n" +
          "• Cartão de crédito\n" +
          "• Mercado Pago\n\n" +
          "**Política:**\n" +
          "• Todas as vendas são finais\n" +
          "• Produtos digitais não têm devolução\n" +
          "• Suporte disponível 24/7",
      )
      .setColor("#0099ff")
      .setTimestamp()
      .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })

    await interaction.reply({ embeds: [helpEmbed], ephemeral: true })
  }

  async handleCategoryFilter(interaction) {
    const selectedValue = interaction.values[0]

    try {
      await interaction.deferUpdate()

      let query = "SELECT * FROM products WHERE active = 1"
      const params = []

      if (selectedValue !== "all_categories") {
        const category = selectedValue.replace("category_", "")
        query += " AND category = ?"
        params.push(category)
      }

      query += " ORDER BY created_at DESC"

      const products = await this.bot.database.all(query, params)

      const embed = new EmbedBuilder()
        .setTitle("🛒 Loja Virtual")
        .setDescription(
          selectedValue === "all_categories"
            ? `Todos os produtos (${products.length} encontrados)`
            : `Categoria: **${selectedValue.replace("category_", "")}** (${products.length} encontrados)`,
        )
        .setColor("#0099ff")
        .setTimestamp()

      const maxProducts = Math.min(products.length, 10)
      for (let i = 0; i < maxProducts; i++) {
        const product = products[i]
        const stockCount = await this.bot.database.get(
          "SELECT COUNT(*) as count FROM product_stock WHERE product_id = ? AND used = 0",
          [product.id],
        )

        embed.addFields({
          name: `${product.name} (ID: ${product.id})`,
          value: `${product.description.substring(0, 100)}...\nR$ ${product.price.toFixed(2)} • ${stockCount.count} em estoque`,
          inline: false,
        })
      }

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      this.bot.logger.error("Error handling category filter:", error)
    }
  }
}

module.exports = SalesSystem
