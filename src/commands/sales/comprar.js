const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js")
const { v4: uuidv4 } = require("uuid")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("comprar")
    .setDescription("Comprar um produto")
    .addIntegerOption((option) => option.setName("produto_id").setDescription("ID do produto").setRequired(true))
    .addIntegerOption((option) =>
      option
        .setName("quantidade")
        .setDescription("Quantidade a comprar")
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false),
    ),

  async execute(interaction, bot) {
    const productId = interaction.options.getInteger("produto_id")
    const quantity = interaction.options.getInteger("quantidade") || 1

    try {
      await interaction.deferReply({ ephemeral: true })

      // Get product
      const product = await bot.database.get("SELECT * FROM products WHERE id = ? AND active = 1", [productId])

      if (!product) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Produto não encontrado")
              .setDescription(`Produto com ID ${productId} não foi encontrado ou não está ativo`)
              .setColor("#ff0000"),
          ],
        })
      }

      // Check stock
      const availableStock = await bot.database.get(
        "SELECT COUNT(*) as count FROM product_stock WHERE product_id = ? AND used = 0",
        [productId],
      )

      if (availableStock.count < quantity) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Estoque Insuficiente")
              .setDescription(
                `Produto **${product.name}** possui apenas **${availableStock.count}** unidades em estoque.\n` +
                  `Você tentou comprar **${quantity}** unidades.`,
              )
              .setColor("#ff0000"),
          ],
        })
      }

      // Calculate total
      const totalAmount = product.price * quantity

      // Create order ID
      const orderId = uuidv4()

      // Create order in database
      await bot.database.run(
        "INSERT INTO orders (id, user_id, product_id, quantity, total_amount, status) VALUES (?, ?, ?, ?, ?, ?)",
        [orderId, interaction.user.id, productId, quantity, totalAmount, "pending"],
      )

      // Create purchase confirmation embed
      const confirmEmbed = new EmbedBuilder()
        .setTitle("🛒 Confirmar Compra")
        .setDescription(`Você está prestes a comprar:`)
        .addFields(
          { name: "📦 Produto", value: product.name, inline: true },
          { name: "🔢 Quantidade", value: quantity.toString(), inline: true },
          { name: "💰 Preço Unitário", value: `R$ ${product.price.toFixed(2)}`, inline: true },
          { name: "💳 Total", value: `R$ ${totalAmount.toFixed(2)}`, inline: true },
          { name: "🆔 ID do Pedido", value: orderId, inline: true },
          { name: "📦 Estoque Disponível", value: availableStock.count.toString(), inline: true },
        )
        .setColor(product.embed_color)
        .setTimestamp()

      if (product.image_url) {
        confirmEmbed.setThumbnail(product.image_url)
      }

      // Create payment buttons
      const paymentRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`pay_pix_${orderId}`)
          .setLabel("Pagar com PIX")
          .setStyle(ButtonStyle.Success)
          .setEmoji("💳"),
        new ButtonBuilder()
          .setCustomId(`pay_card_${orderId}`)
          .setLabel("Cartão de Crédito")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("💳"),
        new ButtonBuilder()
          .setCustomId(`cancel_order_${orderId}`)
          .setLabel("Cancelar")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("❌"),
      )

      await interaction.editReply({
        embeds: [confirmEmbed],
        components: [paymentRow],
      })

      // Store order data temporarily for payment processing
      bot.tempOrders = bot.tempOrders || new Map()
      bot.tempOrders.set(orderId, {
        productId,
        quantity,
        totalAmount,
        userId: interaction.user.id,
        createdAt: Date.now(),
      })

      // Auto-cancel order after 10 minutes
      setTimeout(
        async () => {
          try {
            const order = await bot.database.get("SELECT * FROM orders WHERE id = ? AND status = 'pending'", [orderId])
            if (order) {
              await bot.database.run("UPDATE orders SET status = 'cancelled' WHERE id = ?", [orderId])
              bot.tempOrders?.delete(orderId)
              bot.logger.info(`Order ${orderId} auto-cancelled after timeout`)
            }
          } catch (error) {
            bot.logger.error("Error auto-cancelling order:", error)
          }
        },
        10 * 60 * 1000,
      )

      // Log action
      bot.logger.info(`Purchase initiated: ${product.name} x${quantity} by ${interaction.user.tag} (Order: ${orderId})`)
    } catch (error) {
      bot.logger.error("Error in buy command:", error)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao processar sua compra")
            .setColor("#ff0000"),
        ],
      })
    }
  },
}
