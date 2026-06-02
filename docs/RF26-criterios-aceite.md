# RF26: Dashboard do Passageiro

## Objetivo Geral

Oferecer ao passageiro uma visão consolidada de suas linhas ativas, próximas viagens confirmadas, histórico de presenças/ausências e situação de pagamentos.

---

## Regras de Validação Globais

### Autorização
- Apenas passageiros autenticados podem acessar o dashboard
- Cada passageiro vê apenas seus próprios dados

### Escopo temporal
- **Próximas viagens**: próximos 7 dias a partir de hoje (inclusive)
- **Histórico**: últimos 7 dias (não incluindo hoje)
- Dias sem registro de presença são exibidos com status padrão `vai e volta`

### Pagamentos
- Exibe apenas o resumo: pendente / em dia (dados vindos de RF24 quando implementado)
- Se RF24 não estiver implementado, exibe placeholder "em dia" como padrão

---

## Cenários de Sucesso

### Cenário 26.1: Exibir resumo de linhas ativas

**Dado** um passageiro com linhas matriculadas
**Quando** acessa o dashboard
**Então** vê o número de linhas ativas
**E** o seu horário de ida e volta cadastrado em cada linha

### Cenário 26.2: Exibir próximas viagens (7 dias)

**Dado** um passageiro com presença registrada ou padrão
**Quando** acessa o dashboard
**Então** vê a lista dos próximos 7 dias com status de presença em cada linha

### Cenário 26.3: Exibir histórico (últimos 7 dias)

**Dado** um passageiro com histórico de presenças
**Quando** acessa o dashboard
**Então** vê os últimos 7 dias com o status registrado (ou padrão se não houve registro)

### Cenário 26.4: Alterar presença diretamente pelo dashboard

**Dado** um passageiro visualizando os próximos 7 dias
**Quando** altera o status de um dia futuro
**Então** o sistema atualiza o status via RF3
**E** o dashboard reflete a mudança imediatamente

### Cenário 26.5: Exibir slot de horário do passageiro

**Dado** um passageiro com horário fixo cadastrado
**Quando** acessa o dashboard
**Então** cada linha mostra seu `departure_time` e `arrival_time`

---

## Cenários de Erro

### Cenário 26.6: Passageiro sem linhas

**Dado** um passageiro sem nenhuma matrícula
**Quando** acessa o dashboard
**Então** o sistema exibe estado vazio com instrução para entrar em uma linha

### Cenário 26.7: Usuário não autenticado

**Dado** um usuário sem autenticação
**Quando** tenta acessar o dashboard
**Então** é redirecionado para login

---

## Notas Técnicas

- Novo endpoint: `GET /api/v1/presence/me/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Retorna: `{ lines, upcomingPresence: [{ date, lineId, status }], recentHistory: [{ date, lineId, status }] }`
- Mobile: nova tela `(passenger)/dashboard.tsx` linkada da home do passageiro
- Payments: placeholder "em dia" até RF24 ser implementado
- Status padrão para dias sem registro: `vai e volta`
