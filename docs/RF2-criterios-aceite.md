# RF2: Cadastro de Veículos e Gerenciamento de Rotas

## Objetivo Geral

Permitir que um usuário com perfil de Motorista cadastre um ou mais veículos no sistema e crie linhas (rotas) para transportar passageiros, gerenciando os pontos de embarque/desembarque e convidando passageiros através de links de convite.

---

## Parte 1: Cadastro de Veículos

### Objetivo

Permitir que um usuário com perfil de Motorista cadastre um ou mais veículos no sistema para que possa utilizá-los na criação de linhas futuras.

---

## Regras de Validação Globais

### Autorização

- Apenas usuários com role `DRIVER` podem cadastrar veículos
- O usuário deve estar autenticado para acessar o fluxo de cadastro de veículo

### Placa

- Deve ser válida conforme o padrão aceito pelo sistema
- Deve ser única no sistema

### Ano do veículo

- Deve ser um ano válido
- Deve respeitar uma faixa mínima coerente com o sistema

### Capacidade

- Deve ser informada no cadastro
- Deve ser maior que zero
- Deve ter valor máximo de `68` assentos

### Dados obrigatórios

- `plate`
- `model`
- `year`
- `capacity`

---

## Cenários de Sucesso

### Cenário 2.1: Cadastro bem-sucedido de veículo por motorista

**Dado** um motorista autenticado e sem veículo cadastrado
**E** os dados do veículo: placa válida, modelo válido, ano válido e capacidade entre 1 e 68
**Quando** ele acessa o fluxo de cadastro de veículo
**Então** o veículo é criado no sistema
**E** o veículo fica vinculado ao motorista logado
**E** o veículo pode ser listado para esse motorista posteriormente

### Cenário 2.2: Motorista com mais de um veículo

**Dado** um motorista autenticado
**E** que já possui um veículo cadastrado
**Quando** ele cadastra outro veículo válido
**Então** o novo veículo também é criado no sistema
**E** permanece vinculado ao mesmo motorista
**E** ambos os veículos ficam disponíveis para uso futuro na criação de linhas

### Cenário 2.3: Listagem de veículos do motorista

**Dado** um motorista autenticado com veículos cadastrados
**Quando** ele acessa a listagem de veículos
**Então** o sistema exibe apenas os veículos vinculados ao motorista logado

---

## Cenários de Erro

### Cenário 2.4: Usuário sem permissão tenta cadastrar veículo

**Dado** um usuário com role diferente de `DRIVER`
**Quando** ele tenta cadastrar um veículo
**Então** o sistema bloqueia a operação
**E** exibe erro de permissão

### Cenário 2.5: Placa inválida

**Dado** um formulário de cadastro de veículo
**Quando** o usuário informa uma placa em formato inválido
**Então** o sistema exibe erro: `Placa de veículo inválida`
**E** o veículo não é criado

### Cenário 2.6: Placa já cadastrada

**Dado** uma placa já registrada no sistema
**Quando** o motorista tenta cadastrar outro veículo com a mesma placa
**Então** o sistema exibe erro: `Já existe veículo cadastrado com essa placa`
**E** o veículo não é criado

### Cenário 2.7: Ano do veículo inválido

**Dado** um formulário de cadastro de veículo
**Quando** o usuário informa um ano inválido
**Então** o sistema exibe erro: `Ano do veículo inválido`
**E** o veículo não é criado

### Cenário 2.8: Capacidade inválida

**Dado** um formulário de cadastro de veículo
**Quando** o usuário informa capacidade menor ou igual a zero ou maior que 68
**Então** o sistema exibe erro: `Capacidade do veículo deve estar entre 1 e 68`
**E** o veículo não é criado

### Cenário 2.9: Campos obrigatórios vazios

**Dado** um formulário de cadastro de veículo
**Quando** o usuário deixa campos obrigatórios em branco
**Campos obrigatórios: placa, modelo, ano e capacidade**
**Então** o sistema exibe erro: `Preencha todos os campos obrigatórios`
**E** o veículo não é criado

---

## Notas Técnicas

- O motorista autenticado será identificado pelo token JWT
- O cadastro de veículo deve manter vínculo com o usuário motorista
- A placa deve ser tratada como identificador único de veículo
- A capacidade máxima foi definida em `68` assentos para contemplar os cenários de van, micro-ônibus e ônibus double decker
- O sistema deve permitir a listagem dos veículos do motorista logado para uso em funcionalidades futuras como criação de linhas

---

## Parte 2: Cadastro e Gerenciamento de Rotas

### Objetivo

