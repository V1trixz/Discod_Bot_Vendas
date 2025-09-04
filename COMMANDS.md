# 📋 Lista Completa de Comandos

## 🛡️ Comandos de Moderação

### `/ban`
Banir um usuário do servidor
- **Parâmetros:**
  - `usuário` - Usuário a ser banido
  - `razão` - Motivo do banimento (opcional)
  - `duração` - Duração em dias (opcional)
- **Permissão:** Ban Members

### `/kick`
Expulsar um usuário do servidor
- **Parâmetros:**
  - `usuário` - Usuário a ser expulso
  - `razão` - Motivo da expulsão (opcional)
- **Permissão:** Kick Members

### `/mute`
Silenciar um usuário temporariamente
- **Parâmetros:**
  - `usuário` - Usuário a ser silenciado
  - `duração` - Duração em minutos
  - `razão` - Motivo do silenciamento (opcional)
- **Permissão:** Moderate Members

### `/warn`
Advertir um usuário
- **Parâmetros:**
  - `usuário` - Usuário a ser advertido
  - `razão` - Motivo da advertência
- **Permissão:** Moderate Members

### `/clear`
Limpar mensagens do canal
- **Parâmetros:**
  - `quantidade` - Número de mensagens (1-100)
  - `usuário` - Filtrar por usuário (opcional)
  - `tipo` - Tipo de mensagem (opcional)
- **Permissão:** Manage Messages

## 🛒 Comandos de Vendas

### `/produto`
Gerenciar produtos da loja

#### `/produto criar`
- **Parâmetros:**
  - `nome` - Nome do produto
  - `descrição` - Descrição do produto
  - `preço` - Preço em reais
  - `categoria` - Categoria do produto (opcional)
  - `imagem` - URL da imagem (opcional)
  - `cor` - Cor do embed (opcional)

#### `/produto info`
- **Parâmetros:**
  - `id` - ID do produto

#### `/produto editar`
- **Parâmetros:**
  - `id` - ID do produto
  - Campos a serem editados

#### `/produto deletar`
- **Parâmetros:**
  - `id` - ID do produto

### `/estoque`
Gerenciar estoque dos produtos

#### `/estoque adicionar`
- **Parâmetros:**
  - `produto_id` - ID do produto
  - `conteúdo` - Conteúdo do item

#### `/estoque listar`
- **Parâmetros:**
  - `produto_id` - ID do produto

#### `/estoque arquivo`
- **Parâmetros:**
  - `produto_id` - ID do produto
  - `arquivo` - Arquivo .txt com itens

### `/loja`
Exibir catálogo de produtos

### `/comprar`
Comprar um produto
- **Parâmetros:**
  - `produto_id` - ID do produto
  - `quantidade` - Quantidade (opcional, padrão: 1)

### `/vendas`
Ver relatório de vendas (Admin)

## 🎫 Comandos de Tickets

### `/setup-tickets`
Configurar sistema de tickets
- **Parâmetros:**
  - `canal` - Canal para o painel
  - `categoria` - Categoria para criar tickets
  - `cargo_suporte` - Cargo de suporte (opcional)

### `/ticket`
Gerenciar tickets

#### `/ticket fechar`
Fechar ticket atual

#### `/ticket adicionar`
- **Parâmetros:**
  - `usuário` - Usuário a adicionar

#### `/ticket remover`
- **Parâmetros:**
  - `usuário` - Usuário a remover

#### `/ticket transcrição`
Gerar transcrição do ticket

### `/ticket-stats`
Ver estatísticas de tickets

## ⚙️ Comandos de Configuração

### `/config`
Configurar o bot (Admin)

#### `/config canal-mod`
- **Parâmetros:**
  - `canal` - Canal para logs de moderação

#### `/config canal-vendas`
- **Parâmetros:**
  - `canal` - Canal para notificações de vendas

#### `/config categoria-tickets`
- **Parâmetros:**
  - `categoria` - Categoria para tickets

#### `/config cargo-suporte`
- **Parâmetros:**
  - `cargo` - Cargo de suporte

#### `/config gateway-pagamento`
- **Parâmetros:**
  - `gateway` - Gateway padrão (mercadopago/abacatepay)

#### `/config cor-embed`
- **Parâmetros:**
  - `cor` - Cor em hexadecimal

#### `/config listar`
Listar todas as configurações

### `/dashboard`
Acessar dashboard web (Admin)

## 📊 Comandos de Informação

### `/modlogs`
Ver logs de moderação de um usuário
- **Parâmetros:**
  - `usuário` - Usuário para consultar

## 🔧 Permissões Necessárias

- **Administrator:** Acesso total a todos os comandos
- **Manage Server:** Comandos de configuração
- **Ban Members:** Comandos de ban/unban
- **Kick Members:** Comando de kick
- **Moderate Members:** Comandos de mute/warn
- **Manage Messages:** Comando de clear
- **Manage Channels:** Setup de tickets
