# 💳 Configuração de Gateways de Pagamento

## 🔧 Mercado Pago

### 1. Criar Conta no Mercado Pago
1. Acesse [mercadopago.com.br](https://mercadopago.com.br)
2. Crie sua conta de vendedor
3. Complete a verificação da conta

### 2. Obter Credenciais
1. Acesse o [Painel do Desenvolvedor](https://www.mercadopago.com.br/developers)
2. Vá em "Suas integrações" > "Criar aplicação"
3. Escolha "Pagamentos online e presenciais"
4. Anote o **Access Token** de produção

### 3. Configurar Webhook
1. No painel, vá em "Webhooks"
2. Adicione a URL: `https://seudominio.com/webhook/mercadopago`
3. Selecione os eventos: `payment`
4. Anote o **Webhook Secret**

### 4. Variáveis de Ambiente
\`\`\`env
MERCADO_PAGO_ACCESS_TOKEN=seu_access_token_aqui
MERCADO_PAGO_WEBHOOK_SECRET=seu_webhook_secret_aqui
WEBHOOK_URL=https://seudominio.com
\`\`\`

## 🥑 Abacate Pay

### 1. Criar Conta
1. Acesse [abacatepay.com](https://abacatepay.com)
2. Registre-se como vendedor
3. Complete a verificação

### 2. Obter API Key
1. Acesse o painel administrativo
2. Vá em "Configurações" > "API"
3. Gere uma nova API Key
4. Anote a chave gerada

### 3. Configurar Webhook
1. No painel, configure o webhook
2. URL: `https://seudominio.com/webhook/abacatepay`
3. Eventos: `payment.approved`, `payment.cancelled`

### 4. Variáveis de Ambiente
\`\`\`env
ABACATE_PAY_API_KEY=sua_api_key_aqui
\`\`\`

## 🌐 Configuração do Servidor

### 1. Domínio e SSL
- Configure um domínio para seu bot
- Instale certificado SSL (Let's Encrypt recomendado)
- Configure proxy reverso (Nginx/Apache)

### 2. Exemplo Nginx
\`\`\`nginx
server {
    listen 80;
    server_name seudominio.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
\`\`\`

## 🔒 Segurança

### Validação de Webhooks
O bot automaticamente valida os webhooks usando as chaves secretas configuradas.

### Logs de Transações
Todas as transações são logadas no banco de dados para auditoria.

### Ambiente de Teste
Use as credenciais de sandbox para testes antes de ir para produção.

## 📞 Suporte

Para problemas com gateways de pagamento:
- **Mercado Pago:** [Suporte Mercado Pago](https://www.mercadopago.com.br/ajuda)
- **Abacate Pay:** [Suporte Abacate Pay](https://abacatepay.com/suporte)
