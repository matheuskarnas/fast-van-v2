# RF23: Registro de Ocorrências

## Objetivo Geral

Permitir que o motorista registre ocorrências durante a viagem (trânsito lento, passageiro atrasado, passageiro não apareceu), salvando data, hora, geolocalização e tipo, para uso como log operacional e justificativa futura.

---

## Tipos de Ocorrência

| Tipo | Código | Descrição |
|------|--------|-----------|
| Trânsito lento | `slow_traffic` | Congestionamento ou lentidão na rota |
| Passageiro atrasado | `passenger_late` | Passageiro confirmado está atrasado no ponto |
| Passageiro não apareceu | `passenger_no_show` | Passageiro confirmado não embarcou |
| Outros | `other` | Ocorrência geral com descrição livre |

---

## Regras de Validação Globais

- Apenas DRIVER (dono ou atrelado) pode registrar ocorrências
- Toda ocorrência salva: tipo, data, hora (timestamp completo), lat/lng (quando disponível), notes opcional
- Ocorrência de `passenger_no_show` deve referenciar um `passenger_id`
- Passageiros não têm acesso às ocorrências

---

## Cenários de Sucesso

### Cenário 23.1: Motorista registra trânsito lento
**Dado** um motorista autenticado durante a operação de uma linha
**Quando** registra ocorrência `slow_traffic` com localização atual
**Então** a ocorrência é salva com timestamp e lat/lng

### Cenário 23.2: Motorista registra passageiro atrasado
**Dado** um motorista em um ponto de embarque
**Quando** registra `passenger_late` referenciando um passageiro
**Então** a ocorrência é salva com hora, localização e passageiro

### Cenário 23.3: Motorista registra passageiro não apareceu (RF25)
**Dado** um motorista que chegou ao ponto mas o passageiro não embarcou
**Quando** registra `passenger_no_show` referenciando o passageiro
**Então** a ocorrência é salva como log permanente para justificativa futura

### Cenário 23.4: Motorista lista ocorrências de uma linha na data
**Dado** ocorrências registradas para uma linha
**Quando** o motorista consulta o log da linha
**Então** vê a lista ordenada por horário com tipo, nota e localização

### Cenário 23.5: Ocorrência sem GPS disponível
**Dado** GPS indisponível no momento
**Quando** motorista registra ocorrência
**Então** a ocorrência é salva sem coordenadas (lat/lng null)

---

## Cenários de Erro

### Cenário 23.6: Tipo de ocorrência inválido
**Quando** tipo enviado não está na lista permitida
**Então** retorna 400 com mensagem de validação

### Cenário 23.7: Passageiro não autorizado
**Dado** usuário com role PASSENGER
**Quando** tenta registrar ocorrência
**Então** retorna 403

---

## Notas Técnicas

- Tabela: `occurrences (id, line_id, driver_id, passenger_id?, type, notes, latitude, longitude, occurred_at)`
- `occurred_at` = timestamp com data+hora+segundo
- Endpoint: `POST /api/v1/lines/:lineId/occurrences`
- Endpoint: `GET /api/v1/lines/:lineId/occurrences?date=YYYY-MM-DD`
- Mobile: tela de ocorrências acessível durante operação da linha (`operation.tsx`)
- GPS obtido via `expo-location` no momento do registro
