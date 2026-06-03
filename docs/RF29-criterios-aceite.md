# RF29: Enquetes no Chat da Linha + Refatoração do Chat

## Objetivo Geral

Permitir que o motorista crie enquetes rápidas no chat do grupo da linha (RF29), e corrigir o acesso ao chat para que seja automático e baseado em contexto — sem digitação manual de IDs.

---

## Regra Central: Membro = Matriculado na Linha

- Passageiro aceita convite → entra no grupo automaticamente
- Motorista dono/atrelado → sempre membro
- Passageiro removido da linha → perde acesso ao grupo
- Membership verificada via `line_enrollments`, não por tabela separada de membros

---

## Chat do Grupo (comportamento corrigido)

### Cenário G1: Passageiro entra na linha e já está no grupo
**Dado** um passageiro que aceitou o convite de uma linha
**Quando** acessa o chat do grupo da linha
**Então** o sistema concede acesso sem ação adicional

### Cenário G2: Acesso negado a não-membros
**Dado** um usuário não matriculado na linha
**Quando** tenta acessar o chat do grupo
**Então** o sistema retorna 403

---

## RF29 — Enquetes

### Cenário P1: Motorista cria enquete
**Dado** um motorista dono ou atrelado em uma linha
**Quando** cria uma enquete com pergunta e 2-4 opções
**Então** a enquete aparece como mensagem especial no chat do grupo

### Cenário P2: Passageiro vota
**Dado** uma enquete aberta no chat do grupo
**Quando** um passageiro seleciona uma opção
**Então** o voto é registrado e o resultado é atualizado em tempo real

### Cenário P3: Cada membro vota apenas uma vez
**Dado** um membro que já votou
**Quando** tenta votar novamente
**Então** o sistema troca o voto (ou bloqueia — decisão: troca)

### Cenário P4: Apenas motorista cria enquete
**Dado** um passageiro no grupo
**Quando** tenta criar enquete
**Então** o sistema retorna 403

---

## UX — Acesso ao Chat sem Digitação de ID

### Driver chat index
- Lista as linhas do motorista com botão "Chat do grupo"
- Lista conversas privadas ativas
- Sem campo de texto para ID

### Passenger chat index
- Lista as linhas matriculadas com "Chat do grupo" + "Falar com motorista"
- Sem campo de texto para ID

### Contextos com botão de chat
- Detalhes da linha (driver): "Chat do grupo"
- Dashboard do passageiro: "Chat do grupo" + "Motorista"

---

## Notas Técnicas

- Membership do grupo = `line_enrollments` + motorista(s) — sem tabela adicional
- Polls armazenados como mensagem com `type: 'poll'` e `pollData: { question, options, votes }`
- Endpoints novos:
  - `POST /api/v1/chat/groups/:lineId/polls` — criar enquete (DRIVER)
  - `POST /api/v1/chat/groups/:lineId/polls/:pollId/vote` — votar (qualquer membro)
- `chat-group.tsx` recebe `lineId` como `useLocalSearchParams`, sem input manual
- Invite flow (`inviteService.acceptInvite`): não precisa mudar pois membership = `line_enrollments`
