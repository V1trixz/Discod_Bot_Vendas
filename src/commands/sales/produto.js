const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} = require("discord.js")

module.exports = {
  data: new SlashCommandBuilder()
    .setName("produto")
    .setDescription("Gerenciar produtos da loja")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("criar")
        .setDescription("Criar um novo produto")
        .addStringOption((option) => option.setName("nome").setDescription("Nome do produto").setRequired(true))
        .addNumberOption((option) =>
          option.setName("preco").setDescription("Preço do produto").setMinValue(0.01).setRequired(true),
        )
        .addStringOption((option) =>
          option.setName("descricao").setDescription("Descrição do produto").setRequired(false),
        )
        .addStringOption((option) =>
          option.setName("categoria").setDescription("Categoria do produto").setRequired(false),
        )
        .addStringOption((option) =>
          option.setName("imagem").setDescription("URL da imagem do produto").setRequired(false),
        )
        .addStringOption((option) =>
          option.setName("cor").setDescription("Cor do embed (hex, ex: #0099ff)").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("editar")
        .setDescription("Editar um produto existente")
        .addIntegerOption((option) => option.setName("id").setDescription("ID do produto").setRequired(true))
        .addStringOption((option) => option.setName("nome").setDescription("Novo nome do produto").setRequired(false))
        .addNumberOption((option) =>
          option.setName("preco").setDescription("Novo preço do produto").setMinValue(0.01).setRequired(false),
        )
        .addStringOption((option) =>
          option.setName("descricao").setDescription("Nova descrição do produto").setRequired(false),
        )
        .addStringOption((option) =>
          option.setName("categoria").setDescription("Nova categoria do produto").setRequired(false),
        )
        .addStringOption((option) =>
          option.setName("imagem").setDescription("Nova URL da imagem do produto").setRequired(false),
        )
        .addStringOption((option) =>
          option.setName("cor").setDescription("Nova cor do embed (hex, ex: #0099ff)").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("deletar")
        .setDescription("Deletar um produto")
        .addIntegerOption((option) => option.setName("id").setDescription("ID do produto").setRequired(true)),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("listar")
        .setDescription("Listar todos os produtos")
        .addStringOption((option) =>
          option.setName("categoria").setDescription("Filtrar por categoria").setRequired(false),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription("Ver informações de um produto")
        .addIntegerOption((option) => option.setName("id").setDescription("ID do produto").setRequired(true)),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction, bot) {
    const subcommand = interaction.options.getSubcommand()

    switch (subcommand) {
      case "criar":
        await this.createProduct(interaction, bot)
        break
      case "editar":
        await this.editProduct(interaction, bot)
        break
      case "deletar":
        await this.deleteProduct(interaction, bot)
        break
      case "listar":
        await this.listProducts(interaction, bot)
        break
      case "info":
        await this.productInfo(interaction, bot)
        break
    }
  },

  async createProduct(interaction, bot) {
    const name = interaction.options.getString("nome")
    const price = interaction.options.getNumber("preco")
    const description = interaction.options.getString("descricao") || "Sem descrição disponível"
    const category = interaction.options.getString("categoria") || "Geral"
    const imageUrl = interaction.options.getString("imagem")
    const color = interaction.options.getString("cor") || "#0099ff"

    try {
      // Validate color format
      if (!/^#[0-9A-F]{6}$/i.test(color)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Erro")
              .setDescription("Cor inválida! Use o formato hex (#0099ff)")
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      // Create product in database
      const result = await bot.database.run(
        "INSERT INTO products (name, description, price, category, image_url, embed_color, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [name, description, price, category, imageUrl, color, interaction.user.id],
      )

      // Success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Produto Criado")
        .setDescription(`Produto **${name}** foi criado com sucesso!`)
        .addFields(
          { name: "ID", value: result.id.toString(), inline: true },
          { name: "Preço", value: `R$ ${price.toFixed(2)}`, inline: true },
          { name: "Categoria", value: category, inline: true },
        )
        .setColor("#00ff00")
        .setTimestamp()

      if (imageUrl) {
        successEmbed.setThumbnail(imageUrl)
      }

      await interaction.reply({ embeds: [successEmbed] })

      // Log action
      bot.logger.info(`Product created: ${name} (ID: ${result.id}) by ${interaction.user.tag}`)
    } catch (error) {
      bot.logger.error("Error creating product:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao criar o produto")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },

  async editProduct(interaction, bot) {
    const productId = interaction.options.getInteger("id")
    const name = interaction.options.getString("nome")
    const price = interaction.options.getNumber("preco")
    const description = interaction.options.getString("descricao")
    const category = interaction.options.getString("categoria")
    const imageUrl = interaction.options.getString("imagem")
    const color = interaction.options.getString("cor")

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

      // Validate color if provided
      if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Erro")
              .setDescription("Cor inválida! Use o formato hex (#0099ff)")
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      // Build update query
      const updates = []
      const params = []

      if (name) {
        updates.push("name = ?")
        params.push(name)
      }
      if (price) {
        updates.push("price = ?")
        params.push(price)
      }
      if (description) {
        updates.push("description = ?")
        params.push(description)
      }
      if (category) {
        updates.push("category = ?")
        params.push(category)
      }
      if (imageUrl) {
        updates.push("image_url = ?")
        params.push(imageUrl)
      }
      if (color) {
        updates.push("embed_color = ?")
        params.push(color)
      }

      if (updates.length === 0) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("❌ Erro")
              .setDescription("Nenhum campo foi fornecido para edição")
              .setColor("#ff0000"),
          ],
          ephemeral: true,
        })
      }

      updates.push("updated_at = CURRENT_TIMESTAMP")
      params.push(productId)

      // Update product
      await bot.database.run(`UPDATE products SET ${updates.join(", ")} WHERE id = ?`, params)

      // Get updated product
      const updatedProduct = await bot.database.get("SELECT * FROM products WHERE id = ?", [productId])

      // Success embed
      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Produto Atualizado")
        .setDescription(`Produto **${updatedProduct.name}** foi atualizado com sucesso!`)
        .addFields(
          { name: "ID", value: updatedProduct.id.toString(), inline: true },
          { name: "Preço", value: `R$ ${updatedProduct.price.toFixed(2)}`, inline: true },
          { name: "Categoria", value: updatedProduct.category, inline: true },
        )
        .setColor(updatedProduct.embed_color)
        .setTimestamp()

      if (updatedProduct.image_url) {
        successEmbed.setThumbnail(updatedProduct.image_url)
      }

      await interaction.reply({ embeds: [successEmbed] })

      // Log action
      bot.logger.info(`Product updated: ${updatedProduct.name} (ID: ${productId}) by ${interaction.user.tag}`)
    } catch (error) {
      bot.logger.error("Error editing product:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao editar o produto")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },

  async deleteProduct(interaction, bot) {
    const productId = interaction.options.getInteger("id")

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

      // Create confirmation buttons
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_delete_product_${productId}`)
          .setLabel("Confirmar")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("✅"),
        new ButtonBuilder()
          .setCustomId(`cancel_delete_product_${productId}`)
          .setLabel("Cancelar")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("❌"),
      )

      const confirmEmbed = new EmbedBuilder()
        .setTitle("⚠️ Confirmar Exclusão")
        .setDescription(
          `Tem certeza que deseja deletar o produto **${product.name}**?\n\n` +
            `Esta ação não pode ser desfeita e todos os dados do produto serão perdidos.`,
        )
        .setColor("#ff9900")
        .setTimestamp()

      await interaction.reply({
        embeds: [confirmEmbed],
        components: [row],
        ephemeral: true,
      })
    } catch (error) {
      bot.logger.error("Error deleting product:", error)
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
  },

  async listProducts(interaction, bot) {
    const category = interaction.options.getString("categoria")

    try {
      await interaction.deferReply()

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
              .setTitle("📦 Nenhum produto encontrado")
              .setDescription(
                category ? `Nenhum produto encontrado na categoria **${category}**` : "Nenhum produto cadastrado",
              )
              .setColor("#ff9900"),
          ],
        })
      }

      // Create embed with product list
      const embed = new EmbedBuilder()
        .setTitle("📦 Lista de Produtos")
        .setDescription(category ? `Produtos da categoria **${category}**` : "Todos os produtos disponíveis")
        .setColor("#0099ff")
        .setTimestamp()

      // Add products to embed (max 25 fields)
      const maxProducts = Math.min(products.length, 25)
      for (let i = 0; i < maxProducts; i++) {
        const product = products[i]
        const stockCount = await bot.database.get(
          "SELECT COUNT(*) as count FROM product_stock WHERE product_id = ? AND used = 0",
          [product.id],
        )

        embed.addFields({
          name: `${product.name} (ID: ${product.id})`,
          value: `💰 R$ ${product.price.toFixed(2)} | 📦 Estoque: ${stockCount?.count || 0} | 🏷️ ${product.category}`,
          inline: false,
        })
      }

      if (products.length > 25) {
        embed.setFooter({ text: `Mostrando 25 de ${products.length} produtos` })
      }

      await interaction.editReply({ embeds: [embed] })
    } catch (error) {
      bot.logger.error("Error listing products:", error)
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao listar os produtos")
            .setColor("#ff0000"),
        ],
      })
    }
  },

  async productInfo(interaction, bot) {
    const productId = interaction.options.getInteger("id")

    try {
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

      // Get stock count
      const stockCount = await bot.database.get(
        "SELECT COUNT(*) as count FROM product_stock WHERE product_id = ? AND used = 0",
        [product.id],
      )

      // Get sales count
      const salesCount = await bot.database.get(
        "SELECT COUNT(*) as count FROM orders WHERE product_id = ? AND status = 'completed'",
        [product.id],
      )

      // Create detailed embed
      const embed = new EmbedBuilder()
        .setTitle(product.name)
        .setDescription(product.description)
        .addFields(
          { name: "💰 Preço", value: `R$ ${product.price.toFixed(2)}`, inline: true },
          { name: "📦 Estoque", value: `${stockCount?.count || 0} disponível`, inline: true },
          { name: "🏷️ Categoria", value: product.category, inline: true },
          { name: "🛒 Vendas", value: `${salesCount?.count || 0} vendidos`, inline: true },
          {
            name: "📅 Criado em",
            value: `<t:${Math.floor(new Date(product.created_at).getTime() / 1000)}:F>`,
            inline: true,
          },
          { name: "🆔 ID", value: product.id.toString(), inline: true },
        )
        .setColor(product.embed_color)
        .setTimestamp()

      if (product.image_url) {
        embed.setImage(product.image_url)
      }

      // Add creator info
      const creator = await interaction.guild.members.fetch(product.created_by).catch(() => null)
      if (creator) {
        embed.setFooter({ text: `Criado por ${creator.user.tag}`, iconURL: creator.user.displayAvatarURL() })
      }

      await interaction.reply({ embeds: [embed] })
    } catch (error) {
      bot.logger.error("Error getting product info:", error)
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Erro")
            .setDescription("Ocorreu um erro ao buscar informações do produto")
            .setColor("#ff0000"),
        ],
        ephemeral: true,
      })
    }
  },
}
