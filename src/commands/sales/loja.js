const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("loja")
    .setDescription("Ver catálogo de produtos da loja")
    .addStringOption((option) =>
      option.setName("categoria").setDescription("Filtrar por categoria").setRequired(false),
    ),

  async execute(interaction, bot) {
    const category = interaction.options.getString("categoria")

    try {
      await interaction.deferReply()

      // Get products
      let query = "SELECT * FROM products WHERE active = 1"
      const params = []

      if (category) {
        query += " AND category = ?"
        params.push(category)
      }

      query += " ORDER BY created_at DESC"

      const products = await bot.database.all(query, params)

      if (products.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("🛒 Loja Vazia")
              .setDescription(
                category
                  ? `Nenhum produto encontrado na categoria **${category}**`
                  : "Nenhum produto disponível no momento",
              )
              .setColor("#ff9900"),
          ],
        })
      }

      // Get categories for filter menu
      const categories = await bot.database.all(
        "SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category",
      )

      // Create main embed
      const embed = new EmbedBuilder()
        .setTitle("🛒 Loja Virtual")
        .setDescription(
          category
            ? `Produtos da categoria **${category}**`
            : `Bem-vindo à nossa loja! Temos **${products.length}** produtos disponíveis.`,
        )
        .setColor("#0099ff")
        .setTimestamp()
        .setFooter({ text: interaction.guild.name, iconURL: interaction.guild.iconURL() })

      // Add products to embed (show first 10)
      const maxProducts = Math.min(products.length, 10)
      for (let i = 0; i < maxProducts; i++) {
        const product = products[i]
        const stockCount = await bot.database.get(
          "SELECT COUNT(*) as count FROM product_stock WHERE product_id = ? AND used = 0",
          [product.id],
        )

        const stockText = stockCount.count > 0 ? `📦 ${stockCount.count} em estoque` : "❌ Sem estoque"
        const priceText = `💰 R$ ${product.price.toFixed(2)}`

        embed.addFields({
          name: `${product.name} (ID: ${product.id})`,
          value: `${product.description.substring(0, 100)}${product.description.length > 100 ? "..." : ""}\n${priceText} • ${stockText}`,
          inline: false,
        })
      }

      if (products.length > 10) {
        embed.addFields({
          name: "📄 Mais produtos",
          value: `E mais ${products.length - 10} produtos disponíveis...`,
          inline: false,
        })
      }

      // Create components
      const components = []

      // Category filter menu
      if (categories.length > 1) {
        const categoryOptions = [
          {
            label: "Todas as categorias",
            value: "all_categories",
            description: "Ver todos os produtos",
            emoji: "🛒",
          },
          ...categories.map((cat) => ({
            label: cat.category,
            value: `category_${cat.category}`,
            description: `Ver produtos de ${cat.category}`,
            emoji: "🏷️",
          })),
        ]

        const categoryMenu = new StringSelectMenuBuilder()
          .setCustomId("shop_category_filter")
          .setPlaceholder("Filtrar por categoria")
          .addOptions(categoryOptions.slice(0, 25)) // Discord limit

        components.push(new ActionRowBuilder().addComponents(categoryMenu))
      }

      // Navigation buttons
      const navigationRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("shop_refresh")
          .setLabel("Atualizar")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("🔄"),
        new ButtonBuilder().setCustomId("shop_cart").setLabel("Carrinho").setStyle(ButtonStyle.Primary).setEmoji("🛒"),
        new ButtonBuilder()
          .setCustomId("shop_help")
          .setLabel("Como Comprar")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("❓"),
      )

      components.push(navigationRow)

      await interaction.editReply({
        embeds: [embed],
        components: components,
      })
    } catch (error) {
      bot.logger.error("Error in shop command:", error)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao carregar a loja")
            .setColor("#ff0000"),
        ],
      })
    }
  },
}
