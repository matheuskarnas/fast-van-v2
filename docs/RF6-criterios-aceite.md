# RF6: Exceção de Horário + Fila de Espera

## Objetivo Geral

Permitir que um passageiro solicite um slot de horário diferente do seu habitual para um dia específico. Se houver vaga, é confirmado imediatamente. Se não houver, entra na fila de espera e é promovido automaticamente quando uma vaga abre.

---

## Caso de Uso Principal

Ana está cadastrada no slot 07:10 → 12:35, mas hoje precisa ir às 08:00 → 10:55.

---

## Prioridade de Vaga

- Passageiros com `departure_time = '08:00'` têm **prioridade absoluta** no slot
- Solicitantes via RF6 só entram se houver vaga após os fixos confirmados
- Na fila de espera, ordem é FIFO (quem pediu primeiro)

---

## Cenários de Sucesso

### Cenário 6.1: Slot alternativo com vaga disponível
**Dado** Ana cadastrada no slot 07:10, solicitando 08:00
**E** o slot 08:00 tem vagas livres
**Quando** Ana solicita troca
**Então** `presence_records` é atualizado com `alternate_departure_time='08:00'`, `slot_status='switched'`
**E** Ana aparece na lotação do slot 08:00 nesse dia

### Cenário 6.2: Slot alternativo lotado → entra na fila
**Dado** slot 08:00 está cheio
**Quando** Ana solicita troca
**Então** é inserida em `slot_waitlist` com `slot_status='waitlist'`
**E** recebe mensagem informando que está na fila

### Cenário 6.3: Promoção automática da fila
**Dado** Ana está na fila do slot 08:00
**Quando** um passageiro fixo do slot 08:00 marca `não vai`
**Então** Ana é promovida automaticamente: `slot_status='switched'`, removida da fila

### Cenário 6.4: Passageiro pode cancelar a troca solicitada
**Dado** Ana com troca ativa (`switched`) ou na fila (`waitlist`)
**Quando** cancela a solicitação
**Então** volta para seu slot original (`slot_status='confirmed'`, alternate times removidos)

### Cenário 6.5: Passageiro consulta status da troca
**Dado** uma solicitação em qualquer estado
**Quando** consulta suas linhas no dia
**Então** vê `slotStatus` e horários alternativos no response

---

## Cenários de Erro

### Cenário 6.6: Solicitar o próprio slot habitual
**Quando** passageiro solicita troca para o mesmo horário cadastrado
**Então** retorna erro de validação

### Cenário 6.7: Passageiro não matriculado
**Quando** não está em `line_enrollments`
**Então** retorna 403

### Cenário 6.8: Data inválida
**Quando** data não está no formato YYYY-MM-DD
**Então** retorna 400

---

## Notas Técnicas

- Novo endpoint: `POST /api/v1/presence/lines/:lineId/me/slot-request`
  com `{ date, requestedDepartureTime, requestedArrivalTime }`
- Endpoint de cancelamento: `DELETE /api/v1/presence/lines/:lineId/me/slot-request?date=`
- Promoção automática chamada dentro de `markPassengerPresence` quando status muda para ausência na ida
- Contagem de vagas usa `occupancyService.getSlotOccupancy` por slot
- Mobile: botão "Trocar horário hoje" na tela de linhas do passageiro, com seletor de slots disponíveis
