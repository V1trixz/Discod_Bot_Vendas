const axios = require("axios")

class AbacatePayGateway {
  constructor(apiKey) {
    this.apiKey = apiKey
    this.baseURL = "https://api.abacatepay.com/v1"
  }

  async createPixPayment(orderData) {
    try {
      const paymentData = {
        amount: orderData.amount,
        description: orderData.description,
        external_id: orderData.orderId,
        payer_name: orderData.name || "Cliente",
        payer_email: orderData.email,
        payer_cpf: orderData.cpf,
        expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        webhook_url: `${orderData.webhookUrl}/webhook/abacatepay`,
      }

      const response = await axios.post(`${this.baseURL}/pix/create`, paymentData, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      })

      return {
        success: true,
        paymentId: response.data.id,
        qrCode: response.data.qr_code,
        qrCodeBase64: response.data.qr_code_base64,
        pixCopyPaste: response.data.pix_copy_paste,
        expirationDate: response.data.expires_at,
        status: response.data.status,
      }
    } catch (error) {
      console.error("Erro ao criar pagamento PIX (Abacate Pay):", error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.message || "Erro interno do servidor",
      }
    }
  }

  async getPaymentStatus(paymentId) {
    try {
      const response = await axios.get(`${this.baseURL}/pix/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      return {
        success: true,
        status: response.data.status,
        amount: response.data.amount,
        externalReference: response.data.external_id,
      }
    } catch (error) {
      console.error("Erro ao consultar pagamento (Abacate Pay):", error.response?.data || error.message)
      return {
        success: false,
        error: error.response?.data?.message || "Erro interno do servidor",
      }
    }
  }

  async testConnection() {
    try {
      const response = await axios.get(`${this.baseURL}/account`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      })

      return {
        success: true,
        details: `Conta: ${response.data.name || "Configurada"}`,
      }
    } catch (error) {
      throw new Error(`Erro na conexão: ${error.response?.data?.message || error.message}`)
    }
  }
}

module.exports = AbacatePayGateway
