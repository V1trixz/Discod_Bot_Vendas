const { EmbedBuilder } = require("discord.js")

class CustomEmbedBuilder {
  static success(title, description) {
    return new EmbedBuilder().setTitle(`✅ ${title}`).setDescription(description).setColor("#00ff00").setTimestamp()
  }

  static error(title, description) {
    return new EmbedBuilder().setTitle(`❌ ${title}`).setDescription(description).setColor("#ff0000").setTimestamp()
  }

  static info(title, description) {
    return new EmbedBuilder().setTitle(`ℹ️ ${title}`).setDescription(description).setColor("#0099ff").setTimestamp()
  }

  static warning(title, description) {
    return new EmbedBuilder().setTitle(`⚠️ ${title}`).setDescription(description).setColor("#ffaa00").setTimestamp()
  }

  static product(product) {
    const embed = new EmbedBuilder()
      .setTitle(product.name)
      .setDescription(product.description || "Sem descrição disponível")
      .setColor(product.embed_color || "#0099ff")
      .addFields(
        { name: "💰 Preço", value: `R$ ${product.price.toFixed(2)}`, inline: true },
        { name: "📦 Estoque", value: `${product.stock} disponível`, inline: true },
        { name: "🏷️ Categoria", value: product.category || "Geral", inline: true },
      )
      .setTimestamp()

    if (product.image_url) {
      embed.setImage(product.image_url)
    }

    return embed
  }
}

module.exports = CustomEmbedBuilder
