const MercadoPagoGateway = require("./MercadoPago")
const AbacatePayGateway = require("./AbacatePay")
const Database = require("../database/Database")
const { EmbedBuilder } = require("discord.js")

class PaymentManager {
  constructor(client) {
    this.client = client
    this.db = new Database()
  }

  async getGatewayInstance(guildId, gatewayType) {
    const MercadoPagoGateway = require("./MercadoPago")
    const AbacatePayGateway = require("./AbacatePay")

    if (gatewayType === "mercadopago") {
      const token = await this.db.getConfig(guildId, "mercadopago_token")
      const webhookSecret = await this.db.getConfig(guildId, "mercadopago_webhook_secret")

      if (!token) {
        throw new Error("Mercado Pago não configurado para este servidor")
      }

      return new MercadoPagoGateway(token, webhookSecret)
    } else if (gatewayType === "abacatepay") {
      const apiKey = await this.db.getConfig(guildId, "abacatepay_token")

      if (!apiKey) {
        throw new Error("Abacate Pay não configurado para este servidor")
      }

      return new AbacatePayGateway(apiKey)
    }

    throw new Error("Gateway não suportado")
  }

  async processPayment(orderId, guildId, gateway = null, paymentMethod = "pix", cardData = null) {
    try {
      const order = await this.db.getOrder(orderId)
      if (!order) {
        throw new Error("Pedido não encontrado")
      }

      // Get default gateway if not specified
      if (!gateway) {
        gateway = (await this.db.getConfig(guildId, "payment_gateway_default")) || "mercadopago"
      }

      // Get webhook URL for this guild
      const webhookUrl = await this.db.getConfig(guildId, "webhook_url")
      if (!webhookUrl) {
        throw new Error("URL de webhook não configurada para este servidor")
      }

      const orderData = {
        orderId: order.id,
        amount: order.total_amount,
        description: `Pedido #${order.id} - ${order.product_name}`,
        email: order.user_email || "cliente@exemplo.com",
        name: order.user_name || "Cliente",
        cpf: order.user_cpf || "00000000000",
        webhookUrl: webhookUrl,
      }

      // Get gateway instance with guild-specific config
      const gatewayInstance = await this.getGatewayInstance(guildId, gateway)
      let paymentResult

      if (paymentMethod === "pix") {
        paymentResult = await gatewayInstance.createPixPayment(orderData)
      } else if (paymentMethod === "card") {
        paymentResult = await gatewayInstance.createCardPayment(orderData, cardData)
      }

      if (paymentResult.success) {
        // Atualizar pedido com informações de pagamento
        await this.db.updateOrder(orderId, {
          payment_id: paymentResult.paymentId,
          payment_gateway: gateway,
          payment_method: paymentMethod,
          payment_status: "pending",
          qr_code: paymentResult.qrCode,
          pix_copy_paste: paymentResult.pixCopyPaste,
        })

        // Criar embed de pagamento
        const paymentEmbed = await this.createPaymentEmbed(order, paymentResult, paymentMethod)

        return {
          success: true,
          embed: paymentEmbed,
          paymentData: paymentResult,
        }
      } else {
        throw new Error(paymentResult.error)
      }
    } catch (error) {
      console.error("Erro ao processar pagamento:", error)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async testGatewayConnection(guildId, gatewayType) {
    try {
      const gatewayInstance = await this.getGatewayInstance(guildId, gatewayType)

      // Test connection by making a simple API call
      const testResult = await gatewayInstance.testConnection()

      return {
        success: true,
        details: testResult.details || "Conexão validada com sucesso",
      }
    } catch (error) {
      return {
        success: false,
        error: error.message,
      }
    }
  }

  async createPaymentEmbed(order, paymentData, paymentMethod) {
    const embed = new EmbedBuilder()
      .setTitle("💳 Pagamento Gerado")
      .setColor("#00ff00")
      .addFields(
        { name: "🛒 Produto", value: order.product_name, inline: true },
        { name: "💰 Valor", value: `R$ ${order.total_amount.toFixed(2)}`, inline: true },
        { name: "🆔 Pedido", value: `#${order.id}`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: "Sistema de Pagamentos" })

    if (paymentMethod === "pix") {
      embed.addFields(
        {
          name: "⏰ Expira em",
          value: "<t:" + Math.floor(new Date(paymentData.expirationDate).getTime() / 1000) + ":R>",
          inline: false,
        },
        { name: "📱 PIX Copia e Cola", value: `\`\`\`${paymentData.pixCopyPaste}\`\`\``, inline: false },
      )

      if (paymentData.qrCodeBase64) {
        embed.setImage(`data:image/png;base64,${paymentData.qrCodeBase64}`)
      }
    }

    return embed
  }

  async handleWebhook(gateway, data) {
    try {
      let paymentId, status, externalReference

      switch (gateway) {
        case "mercadopago":
          if (data.type === "payment") {
            const paymentInfo = await this.mercadoPago.getPaymentStatus(data.data.id)
            if (paymentInfo.success) {
              paymentId = data.data.id
              status = paymentInfo.status
              externalReference = paymentInfo.externalReference
            }
          }
          break

        case "abacatepay":
          paymentId = data.id
          status = data.status
          externalReference = data.external_id
          break
      }

      if (paymentId && externalReference) {
        await this.processPaymentConfirmation(externalReference, paymentId, status, gateway)
      }
    } catch (error) {
      console.error("Erro ao processar webhook:", error)
    }
  }

  async processPaymentConfirmation(orderId, paymentId, status, gateway) {
    try {
      const order = await this.db.getOrder(orderId)
      if (!order) return

      // Atualizar status do pagamento
      await this.db.updateOrder(orderId, {
        payment_status: status,
        updated_at: new Date(),
      })

      if (status === "approved" || status === "paid") {
        // Pagamento aprovado - entregar produto
        await this.deliverProduct(order)

        // Notificar usuário
        await this.notifyPaymentSuccess(order)

        // Log da venda
        console.log(`[VENDA APROVADA] Pedido #${orderId} - ${order.product_name} - R$ ${order.total_amount}`)
      } else if (status === "rejected" || status === "cancelled") {
        // Pagamento rejeitado - notificar usuário
        await this.notifyPaymentFailure(order)
      }
    } catch (error) {
      console.error("Erro ao processar confirmação de pagamento:", error)
    }
  }

  async deliverProduct(order) {
    try {
      // Buscar item do estoque
      const stockItem = await this.db.getAvailableStockItem(order.product_id)
      if (stockItem) {
        // Marcar item como vendido
        await this.db.updateStockItem(stockItem.id, {
          status: "sold",
          sold_to: order.user_id,
          sold_at: new Date(),
        })

        // Enviar produto por DM
        const user = await this.client.users.fetch(order.user_id)
        if (user) {
          const deliveryEmbed = new EmbedBuilder()
            .setTitle("🎉 Produto Entregue!")
            .setColor("#00ff00")
            .addFields(
              { name: "🛒 Produto", value: order.product_name, inline: true },
              { name: "💰 Valor Pago", value: `R$ ${order.total_amount.toFixed(2)}`, inline: true },
              { name: "🆔 Pedido", value: `#${order.id}`, inline: true },
              { name: "📦 Seu Produto", value: `\`\`\`${stockItem.content}\`\`\``, inline: false },
            )
            .setTimestamp()
            .setFooter({ text: "Obrigado pela compra!" })

          await user.send({ embeds: [deliveryEmbed] })
        }

        // Atualizar pedido como entregue
        await this.db.updateOrder(order.id, {
          status: "delivered",
          delivered_at: new Date(),
        })
      }
    } catch (error) {
      console.error("Erro ao entregar produto:", error)
    }
  }

  async notifyPaymentSuccess(order) {
    try {
      const user = await this.client.users.fetch(order.user_id)
      if (user) {
        const successEmbed = new EmbedBuilder()
          .setTitle("✅ Pagamento Aprovado!")
          .setColor("#00ff00")
          .setDescription("Seu pagamento foi aprovado e o produto será entregue em instantes.")
          .addFields(
            { name: "🛒 Produto", value: order.product_name, inline: true },
            { name: "💰 Valor", value: `R$ ${order.total_amount.toFixed(2)}`, inline: true },
            { name: "🆔 Pedido", value: `#${order.id}`, inline: true },
          )
          .setTimestamp()

        await user.send({ embeds: [successEmbed] })
      }
    } catch (error) {
      console.error("Erro ao notificar sucesso do pagamento:", error)
    }
  }

  async notifyPaymentFailure(order) {
    try {
      const user = await this.client.users.fetch(order.user_id)
      if (user) {
        const failureEmbed = new EmbedBuilder()
          .setTitle("❌ Pagamento Rejeitado")
          .setColor("#ff0000")
          .setDescription("Seu pagamento foi rejeitado. Tente novamente ou entre em contato com o suporte.")
          .addFields(
            { name: "🛒 Produto", value: order.product_name, inline: true },
            { name: "💰 Valor", value: `R$ ${order.total_amount.toFixed(2)}`, inline: true },
            { name: "🆔 Pedido", value: `#${order.id}`, inline: true },
          )
          .setTimestamp()

        await user.send({ embeds: [failureEmbed] })
      }
    } catch (error) {
      console.error("Erro ao notificar falha do pagamento:", error)
    }
  }
}

module.exports = PaymentManager