Permitir que um motorista autenticado, com pelo menos um veículo cadastrado, crie linhas (rotas) de transporte definindo cidade de origem e destino. Toda linha é composta por ida e volta por padrão. Os pontos de embarque/desembarque são adicionados conforme passageiros entram na linha, e um segundo motorista pode ser atrelado à linha caso necessário.

---

## Regras de Validação Globais - Parte 2

### Autorização

- Apenas usuários com role `DRIVER` podem criar e gerenciar linhas
- O usuário deve estar autenticado
- O dono da van (que a criou) pode atrelar outro motorista à linha através de link de convite
- O motorista atrelado à linha pode gerenciar os pontos de embarque/desembarque

### Dados obrigatórios de linha (no momento da criação)

- `vehicle_id` - Veículo/Van da linha (referência ao veículo cadastrado, deve pertencer ao motorista)
- `origin_city` - Cidade de partida (ex: "Caçapava") - **obrigatório, selecionada via API IBGE para padronização de nome oficial do município**
- `destination_place` - Local/ponto específico de destino (ex: "Fatec-SJC", "Centro de SP") - **obrigatório, selecionado via Google Places API com geocodificação**
- `owner_driver_id` - Motorista dono da van (identificado via token JWT)

### Dados opcionais na criação

- `driver_id` - Outro motorista que operará a linha (se diferente do dono)
- `departure_time` - Horário de partida (formato HH:mm) - pode ser definido depois
- `arrival_time` - Horário de chegada no destino (formato HH:mm) - pode ser definido depois
- `return_time` - Horário de retorno do destino (formato HH:mm) - pode ser definido depois

### Composição da linha

- Toda linha possui ida e volta por padrão desde a criação
- Mesmo sem horários preenchidos no momento da criação, a volta já faz parte da linha

### Capacidade

- Herdada automaticamente do veículo selecionado
- Deve ser respeitada na adição de passageiros

### Pontos de Embarque/Desembarque

- Criados CONFORME os passageiros entram na linha (não obrigatórios na criação)
- Cada ponto é atrelado a um ou mais passageiros
- Cada ponto deve ter:
  - Endereço (obrigatório quando criado)
  - Tipo (embarque ou desembarque)
  - Passageiros vinculados
- Pode ser editado conforme a demanda de passageiros
- Só pode ser removido se não houver passageiros vinculados

---

## Cenários de Sucesso

### Cenário 2.10: Criar linha bem-sucedida com dados mínimos

**Dado** um motorista autenticado com pelo menos um veículo cadastrado
**E** os dados mínimos da linha: cidade de origem válida, ponto de destino específico válido, veículo válido
**Quando** ele cria a linha
**Então** a linha é criada no sistema
**E** fica vinculada ao motorista dono da van
**E** a capacidade é herdada do veículo selecionado
**E** a linha é criada com ida e volta por padrão
**E** a linha começa SEM pontos de embarque/desembarque
**E** a linha pode ser listada para esse motorista posteriormente
**E** a linha pode receber passageiros que acionam pontos conforme necessário

### Cenário 2.11: Atrelar segundo motorista à linha

**Dado** um motorista dono de uma van com uma linha criada
**Quando** ele gera um link de convite para outro motorista
**Então** um link único é gerado para a linha
**E** o segundo motorista pode aceitar o convite através do link
**E** após aceitar, o segundo motorista fica vinculado à linha como `driver_id`
**E** pode gerenciar os pontos de embarque/desembarque da linha

### Cenário 2.12: Adicionar ponto de embarque conforme primeiro passageiro chega

**Dado** uma linha criada com origin_city e destination_place
**E** um primeiro passageiro sendo adicionado à linha
**Quando** o motorista (ou dono) adiciona o ponto de embarque do passageiro
**Então** o ponto é criado com endereço e tipo
**E** o ponto é vinculado à linha
**E** o passageiro é atrelado a este ponto
**E** o ponto aparece na listagem de pontos da linha

### Cenário 2.13: Adicionar múltiplos pontos conforme passageiros entram

**Dado** uma linha criada
**E** passageiros sendo adicionados em momentos diferentes
**Quando** cada passageiro é adicionado, seu ponto de embarque/desembarque é criado
**Então** múltiplos pontos são criados sob demanda
**E** cada ponto mantém seu endereço, horário e passageiros vinculados específicos
**E** a linha funciona com múltiplos pontos de parada dinâmicos

### Cenário 2.14: Gerar link de convite para passageiro

**Dado** um motorista autenticado com uma linha criada
**Quando** ele gera um link de convite para a linha
**Então** um link único é gerado (ex: `fastvan.app/invite/linha-abc123`)
**E** o link pode ser compartilhado com potenciais passageiros
**E** o link permanece válido para convites futuros
**E** passageiros podem se cadastrar ou fazer login via este link

