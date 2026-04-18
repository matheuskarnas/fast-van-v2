# RF2: Cadastro de Veículos

## Objetivo

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
