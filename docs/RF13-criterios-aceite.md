# RF13: Chat Integrado entre Aluno e Motorista

## Objetivo Geral

Permitir comunicação em tempo real entre passageiros e motoristas por chat privado e chat em grupo da linha, centralizando negociação e alinhamentos operacionais dentro do app.

---

## Objetivo

Viabilizar conversas privadas para negociação de entrada em linhas (marketplace) e conversas em grupo para membros da linha, com histórico de mensagens e status de visualização.

---

## Regras de Validação Globais

### Chat privado (1-to-1)

- Passageiro pode iniciar chat privado com motorista mesmo sem vínculo na mesma linha
- O chat privado suporta contexto de marketplace para negociação de valor e pontos de embarque/desembarque
- Motorista pode responder e manter conversa privada com o passageiro
- Ambos os usuários devem estar autenticados

### Chat em grupo da linha

- O chat em grupo é restrito aos usuários vinculados à linha
- Participam do grupo: motorista dono, motorista atrelado (quando existir) e passageiros vinculados
- Usuário removido da linha perde acesso ao chat em grupo dessa linha

### Entrega e histórico

- Mensagens devem ser enviadas e recebidas em tempo real
- O histórico deve permanecer ordenado por data/hora
- Cada mensagem deve ter status mínimo: `enviada`, `entregue`, `visualizada`
- Mensagens vazias devem ser bloqueadas

### Autorização

- Usuário não autenticado não pode acessar chats
- Usuário sem permissão no contexto do grupo não pode ler ou enviar mensagens naquele grupo

---

## Cenários de Sucesso

### Cenário 13.1: Passageiro inicia chat privado com motorista no marketplace

**Dado** um passageiro autenticado visualizando uma linha no marketplace
**Quando** ele abre chat privado com o motorista responsável
**Então** a conversa privada é criada com sucesso

### Cenário 13.2: Motorista e passageiro negociam por chat privado

**Dado** um chat privado existente entre passageiro e motorista
**Quando** ambos trocam mensagens sobre valor e pontos
**Então** as mensagens são entregues em tempo real

### Cenário 13.3: Motorista inicia ou responde chat privado

**Dado** um passageiro interessado em uma linha
**Quando** o motorista envia mensagem privada
**Então** a conversa privada fica disponível para ambos

### Cenário 13.4: Membro da linha acessa chat em grupo

**Dado** um usuário vinculado à linha
**Quando** ele acessa o chat em grupo da linha
**Então** o sistema permite leitura e envio de mensagens

### Cenário 13.5: Mensagem no grupo é entregue para membros ativos

**Dado** um chat em grupo da linha
**Quando** um membro envia mensagem
**Então** os demais membros ativos recebem a mensagem em tempo real

### Cenário 13.6: Registrar visualização de mensagem privada

**Dado** uma mensagem privada entregue
**Quando** o destinatário abre a conversa
**Então** o status da mensagem muda para `visualizada`

### Cenário 13.7: Registrar visualização de mensagem no grupo

**Dado** mensagens entregues no grupo da linha
**Quando** um membro abre o chat
**Então** o sistema registra visualização para esse membro

### Cenário 13.8: Histórico ordenado cronologicamente

**Dado** uma conversa com múltiplas mensagens
**Quando** o histórico é consultado
**Então** as mensagens são retornadas em ordem cronológica

### Cenário 13.9: Usuário adicionado à linha ganha acesso ao grupo

**Dado** um passageiro recém-adicionado à linha
**Quando** ele acessa o chat em grupo da linha
**Então** o sistema permite participação no grupo

---

## Cenários de Erro

### Cenário 13.10: Usuário não autenticado tenta acessar chat

**Dado** um usuário sem autenticação válida
**Quando** ele tenta abrir chat privado ou grupo
**Então** o sistema bloqueia a operação
**E** exibe erro de autenticação

### Cenário 13.11: Usuário sem vínculo tenta acessar grupo da linha

**Dado** um usuário não vinculado à linha
**Quando** ele tenta acessar o chat em grupo
**Então** o sistema bloqueia a operação
**E** exibe erro de autorização

### Cenário 13.12: Usuário removido da linha tenta enviar no grupo

**Dado** um usuário removido da linha
**Quando** ele tenta enviar mensagem no chat em grupo dessa linha
**Então** o sistema bloqueia a operação
**E** exibe erro de autorização

### Cenário 13.13: Envio de mensagem vazia

**Dado** um usuário autenticado em conversa válida
**Quando** ele tenta enviar mensagem vazia
**Então** o sistema bloqueia a operação
**E** exibe erro de validação

### Cenário 13.14: Conversa inexistente

**Dado** um identificador de conversa inválido
**Quando** o usuário tenta enviar ou ler mensagens
**Então** o sistema bloqueia a operação
**E** exibe erro de conversa não encontrada

### Cenário 13.15: Falha de entrega em tempo real

**Dado** uma mensagem enviada em conversa válida
**Quando** ocorre falha momentânea de entrega
**Então** a mensagem permanece com status pendente de entrega
**E** o sistema tenta reentrega automática

---

## Notas Técnicas

- O chat privado deve ser permitido no contexto de marketplace, sem exigir vínculo prévio na mesma linha
- O chat em grupo deve validar vínculo ativo com a linha no momento de leitura/envio
- Recomenda-se usar infraestrutura realtime para entrega e atualização de status de mensagens
- O histórico deve preservar ordenação e consistência mesmo com reconexões
- Implementar controle de permissões separado para chat privado e chat em grupo
- Futuramente, anexos e notificações push podem ser adicionados sem quebrar o fluxo base
