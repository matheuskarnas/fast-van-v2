# RF7: Check-in por Geofencing (Sensor de GPS)

## Objetivo Geral

Permitir que o motorista inicie uma linha ativa e, durante a execução da rota, dispare check-ins automáticos por geofencing para notificar os passageiros confirmados do próximo ponto.

---

## Objetivo

Garantir que o fluxo operacional de embarque funcione em tempo real, iniciando somente quando o motorista aciona manualmente a linha e avançando ponto a ponto com base na localização do veículo.

---

## Regras de Validação Globais

### Ativação da linha

- A linha só entra em execução quando o motorista aciona manualmente `iniciar linha`
- O motorista visualiza suas linhas disponíveis e escolhe qual iniciar (ex: ida manhã Fatec)
- Sem linha iniciada, nenhum evento de geofencing/notificação deve ser disparado

### Escopo da execução

- O fluxo de check-in deve considerar a próxima data da linha
- Apenas pontos ativos da rota do dia devem participar do fluxo
- Pontos sem passageiros confirmados devem ser ignorados no avanço da rota

### Geofencing e notificação

- A chegada em um ponto ocorre quando o motorista entra no raio configurado desse ponto
- Ao confirmar chegada no ponto atual, o sistema deve notificar os passageiros confirmados do próximo ponto
- Notificação deve respeitar trecho da viagem (`ida` ou `volta`)
- O mesmo ponto não pode disparar notificações duplicadas para a mesma passagem

### Autorização

- Apenas motorista dono da linha e motorista atrelado podem iniciar linha e operar check-in
- Passageiro não pode iniciar linha nem disparar check-in

---

## Cenários de Sucesso

### Cenário 7.1: Motorista inicia linha manualmente

**Dado** um motorista com linhas disponíveis
**Quando** ele aciona `iniciar linha` em uma linha específica
**Então** a linha passa para estado ativo
**E** o fluxo de geofencing é habilitado

### Cenário 7.2: Fluxo não inicia sem comando manual

**Dado** uma linha existente e não iniciada
**Quando** o motorista ainda não acionou `iniciar linha`
**Então** o sistema não processa check-in por geofencing

### Cenário 7.3: Check-in ao entrar no raio do ponto

**Dado** uma linha ativa
**E** um ponto atual com raio configurado
**Quando** o motorista entra no raio do ponto
**Então** o sistema registra o check-in do ponto com data/hora e coordenada

### Cenário 7.4: Notificar próximo ponto na ida

**Dado** uma linha ativa no trecho de ida
**Quando** o check-in do ponto atual é confirmado
**Então** passageiros confirmados do próximo ponto da ida recebem notificação

### Cenário 7.5: Notificar próximo ponto na volta

**Dado** uma linha ativa no trecho de volta
**Quando** o check-in do ponto atual é confirmado
**Então** passageiros confirmados do próximo ponto da volta recebem notificação

### Cenário 7.6: Ignorar ponto sem confirmados

**Dado** uma linha ativa com pontos sem passageiros confirmados
**Quando** o sistema determina o próximo ponto da rota
**Então** o ponto vazio é ignorado
**E** o fluxo avança para o próximo ponto com confirmados

### Cenário 7.7: Motorista dono pode operar execução da linha

**Dado** uma linha com motorista dono definido
**Quando** o dono inicia a linha e executa check-ins
**Então** o sistema permite a operação

### Cenário 7.8: Motorista atrelado pode operar execução da linha

**Dado** uma linha com motorista atrelado
**Quando** o motorista atrelado inicia a linha e executa check-ins
**Então** o sistema permite a operação

---

## Cenários de Erro

### Cenário 7.9: Passageiro tenta iniciar linha

**Dado** um usuário passageiro
**Quando** ele tenta acionar `iniciar linha`
**Então** o sistema bloqueia a operação
**E** exibe erro de autorização

### Cenário 7.10: Motorista sem vínculo tenta iniciar linha

**Dado** uma linha com motoristas vinculados
**E** um motorista externo sem vínculo
**Quando** ele tenta iniciar a linha
**Então** o sistema bloqueia a operação
**E** exibe erro de autorização

### Cenário 7.11: Linha inexistente

**Dado** um identificador de linha inválido
**Quando** o usuário tenta iniciar ou processar check-in
**Então** o sistema bloqueia a operação
**E** exibe erro: `Linha não encontrada`

### Cenário 7.12: Ponto inexistente no fluxo

**Dado** uma linha ativa
**Quando** o sistema tenta registrar check-in em ponto inexistente
**Então** a operação é bloqueada
**E** exibe erro de integridade da rota

### Cenário 7.13: Localização indisponível

**Dado** uma linha ativa
**Quando** o GPS não está disponível ou sem permissão
**Então** o sistema não confirma check-in automático
**E** exibe erro de localização

### Cenário 7.14: Fora do raio do ponto

**Dado** uma linha ativa
**Quando** o motorista está fora do raio do ponto atual
**Então** o sistema não confirma chegada
**E** não dispara notificação do próximo ponto

### Cenário 7.15: Bloquear notificação duplicada no mesmo ponto

**Dado** um ponto já processado na passagem atual
**Quando** houver nova tentativa de disparo para o mesmo ponto
**Então** o sistema ignora o envio duplicado

---

## Notas Técnicas

- O estado `linha ativa` deve ser explícito e iniciado por ação manual do motorista
- O motor de geofencing deve operar apenas em linhas ativas
- O cálculo do próximo ponto deve reutilizar a rota diária já filtrada por confirmados
- Recomendado registrar log de chegada com timestamp e coordenadas
- O sistema deve manter controle de idempotência para evitar notificações duplicadas por ponto
- Futuramente o gatilho de proximidade pode alimentar métricas operacionais de pontualidade
