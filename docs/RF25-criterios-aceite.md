# RF25: Passageiro Não Embarcou

## Objetivo Geral

Permitir que o motorista registre, durante a operação da rota, quais passageiros confirmados não apareceram no ponto de embarque/desembarque, gerando um log permanente com timestamp e geolocalização para uso como evidência operacional.

---

## Regras de Validação Globais

- Apenas DRIVER (dono ou atrelado) pode registrar no-show
- Passageiro deve estar confirmado no segmento correspondente
- O evento é salvo como ocorrência do tipo `passenger_no_show` com `passenger_id`

### Passageiros elegíveis por segmento

| Segmento | Status elegível |
|----------|----------------|
| Ida | `vai e volta` ou `só vou e não volto` |
| Volta | `vai e volta` ou `não vou mas volto` |
| Inelegível | `não vai e nem volta` (já marcou ausência) |

---

## Cenários de Sucesso

### Cenário 25.1: Motorista vê confirmados no ponto atual por segmento
**Dado** uma linha em operação com passageiros confirmados
**Quando** o motorista está em um ponto de embarque/desembarque
**Então** vê a lista de passageiros esperados naquele ponto e segmento

### Cenário 25.2: Motorista marca passageiro como não embarcou
**Dado** um passageiro confirmado no segmento de ida ou volta
**Quando** o motorista registra que ele não apareceu
**Então** o evento é salvo com timestamp, GPS e referência ao passageiro

### Cenário 25.3: Log permanente para justificativa futura
**Dado** um no-show registrado
**Quando** consultado posteriormente
**Então** contém hora exata, geolocalização do ponto e nome do passageiro

### Cenário 25.4: Bloqueio de passageiro inelegível
**Dado** um passageiro com status `não vai e nem volta`
**Quando** o motorista tenta marcá-lo como no-show
**Então** o sistema bloqueia com erro de validação

### Cenário 25.5: Passageiro confirmado na volta pode ser marcado no retorno
**Dado** um passageiro com status `não vou mas volto` (confirmado só na volta)
**Quando** o motorista registra no-show durante o segmento de volta
**Então** o evento é salvo normalmente

### Cenário 25.6: Motorista consulta histórico de no-shows da linha
**Dado** no-shows registrados em uma data
**Quando** o motorista consulta via endpoint de ocorrências
**Então** vê todos os `passenger_no_show` com passageiros identificados

---

## Cenários de Erro

### Cenário 25.7: Passageiro tenta registrar
**Dado** usuário com role PASSENGER
**Quando** tenta registrar no-show
**Então** retorna 403

### Cenário 25.8: passengerId inválido/ausente para no-show
**Dado** registro de `passenger_no_show` sem passengerId
**Quando** submetido
**Então** retorna 400

---

## Notas Técnicas

- Reutiliza `occurrences` com `type = passenger_no_show` e `passenger_id` obrigatório
- Novo endpoint: `POST /api/v1/lines/:lineId/no-show` com `{ passengerId, segment, latitude?, longitude? }`
- Backend valida o status de presença do passageiro no dia antes de aceitar
- Mobile: lista de passageiros confirmados por segmento exibida em `operation.tsx` com botão "Não embarcou" por passageiro
