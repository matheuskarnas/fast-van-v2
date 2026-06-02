# RF8: Registro de Ausência de Última Hora

## Objetivo Geral

Permitir que um passageiro que marcou ausência reverta sua presença de última hora, desde que ainda haja vaga no seu slot e o horário de embarque não tenha passado.

---

## Contexto

RF3 cobre o planejamento antecipado de presença. RF8 cobre o caso inverso: o passageiro já marcou que não vai, mas mudou de ideia e precisa embarcar. O sistema deve verificar se ainda há vaga no slot antes de confirmar a reversão.

---

## Regras de Validação Globais

### Autorização
- Apenas o próprio passageiro pode reverter sua ausência
- Passageiro deve estar matriculado na linha

### Janela de tempo
- Reversão permitida até o horário de embarque do slot do passageiro (`departure_time`)
- Após o horário de embarque, a reversão é bloqueada

### Verificação de vaga
- O sistema conta quantos passageiros com `departure_time` igual ao do passageiro estão confirmados na ida para aquela data
- Se `confirmados < capacidade` → reversão permitida
- Se `confirmados >= capacidade` → reversão bloqueada com mensagem de slot lotado

### Status resultante
- `não vai e nem volta` → `vai e volta`
- `não vou mas volto` → `vai e volta`
- `só vou e não volto` não se aplica a RF8 (já está confirmado na ida)
- `vai e volta` não se aplica (passageiro já está presente)

### Rota do dia
- Ao reverter ausência, o ponto de embarque do passageiro volta a aparecer na rota do dia

---

## Cenários de Sucesso

### Cenário 8.1: Reverter ausência total com vaga disponível

**Dado** um passageiro que marcou `não vai e nem volta` para hoje
**E** ainda há vaga no slot de ida do passageiro
**E** o horário de embarque ainda não passou
**Quando** ele marca que vai embarcar
**Então** o status é atualizado para `vai e volta`
**E** o ponto de embarque volta para a rota do dia

### Cenário 8.2: Reverter ausência de ida com vaga disponível

**Dado** um passageiro que marcou `não vou mas volto`
**E** ainda há vaga no slot de ida
**E** o horário de embarque não passou
**Quando** ele informa que vai embarcar
**Então** o status é atualizado para `vai e volta`

### Cenário 8.3: Bloqueio por slot lotado

**Dado** um passageiro que marcou ausência
**E** o slot de ida está com todas as vagas preenchidas por outros passageiros
**Quando** ele tenta reverter a ausência
**Então** o sistema bloqueia a operação
**E** exibe mensagem: `Não há vagas disponíveis no seu horário`

### Cenário 8.4: Bloqueio após horário de embarque

**Dado** um passageiro que marcou ausência
**E** o horário de embarque do seu slot já passou
**Quando** ele tenta reverter a ausência
**Então** o sistema bloqueia a operação
**E** exibe mensagem: `Prazo para alteração de presença encerrado`

### Cenário 8.5: Passageiro já confirmado não pode usar RF8

**Dado** um passageiro com status `vai e volta`
**Quando** tenta acionar o fluxo de reversão de ausência
**Então** o sistema informa que o passageiro já está confirmado
**E** não altera o status

---

## Cenários de Erro

### Cenário 8.6: Passageiro não matriculado

**Dado** um passageiro não vinculado à linha
**Quando** tenta reverter ausência
**Então** o sistema bloqueia com erro de autorização

### Cenário 8.7: Data inválida

**Dado** qualquer usuário autenticado
**Quando** envia uma data em formato inválido
**Então** o sistema retorna erro de data inválida

### Cenário 8.8: Usuário não autenticado

**Dado** um usuário sem token válido
**Quando** tenta reverter ausência
**Então** o sistema retorna erro de autenticação

---

## Notas Técnicas

- RF8 reutiliza o endpoint `PATCH /api/v1/presence/lines/:lineId/me/status` com status `vai e volta`
- A diferença para RF3 é a verificação de vaga por slot antes de aceitar a mudança
- A verificação conta passageiros com `COALESCE(pr.alternate_departure_time, e.departure_time) = slot` confirmados na ida
- O horário limite é o `departure_time` do slot do passageiro na data solicitada
- No mobile, o botão de reversão aparece apenas quando o status atual é de ausência (`não vai e nem volta` ou `não vou mas volto`)
- Ao confirmar, o passageiro vê feedback imediato do novo status ou da mensagem de bloqueio
