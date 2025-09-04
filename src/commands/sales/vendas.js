const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("vendas")
    .setDescription("Ver relatórios de vendas")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("resumo")
        .setDescription("Ver resumo geral de vendas")
        .addStringOption((option) =>
          option
            .setName("periodo")
            .setDescription("Período do relatório")
            .addChoices(
              { name: "Hoje", value: "today" },
              { name: "Esta semana", value: "week" },
              { name: "Este mês", value: "month" },
              { name: "Todos os tempos", value: "all" },
            )
            .setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("produto")
        .setDescription("Ver vendas de um produto específico")
        .addIntegerOption((option) => option.setName("produto_id").setDescription("ID do produto").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("usuario")
        .setDescription("Ver compras de um usuário")
        .addUserOption((option) =>
          option.setName("usuario").setDescription("Usuário para consultar").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) => subcommand.setName("exportar").setDescription("Exportar relatório completo"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, bot) {
    const subcommand = interaction.options.getSubcommand()

    switch (subcommand) {
      case "resumo":
        await this.salesSummary(interaction, bot)
        break
      case "produto":
        await this.productSales(interaction, bot)
        break
      case "usuario":
        await this.userPurchases(interaction, bot)
        break
      case "exportar":
        await this.exportReport(interaction, bot)
        break
    }
  },

  async salesSummary(interaction, bot) {
    const period = interaction.options.getString("periodo") || "all"

    try {
      await interaction.deferReply({ ephemeral: true })

      // Build date filter
      let dateFilter = ""
      let periodName = "Todos os tempos"

      const now = new Date()
      switch (period) {
        case "today":
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          dateFilter = `AND created_at >= '${today.toISOString()}'`
          periodName = "Hoje"
          break
        case "week":
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          dateFilter = `AND created_at >= '${weekAgo.toISOString()}'`
          periodName = "Esta semana"
          break
        case "month":
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          dateFilter = `AND created_at >= '${monthStart.toISOString()}'`
          periodName = "Este mês"
          break
      }

      // Get sales statistics
      const totalSales = await bot.database.get(
        `SELECT COUNT(*) as count, SUM(total_amount) as revenue FROM orders WHERE status = 'completed' ${dateFilter}`,
      )

      const pendingSales = await bot.database.get(
        `SELECT COUNT(*) as count FROM orders WHERE status = 'pending' ${dateFilter}`,
      )

      const cancelledSales = await bot.database.get(
        `SELECT COUNT(*) as count FROM orders WHERE status = 'cancelled' ${dateFilter}`,
      )

      // Get top products
      const topProducts = await bot.database.all(
        `SELECT p.name, p.id, COUNT(o.id) as sales_count, SUM(o.total_amount) as revenue 
         FROM orders o 
         JOIN products p ON o.product_id = p.id 
         WHERE o.status = 'completed' ${dateFilter}
         GROUP BY p.id 
         ORDER BY sales_count DESC 
         LIMIT 5`,
      )

      // Get recent sales
      const recentSales = await bot.database.all(
        `SELECT o.*, p.name as product_name 
         FROM orders o 
         JOIN products p ON o.product_id = p.id 
         WHERE o.status = 'completed' ${dateFilter}
         ORDER BY o.completed_at DESC 
         LIMIT 5`,
      )

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle("📊 Relatório de Vendas")
        .setDescription(`Período: **${periodName}**`)
        .setColor("#0099ff")
        .setTimestamp()

      // Add statistics
      embed.addFields(
        { name: "💰 Receita Total", value: `R$ ${(totalSales.revenue || 0).toFixed(2)}`, inline: true },
        { name: "✅ Vendas Concluídas", value: (totalSales.count || 0).toString(), inline: true },
        { name: "⏳ Vendas Pendentes", value: (pendingSales.count || 0).toString(), inline: true },
        { name: "❌ Vendas Canceladas", value: (cancelledSales.count || 0).toString(), inline: true },
        {
          name: "📈 Ticket Médio",
          value: totalSales.count > 0 ? `R$ ${(totalSales.revenue / totalSales.count).toFixed(2)}` : "R$ 0,00",
          inline: true,
        },
        {
          name: "📦 Total de Pedidos",
          value: ((totalSales.count || 0) + (pendingSales.count || 0) + (cancelledSales.count || 0)).toString(),
          inline: true,
        },
      )

      // Add top products
      if (topProducts.length > 0) {
        const topProductsList = topProducts
          .map(
            (product, index) =>
              `**${index + 1}.** ${product.name} - ${product.sales_count} vendas (R$ ${product.revenue.toFixed(2)})`,
          )
          .join("\n")

        embed.addFields({ name: "🏆 Top Produtos", value: topProductsList, inline: false })
      }

      // Add recent sales
      if (recentSales.length > 0) {
        const recentSalesList = recentSales
          .map((sale) => {
            const date = new Date(sale.completed_at).toLocaleDateString("pt-BR")
            return `**${sale.product_name}** - R$ ${sale.total_amount.toFixed(2)} - ${date}`
          })
          .join("\n")

        embed.addFields({ name: "🕐 Vendas Recentes", value: recentSalesList, inline: false })
      }

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      bot.logger.error("Error in sales summary:", error)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao gerar o relatório de vendas")
            .setColor("#ff0000"),
        ],
      })
    }
  },

  async productSales(interaction, bot) {
    const productId = interaction.options.getInteger("produto_id")

    try {
      await interaction.deferReply({ ephemeral: true })

      // Get product
      const product = await bot.database.get("SELECT * FROM products WHERE id = ?", [productId])

      if (!product) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Produto não encontrado")
              .setDescription(`Produto com ID ${productId} não foi encontrado`)
              .setColor("#ff0000"),
          ],
        })
      }

      // Get sales statistics
      const salesStats = await bot.database.get(
        "SELECT COUNT(*) as total_sales, SUM(total_amount) as total_revenue, SUM(quantity) as total_quantity FROM orders WHERE product_id = ? AND status = 'completed'",
        [productId],
      )

      const pendingOrders = await bot.database.get(
        "SELECT COUNT(*) as count FROM orders WHERE product_id = ? AND status = 'pending'",
        [productId],
      )

      // Get recent sales
      const recentSales = await bot.database.all(
        "SELECT * FROM orders WHERE product_id = ? AND status = 'completed' ORDER BY completed_at DESC LIMIT 10",
        [productId],
      )

      // Get current stock
      const currentStock = await bot.database.get(
        "SELECT COUNT(*) as count FROM product_stock WHERE product_id = ? AND used = 0",
        [productId],
      )

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`📊 Relatório - ${product.name}`)
        .setDescription(`Estatísticas detalhadas do produto ID ${productId}`)
        .setColor(product.embed_color)
        .setTimestamp()

      if (product.image_url) {
        embed.setThumbnail(product.image_url)
      }

      // Add statistics
      embed.addFields(
        { name: "💰 Receita Total", value: `R$ ${(salesStats.total_revenue || 0).toFixed(2)}`, inline: true },
        { name: "📦 Unidades Vendidas", value: (salesStats.total_quantity || 0).toString(), inline: true },
        { name: "🛒 Pedidos Concluídos", value: (salesStats.total_sales || 0).toString(), inline: true },
        { name: "⏳ Pedidos Pendentes", value: (pendingOrders.count || 0).toString(), inline: true },
        { name: "📦 Estoque Atual", value: (currentStock.count || 0).toString(), inline: true },
        {
          name: "💵 Preço Atual",
          value: `R$ ${product.price.toFixed(2)}`,
          inline: true,
        },
      )

      // Add recent sales
      if (recentSales.length > 0) {
        const recentSalesList = recentSales
          .map((sale) => {
            const date = new Date(sale.completed_at).toLocaleDateString("pt-BR")
            return `**Pedido ${sale.id.substring(0, 8)}** - ${sale.quantity}x - R$ ${sale.total_amount.toFixed(2)} - ${date}`
          })
          .join("\n")

        embed.addFields({ name: "🕐 Vendas Recentes", value: recentSalesList.substring(0, 1024), inline: false })
      }

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      bot.logger.error("Error in product sales:", error)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao gerar o relatório do produto")
            .setColor("#ff0000"),
        ],
      })
    }
  },

  async userPurchases(interaction, bot) {
    const user = interaction.options.getUser("usuario")

    try {
      await interaction.deferReply({ ephemeral: true })

      // Get user purchases
      const purchases = await bot.database.all(
        `SELECT o.*, p.name as product_name 
         FROM orders o 
         JOIN products p ON o.product_id = p.id 
         WHERE o.user_id = ? 
         ORDER BY o.created_at DESC`,
        [user.id],
      )

      if (purchases.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("📋 Nenhuma compra encontrada")
              .setDescription(`${user.tag} ainda não fez nenhuma compra`)
              .setColor("#ff9900"),
          ],
        })
      }

      // Calculate statistics
      const completedPurchases = purchases.filter((p) => p.status === "completed")
      const totalSpent = completedPurchases.reduce((sum, p) => sum + p.total_amount, 0)
      const totalItems = completedPurchases.reduce((sum, p) => sum + p.quantity, 0)

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`📋 Compras - ${user.tag}`)
        .setDescription(`Histórico de compras do usuário`)
        .setColor("#0099ff")
        .setThumbnail(user.displayAvatarURL({ dynamic: true }))
        .setTimestamp()

      // Add statistics
      embed.addFields(
        { name: "💰 Total Gasto", value: `R$ ${totalSpent.toFixed(2)}`, inline: true },
        { name: "📦 Itens Comprados", value: totalItems.toString(), inline: true },
        { name: "🛒 Compras Concluídas", value: completedPurchases.length.toString(), inline: true },
        { name: "📋 Total de Pedidos", value: purchases.length.toString(), inline: true },
        {
          name: "💵 Ticket Médio",
          value:
            completedPurchases.length > 0 ? `R$ ${(totalSpent / completedPurchases.length).toFixed(2)}` : "R$ 0,00",
          inline: true,
        },
      )

      // Add recent purchases
      const recentPurchases = purchases.slice(0, 10)
      const purchasesList = recentPurchases
        .map((purchase) => {
          const date = new Date(purchase.created_at).toLocaleDateString("pt-BR")
          const statusEmoji = purchase.status === "completed" ? "✅" : purchase.status === "pending" ? "⏳" : "❌"
          return `${statusEmoji} **${purchase.product_name}** - ${purchase.quantity}x - R$ ${purchase.total_amount.toFixed(2)} - ${date}`
        })
        .join("\n")

      embed.addFields({ name: "🕐 Compras Recentes", value: purchasesList.substring(0, 1024), inline: false })

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      bot.logger.error("Error in user purchases:", error)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao buscar as compras do usuário")
            .setColor("#ff0000"),
        ],
      })
    }
  },

  async exportReport(interaction, bot) {
    try {
      await interaction.deferReply({ ephemeral: true })

      // Get all sales data
      const sales = await bot.database.all(
        `SELECT o.*, p.name as product_name, p.category 
         FROM orders o 
         JOIN products p ON o.product_id = p.id 
         ORDER BY o.created_at DESC`,
      )

      if (sales.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Nenhum dado encontrado")
              .setDescription("Não há vendas para exportar")
              .setColor("#ff9900"),
          ],
        })
      }

      // Generate CSV content
      let csvContent =
        "ID do Pedido,Usuario ID,Produto,Categoria,Quantidade,Valor Total,Status,Data Criacao,Data Conclusao\n"

      for (const sale of sales) {
        const createdAt = new Date(sale.created_at).toLocaleString("pt-BR")
        const completedAt = sale.completed_at ? new Date(sale.completed_at).toLocaleString("pt-BR") : ""

        csvContent += `${sale.id},${sale.user_id},"${sale.product_name}","${sale.category}",${sale.quantity},${sale.total_amount},${sale.status},"${createdAt}","${completedAt}"\n`
      }

      // Create file
      const buffer = Buffer.from(csvContent, "utf-8")
      const attachment = new AttachmentBuilder(buffer, {
        name: `relatorio-vendas-${Date.now()}.csv`,
      })

      // Summary embed
      const summaryEmbed = new EmbedBuilder()
        .setTitle("📊 Relatório Exportado")
        .setDescription(`Relatório completo de vendas exportado com sucesso!`)
        .addFields(
          { name: "📋 Total de Registros", value: sales.length.toString(), inline: true },
          { name: "📅 Data de Exportação", value: new Date().toLocaleString("pt-BR"), inline: true },
        )
        .setColor("#00ff00")
        .setTimestamp()

      await interaction.editReply({
        embeds: [summaryEmbed],
        files: [attachment],
      })

      // Log action
      bot.logger.info(`Sales report exported by ${interaction.user.tag}: ${sales.length} records`)
    } catch (error) {
      bot.logger.error("Error exporting report:", error)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao exportar o relatório")
            .setColor("#ff0000"),
        ],
      })
    }
  },
}
