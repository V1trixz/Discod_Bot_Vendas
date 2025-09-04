const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("estoque")
    .setDescription("Gerenciar estoque de produtos")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("adicionar")
        .setDescription("Adicionar itens ao estoque")
        .addIntegerOption((option) => option.setName("produto_id").setDescription("ID do produto").setRequired(true))
        .addStringOption((option) =>
          option.setName("conteudo").setDescription("Conteúdo do item (conta, key, etc.)").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("adicionar_lote")
        .setDescription("Adicionar múltiplos itens ao estoque")
        .addIntegerOption((option) => option.setName("produto_id").setDescription("ID do produto").setRequired(true))
        .addAttachmentOption((option) =>
          option.setName("arquivo").setDescription("Arquivo .txt com os itens (um por linha)").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remover")
        .setDescription("Remover item do estoque")
        .addIntegerOption((option) =>
          option.setName("item_id").setDescription("ID do item no estoque").setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("listar")
        .setDescription("Listar itens do estoque")
        .addIntegerOption((option) => option.setName("produto_id").setDescription("ID do produto").setRequired(true))
        .addBooleanOption((option) =>
          option.setName("mostrar_usados").setDescription("Mostrar itens já vendidos").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("limpar")
        .setDescription("Limpar todo o estoque de um produto")
        .addIntegerOption((option) => option.setName("produto_id").setDescription("ID do produto").setRequired(true)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, bot) {
    const subcommand = interaction.options.getSubcommand()

    switch (subcommand) {
      case "adicionar":
        await this.addStock(interaction, bot)
        break
      case "adicionar_lote":
        await this.addBulkStock(interaction, bot)
        break
      case "remover":
        await this.removeStock(interaction, bot)
        break
      case "listar":
        await this.listStock(interaction, bot)
        break
      case "limpar":
        await this.clearStock(interaction, bot)
        break
    }
  },

  async addStock(interaction, bot) {
    const productId = interaction.options.getInteger("produto_id")
    const content = interaction.options.getString("conteudo")

    try {
      // Check if product exists
      const product = await bot.database.get("SELECT * FROM products WHERE id = ?", [productId])

      if (!product) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Produto não encontrado")
              .setDescription(`Produto com ID ${productId} não foi encontrado`)
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      // Add item to stock
      const result = await bot.database.run("INSERT INTO product_stock (product_id, content) VALUES (?, ?)", [
        productId,
        content,
      ])

      // Update product stock count
      const stockCount = await bot.database.get(
        "SELECT COUNT(*) as count FROM product_stock WHERE product_id = ? AND used = 0",
        [productId],
      )

      await bot.database.run("UPDATE products SET stock = ? WHERE id = ?", [stockCount.count, productId])

      // Success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Item Adicionado ao Estoque")
        .setDescription(`Item adicionado ao produto **${product.name}**`)
        .addFields(
          { name: "Produto ID", value: productId.toString(), inline: true },
          { name: "Item ID", value: result.id.toString(), inline: true },
          { name: "Estoque Total", value: stockCount.count.toString(), inline: true },
        )
        .setColor("#00ff00")
        .setTimestamp()

      await interaction.reply({ embeds: [successEmbed], ephemeral: true })

      // Log action
      bot.logger.info(`Stock added to product ${productId} by ${interaction.user.tag}`)
    } catch (error) {
      bot.logger.error("Error adding stock:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao adicionar o item ao estoque")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },

  async addBulkStock(interaction, bot) {
    const productId = interaction.options.getInteger("produto_id")
    const attachment = interaction.options.getAttachment("arquivo")

    try {
      // Check if product exists
      const product = await bot.database.get("SELECT * FROM products WHERE id = ?", [productId])

      if (!product) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Produto não encontrado")
              .setDescription(`Produto com ID ${productId} não foi encontrado`)
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      // Validate file type
      if (!attachment.name.endsWith(".txt")) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Arquivo inválido")
              .setDescription("Por favor, envie um arquivo .txt")
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      await interaction.deferReply({ ephemeral: true })

      // Download and read file
      const response = await fetch(attachment.url)
      const text = await response.text()
      const items = text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)

      if (items.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Arquivo vazio")
              .setDescription("O arquivo não contém itens válidos")
              .setColor("#ff0000"),
          ],
        })
      }

      // Add items to stock
      let addedCount = 0
      for (const item of items) {
        try {
          await bot.database.run("INSERT INTO product_stock (product_id, content) VALUES (?, ?)", [productId, item])
          addedCount++
        } catch (error) {
          bot.logger.warn(`Failed to add stock item: ${item}`)
        }
      }

      // Update product stock count
      const stockCount = await bot.database.get(
        "SELECT COUNT(*) as count FROM product_stock WHERE product_id = ? AND used = 0",
        [productId],
      )

      await bot.database.run("UPDATE products SET stock = ? WHERE id = ?", [stockCount.count, productId])

      // Success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Estoque Adicionado em Lote")
        .setDescription(`Itens adicionados ao produto **${product.name}**`)
        .addFields(
          { name: "Itens processados", value: items.length.toString(), inline: true },
          { name: "Itens adicionados", value: addedCount.toString(), inline: true },
          { name: "Estoque total", value: stockCount.count.toString(), inline: true },
        )
        .setColor("#00ff00")
        .setTimestamp()

      await interaction.editReply({ embeds: [successEmbed] })

      // Log action
      bot.logger.info(`Bulk stock added to product ${productId}: ${addedCount} items by ${interaction.user.tag}`)
    } catch (error) {
      bot.logger.error("Error adding bulk stock:", error)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao adicionar o estoque em lote")
            .setColor("#ff0000"),
        ],
      })
    }
  },

  async removeStock(interaction, bot) {
    const itemId = interaction.options.getInteger("item_id")

    try {
      // Check if item exists
      const item = await bot.database.get("SELECT * FROM product_stock WHERE id = ?", [itemId])

      if (!item) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Item não encontrado")
              .setDescription(`Item com ID ${itemId} não foi encontrado`)
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      // Remove item
      await bot.database.run("DELETE FROM product_stock WHERE id = ?", [itemId])

      // Update product stock count
      const stockCount = await bot.database.get(
        "SELECT COUNT(*) as count FROM product_stock WHERE product_id = ? AND used = 0",
        [item.product_id],
      )

      await bot.database.run("UPDATE products SET stock = ? WHERE id = ?", [stockCount.count, item.product_id])

      // Success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Item Removido do Estoque")
        .setDescription(`Item ID ${itemId} foi removido do estoque`)
        .addFields({ name: "Estoque restante", value: stockCount.count.toString(), inline: true })
        .setColor("#00ff00")
        .setTimestamp()

      await interaction.reply({ embeds: [successEmbed], ephemeral: true })

      // Log action
      bot.logger.info(`Stock item ${itemId} removed by ${interaction.user.tag}`)
    } catch (error) {
      bot.logger.error("Error removing stock:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao remover o item do estoque")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },

  async listStock(interaction, bot) {
    const productId = interaction.options.getInteger("produto_id")
    const showUsed = interaction.options.getBoolean("mostrar_usados") || false

    try {
      await interaction.deferReply({ ephemeral: true })

      // Check if product exists
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

      // Get stock items
      let query = "SELECT * FROM product_stock WHERE product_id = ?"
      const params = [productId]

      if (!showUsed) {
        query += " AND used = 0"
      }

      query += " ORDER BY created_at DESC LIMIT 50"

      const items = await bot.database.all(query, params)

      if (items.length === 0) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("📦 Estoque Vazio")
              .setDescription(`Nenhum item encontrado no estoque do produto **${product.name}**`)
              .setColor("#ff9900"),
          ],
        })
      }

      // Create embed
      const embed = new EmbedBuilder()
        .setTitle(`📦 Estoque - ${product.name}`)
        .setDescription(`Listando ${showUsed ? "todos os" : "apenas"} itens ${showUsed ? "" : "disponíveis"}`)
        .setColor(product.embed_color)
        .setTimestamp()

      // Add items to embed
      const maxItems = Math.min(items.length, 25)
      for (let i = 0; i < maxItems; i++) {
        const item = items[i]
        const status = item.used ? "🔴 Vendido" : "🟢 Disponível"
        const usedInfo = item.used
          ? `\nVendido para: <@${item.used_by}>\nEm: ${new Date(item.used_at).toLocaleDateString("pt-BR")}`
          : ""

        embed.addFields({
          name: `Item ${item.id} - ${status}`,
          value: `\`\`\`${item.content.substring(0, 100)}${item.content.length > 100 ? "..." : ""}\`\`\`${usedInfo}`,
          inline: false,
        })
      }

      if (items.length > 25) {
        embed.setFooter({ text: `Mostrando 25 de ${items.length} itens` })
      }

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      bot.logger.error("Error listing stock:", error)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao listar o estoque")
            .setColor("#ff0000"),
        ],
      })
    }
  },

  async clearStock(interaction, bot) {
    const productId = interaction.options.getInteger("produto_id")

    try {
      // Check if product exists
      const product = await bot.database.get("SELECT * FROM products WHERE id = ?", [productId])

      if (!product) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Produto não encontrado")
              .setDescription(`Produto com ID ${productId} não foi encontrado`)
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      // Get current stock count
      const stockCount = await bot.database.get(
        "SELECT COUNT(*) as count FROM product_stock WHERE product_id = ? AND used = 0",
        [productId],
      )

      if (stockCount.count === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Estoque já vazio")
              .setDescription(`O produto **${product.name}** já não possui itens em estoque`)
              .setColor("#ff9900"),
          ],
          ephemeral: true,
        })
      }

      // Clear stock
      await bot.database.run("DELETE FROM product_stock WHERE product_id = ? AND used = 0", [productId])

      // Update product stock count
      await bot.database.run("UPDATE products SET stock = 0 WHERE id = ?", [productId])

      // Success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Estoque Limpo")
        .setDescription(`Todo o estoque do produto **${product.name}** foi removido`)
        .addFields({ name: "Itens removidos", value: stockCount.count.toString(), inline: true })
        .setColor("#00ff00")
        .setTimestamp()

      await interaction.reply({ embeds: [successEmbed], ephemeral: true })

      // Log action
      bot.logger.info(`Stock cleared for product ${productId}: ${stockCount.count} items by ${interaction.user.tag}`)
    } catch (error) {
      bot.logger.error("Error clearing stock:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao limpar o estoque")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },
}
