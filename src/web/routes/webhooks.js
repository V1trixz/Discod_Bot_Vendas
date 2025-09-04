const express = require("express")
const router = express.Router()

module.exports = (paymentManager) => {
  // Webhook Mercado Pago
  router.post("/mercadopago", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const signature = req.headers["x-signature"]
      const body = JSON.parse(req.body)

      // Validar webhook (opcional)
      // if (!paymentManager.mercadoPago.validateWebhook(body, signature)) {
      //     return res.status(401).send('Unauthorized');
      // }

      await paymentManager.handleWebhook("mercadopago", body)
      res.status(200).send("OK")
    } catch (error) {
      console.error("Erro no webhook Mercado Pago:", error)
      res.status(500).send("Internal Server Error")
    }
  })

  // Webhook Abacate Pay
  router.post("/abacatepay", express.json(), async (req, res) => {
    try {
      await paymentManager.handleWebhook("abacatepay", req.body)
      res.status(200).send("OK")
    } catch (error) {
      console.error("Erro no webhook Abacate Pay:", error)
      res.status(500).send("Internal Server Error")
    }
  })

  return router
}