### Cenário 2.15: Editar ponto de embarque/desembarque

**Dado** um ponto de embarque/desembarque já criado na linha
**Quando** o motorista edita endereço ou tipo do ponto
**Então** as informações são atualizadas no sistema
**E** passageiros vinculados ao ponto podem ser notificados (funcionalidade futura)

### Cenário 2.16: Remover ponto de embarque/desembarque vazio

**Dado** um ponto de embarque/desembarque na linha
**E** sem passageiros vinculados atualmente
**Quando** o motorista remove o ponto
**Então** o ponto é removido da linha
**E** a linha continua ativa com os demais pontos

### Cenário 2.17: Motorista com múltiplas linhas simultâneas

**Dado** um motorista autenticado com múltiplos veículos
**Quando** ele cria várias linhas (ex: uma para turno da manhã, outra para noturno)
**Então** todas as linhas são criadas e vinculadas ao motorista
**E** cada linha pode ter seu próprio conjunto de pontos e passageiros
**E** todas as linhas podem ser listadas para esse motorista

---

---

## Cenários de Erro

### Cenário 2.18: Motorista sem veículo tenta criar linha

**Dado** um motorista autenticado
**E** que não possui nenhum veículo cadastrado
**Quando** ele tenta criar uma linha
**Então** o sistema bloqueia a operação
**E** exibe erro: `Você deve cadastrar um veículo antes de criar uma linha`

### Cenário 2.19: Dados de linha incompletos (sem origem/destino)

**Dado** um formulário de criação de linha
**Quando** o usuário deixa cidade de origem ou ponto de destino em branco
**Então** o sistema exibe erro: `Cidade de origem e ponto de destino são obrigatórios`
**E** a linha não é criada

### Cenário 2.20: Veículo não pertence ao motorista

**Dado** um motorista autenticado
**E** tentando criar uma linha com veículo_id de outro motorista
**Quando** ele tenta criar a linha
**Então** o sistema bloqueia a operação
**E** exibe erro: `Veículo não encontrado ou não pertence a você`

### Cenário 2.21: Adicionar ponto sem endereço

**Dado** um formulário de adição de ponto de embarque
**Quando** o usuário deixa o endereço em branco
**Então** o sistema exibe erro: `Endereço é obrigatório para criar um ponto`
**E** o ponto não é criado

### Cenário 2.22: Remover ponto com passageiros vinculados

**Dado** um ponto de embarque/desembarque com passageiros atrelados
**Quando** o motorista tenta remover o ponto
**Então** o sistema bloqueia a operação
**E** exibe erro: `Remova os passageiros vinculados antes de deletar este ponto`

### Cenário 2.23: Motorista não autorizado tenta gerenciar linha

**Dado** uma linha com um motorista específico atrelado
**E** outro motorista tentando acessar/editar a linha
**Quando** ele tenta gerenciar pontos ou passageiros da linha
**Então** o sistema bloqueia a operação
**E** exibe erro: `Você não tem permissão para gerenciar esta linha`

### Cenário 2.24: Adicionar motorista não encontrado

**Dado** um formulário de atrelamento de motorista
**Quando** o usuário informa um ID de motorista inválido ou inexistente
**Então** o sistema exibe erro: `Motorista não encontrado`
**E** o motorista não é atrelado à linha

---

## Notas Técnicas - Parte 2

- O dono da van será identificado pelo token JWT
- A linha deve manter vínculo com o veículo e herdar sua capacidade automaticamente
- Um campo `driver_id` (opcional) deve permitir atrelar um segundo motorista diferente do dono
- Os pontos de embarque/desembarque devem ser criados sob demanda conforme passageiros entram
- Cada ponto deve ter referência aos passageiros vinculados
- O link de convite deve ser único e resistir a colisões (usar UUID ou similar)
- A estrutura permite múltiplas linhas por motorista, cada uma com seu próprio conjunto de pontos
- Validação: `origin_city` (apenas cidade) e `destination_place` (ponto específico) são obrigatórios; horários são opcionais na criação
- `origin_city` é selecionada via API IBGE (https://servicodados.ibge.gov.br/api/v1/localidades/municipios) para garantir nome oficial padronizado. `destination_place` é selecionado via Google Places API com retorno de coordenadas e place_id
- Pontos de embarque/desembarque não possuem horário fixo; o horário de passada depende da execução da rota no dia
- O sistema deve impedir deleção de pontos com passageiros atrelados
- Futuramente: notificação de passageiros quando pontos são editados ou removidos
