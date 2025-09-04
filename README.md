# 🤖 Discord Bot Avançado

Bot de Discord completo e funcional com sistema de moderação, tickets, vendas com dinheiro real e muito mais!

## ✨ Funcionalidades

### 🛡️ Sistema de Moderação
- Comandos de ban, kick, mute, warn
- Auto-moderação com filtros personalizáveis
- Sistema de punições temporárias
- Logs detalhados de moderação
- Sistema de appeals

### 🎫 Sistema de Tickets
- Tickets personalizáveis por categoria
- Embeds customizáveis
- Sistema de transcrições
- Avaliações de atendimento
- Notificações automáticas

### 💰 Sistema de Vendas
- Produtos totalmente personalizáveis
- Controle de estoque automático
- **Gateways de pagamento configuráveis por servidor**
- PIX automático via Mercado Pago
- Integração com Abacate Pay
- Relatórios de vendas detalhados

### 🔧 Personalização Total
- Embeds customizáveis
- Status personalizado: "Assistindo: Criado por v1trixzthegod"
- Comandos personalizados
- Dashboard web completo
- **Sistema de configuração por servidor**

## 🚀 Instalação Rápida

### Método 1: Script Automático
\`\`\`bash
node install-bot
\`\`\`

### Método 2: Manual
\`\`\`bash
npm install
npm run install-bot
\`\`\`

## 📋 Configuração

1. **Configure o arquivo `.env`:**
\`\`\`env
DISCORD_TOKEN=seu_token_aqui
CLIENT_ID=seu_client_id_aqui
BOT_STATUS=Assistindo: Criado por v1trixzthegod
BOT_ACTIVITY_TYPE=Watching
BOT_STATUS_TYPE=Idle
WEB_PORT=3000
\`\`\`

2. **Configure gateways de pagamento por servidor:**
\`\`\`
/configurar-pagamento mercadopago token:SEU_TOKEN
/configurar-pagamento abacatepay key:SUA_CHAVE
\`\`\`

## 🎯 Comandos Principais

### Administração
- `/configurar-pagamento` - Configurar gateways por servidor
- `/config` - Configurações gerais do bot
- `/dashboard` - Link para dashboard web

### Moderação
- `/ban` - Banir usuário com duração
- `/kick` - Expulsar usuário
- `/mute` - Silenciar temporariamente
- `/warn` - Advertir usuário
- `/clear` - Limpar mensagens

### Tickets
- `/setup-tickets` - Configurar sistema de tickets
- `/ticket` - Gerenciar tickets

### Vendas
- `/produto` - Gerenciar produtos
- `/estoque` - Gerenciar estoque
- `/loja` - Exibir catálogo
- `/vendas` - Relatórios de vendas

## 🌐 Dashboard Web

Acesse `http://localhost:3000` para:
- Gerenciar produtos e vendas
- Ver estatísticas em tempo real
- Configurar embeds e mensagens
- Monitorar atividades do bot

## 💳 Gateways Suportados

- **Mercado Pago** (PIX, Cartão)
- **Abacate Pay**
- **Sistema modular** para novos gateways

## 🔧 Recursos Avançados

- **Multi-servidor**: Cada servidor tem suas configurações
- **Banco de dados**: SQLite integrado
- **Webhooks**: Confirmação automática de pagamentos
- **Logs**: Sistema completo de auditoria
- **API REST**: Integração com sistemas externos

## 📞 Suporte

Criado por **v1trixzthegod**

Para suporte, consulte:
- `COMMANDS.md` - Lista completa de comandos
- `PAYMENT_SETUP.md` - Guia de configuração de pagamentos

---

⭐ **Bot Avançado de Discord - Tudo que você precisa em um só lugar!**
