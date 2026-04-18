# RF3: Confirmação de Presença pelo Aluno

## Objetivo Geral

Permitir que o passageiro confirme sua presença em uma linha para datas futuras, incluindo faltas parciais ou totais em ida e volta, respeitando o prazo limite até o horário de embarque do seu ponto.

---

## Objetivo

Permitir que passageiros já adicionados em uma linha gerenciem sua presença diária (ida e volta) sem perder o vínculo com a linha, enquanto o motorista visualiza os confirmados e ajusta a rota do dia conforme as confirmações.

---

## Regras de Validação Globais

### Estrutura da linha

- Toda linha é composta por ida e volta por padrão
- Ao ser adicionado na linha, o passageiro inicia com status padrão: `vai e volta`
- O status de presença é sempre registrado por data específica

### Autorização

- Apenas passageiros adicionados na linha podem marcar presença/ausência para essa linha
- O passageiro deve estar autenticado para alterar seu status
- O motorista visualiza os confirmados da sua linha para cada data

### Janela de alteração

- O passageiro pode registrar ou alterar ausência para datas futuras
- Para uma data específica, a alteração só é permitida até o horário de embarque do ponto do próprio passageiro
- Após o horário limite, alterações para aquela data devem ser bloqueadas

### Opções de presença por data

- `vai e volta` (padrão)
- `não vai e nem volta`
- `só vou e não volto`
- `não vou mas volto`

### Comportamento de rota diária

- A rota diária deve considerar apenas passageiros confirmados em cada trecho (ida/volta)
- Se todos os passageiros de um ponto estiverem ausentes naquele dia, o ponto deve ser removido da rota apenas nessa data
- Marcar ausência não remove passageiro da linha; remoção da linha ocorre apenas por ação do motorista

---

## Cenários de Sucesso

### Cenário 3.1: Passageiro adicionado inicia como vai e volta

**Dado** um passageiro recém-adicionado em uma linha
**Quando** nenhuma ausência foi marcada para uma data
**Então** o status padrão para essa data é `vai e volta`

### Cenário 3.2: Marcar ausência total para data futura

**Dado** um passageiro adicionado na linha
**E** uma data futura válida antes do horário de embarque
**Quando** ele marca `não vai e nem volta`
**Então** o passageiro fica ausente na ida e na volta nessa data
**E** permanece vinculado à linha para os próximos dias

### Cenário 3.3: Marcar ausência apenas na volta

**Dado** um passageiro adicionado na linha
**E** uma data futura válida antes do horário de embarque
**Quando** ele marca `só vou e não volto`
**Então** o passageiro fica confirmado na ida e ausente na volta nessa data

### Cenário 3.4: Marcar ausência apenas na ida

**Dado** um passageiro adicionado na linha
**E** uma data futura válida antes do horário de embarque
**Quando** ele marca `não vou mas volto`
**Então** o passageiro fica ausente na ida e confirmado na volta nessa data

### Cenário 3.5: Motorista visualiza confirmados por trecho

**Dado** uma linha com passageiros e diferentes marcações de presença para uma data
**Quando** o motorista acessa a ocupação da linha nessa data
**Então** o sistema exibe os passageiros confirmados na ida
**E** exibe os passageiros confirmados na volta

### Cenário 3.6: Remoção de ponto sem confirmados na data

**Dado** um ponto com passageiros vinculados
**E** que todos os passageiros desse ponto estão ausentes em determinado dia
**Quando** o sistema monta a rota diária
**Então** esse ponto é removido da rota apenas nesse dia
**E** o ponto continua existindo na linha para outras datas

### Cenário 3.7: Alterar marcação antes do horário limite

**Dado** um passageiro com status já definido para uma data futura
**E** ainda dentro da janela de alteração (antes do horário de embarque)
**Quando** ele altera sua escolha de presença
**Então** o sistema atualiza o status da data com sucesso

---

## Cenários de Erro

### Cenário 3.8: Passageiro fora da linha tenta marcar ausência

**Dado** um passageiro não vinculado à linha
**Quando** ele tenta registrar presença/ausência para essa linha
**Então** o sistema bloqueia a operação
**E** exibe erro de autorização

### Cenário 3.9: Alteração após horário de embarque

**Dado** um passageiro vinculado à linha
**E** o horário de embarque do seu ponto já foi atingido para a data informada
**Quando** ele tenta alterar sua presença
**Então** o sistema bloqueia a operação
**E** exibe erro: `Prazo para alteração de presença encerrado`

### Cenário 3.10: Opção de presença inválida

**Dado** um passageiro vinculado à linha
**Quando** ele informa um status diferente das opções permitidas
**Então** o sistema bloqueia a operação
**E** exibe erro: `Status de presença inválido`

### Cenário 3.11: Data inválida para marcação

**Dado** um passageiro vinculado à linha
**Quando** ele tenta marcar presença/ausência com data inválida
**Então** o sistema bloqueia a operação
**E** exibe erro: `Data de presença inválida`

### Cenário 3.12: Usuário não autenticado tenta marcar presença

**Dado** um usuário sem autenticação válida
**Quando** ele tenta registrar ou alterar presença
**Então** o sistema bloqueia a operação
**E** exibe erro de autenticação

### Cenário 3.13: Passageiro removido da linha tenta marcar presença

**Dado** um passageiro que foi removido da linha pelo motorista
**Quando** ele tenta registrar presença/ausência nessa linha
**Então** o sistema bloqueia a operação
**E** exibe erro de autorização

---

## Notas Técnicas

- O status de presença deve ser persistido por `line_id`, `passenger_id` e `date`
- Recomenda-se normalizar os status em enum para evitar inconsistência textual
- O cálculo de rota diária deve separar os confirmados de ida e volta
- O horário limite deve considerar o horário do ponto vinculado ao passageiro
- A ausência em uma data não altera o vínculo permanente do passageiro com a linha
- A remoção de ponto por ausência total é apenas uma projeção da rota do dia, sem deletar o ponto da linha
- Futuramente, alterações de presença podem disparar notificações para motorista e passageiros impactados
