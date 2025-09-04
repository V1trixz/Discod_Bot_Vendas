const axios = require("axios")
const crypto = require("crypto")

class MercadoPagoGateway {
  constructor(accessToken, webhookSecret = null) {
    this.accessToken = accessToken
    this.baseURL = "https://api.mercadopago.com"
    this.webhookSecret = webhookSecret
  }

  async createPixPayment(orderData) {
    try {
      const paymentData = {
        transaction_amount: orderData.amount,
        description: orderData.description,
        payment_method_id: "pix",
        payer: {
          email: orderData.email,
          first_name: orderData.name || "Cliente",
          identification: {
            type: "CPF",
            number: orderData.cpf || "00000000000",
          },
        },
        external_reference: orderData.orderId,
        notification_url: `${orderData.webhookUrl}/webhook/mercadopago`,
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutos
      }

      const response = await axios.post(`${this.baseURL}/v1/payments`, paymentData, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      return {
        success: true,
        paymentId: response.data.id,
        qrCode: response.data.point_of_interaction?.transaction_data?.qr_code,
        qrCodeBase64: response.data.point_of_interaction?.transaction_data?.qr_code_base64,
        pixCopyPaste: response.data.point_of_interaction?.transaction_data?.qr_code,
        expirationDate: response.data.date_of_expiration,
        status: response.data.status,
      }
    } catch (error) {
      console.error("Erro ao criar pagamento PIX:", error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.message || "Erro interno do servidor",
      }
    }
  }

  async createCardPayment(orderData, cardData) {
    try {
      const paymentData = {
        transaction_amount: orderData.amount,
        description: orderData.description,
        payment_method_id: cardData.payment_method_id,
        token: cardData.token,
        installments: cardData.installments || 1,
        payer: {
          email: orderData.email,
          identification: {
            type: "CPF",
            number: orderData.cpf || "00000000000",
          },
        },
        external_reference: orderData.orderId,
        notification_url: `${process.env.WEBHOOK_URL}/webhook/mercadopago`,
      }

      const response = await axios.post(`${this.baseURL}/v1/payments`, paymentData, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      return {
        success: true,
        paymentId: response.data.id,
        status: response.data.status,
        statusDetail: response.data.status_detail,
      }
    } catch (error) {
      console.error("Erro ao criar pagamento com cartão:", error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.message || "Erro interno do servidor",
      }
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      const response = await axios.get(`${this.baseURL}/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })

      return {
        success: true,
        status: response.data.status,
        statusDetail: response.data.status_detail,
        amount: response.data.transaction_amount,
        externalReference: response.data.external_reference,
      }
    } catch (error) {
      console.error("Erro ao consultar pagamento:", error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.message || "Erro interno do servidor",
      }
    }
  }

  async refundPayment(paymentId, amount = null) {
    try {
      const refundData = amount ? { amount } : {}

      const response = await axios.post(`${this.baseURL}/v1/payments/${paymentId}/refunds`, refundData, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      return {
        success: true,
        refundId: response.data.id,
        status: response.data.status,
        amount: response.data.amount,
      }
    } catch (error) {
      console.error("Erro ao processar reembolso:", error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.message || "Erro interno do servidor",
      }
    }
  }

  validateWebhook(body, signature) {
    const expectedSignature = crypto.createHmac("sha256", this.webhookSecret).update(JSON.stringify(body)).digest("hex")

    return signature === expectedSignature
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/v1/account/settings`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      })

      return {
        success: true,
        details: `Conta: ${response.data.site_id || "Configurada"}`,
      }
    } catch (error) {
      throw new Error(`Erro na conexão: ${error.response?.data?.message || error.message}`)
    }
  }
}

module.exports = MercadoPagoGateway
