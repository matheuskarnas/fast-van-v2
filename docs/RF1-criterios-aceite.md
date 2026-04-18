# RF1: Cadastro de Usuários com Perfis Distintos

## Objetivo

Permitir o cadastro de dois tipos de usuários (Passageiro e Motorista) com validações específicas e garantir acesso apenas às funcionalidades de sua role.

---

## Regras de Validação Globais

### CPF

- Deve ser válido (passar na validação de CPF brasileiro)
- Deve ser único no sistema (não pode haver dois usuários com mesmo CPF)
- Formato: aceitar com ou sem máscara (111.111.111-11 ou 11111111111)

### Email

- Deve ser único no sistema
- Deve estar em formato válido (xxx@xxx.xxx)

### Senha

- Mínimo de 6 caracteres
- Obrigatório pelo menos 1 número
- Obrigatório pelo menos 1 letra maiúscula
- Obrigatório pelo menos 1 letra minúscula
- Obrigatório pelo menos 1 caractere especial (!@#$%^&\*)

### CNH (apenas Motorista)

- Deve ser única no sistema
- Validação de CNH brasileira implementada mas DESLIGADA em testes
- TODO: Ligar validação de CNH em produção

---

## Cenários de Sucesso

### Cenário 1.1: Cadastro bem-sucedido como Passageiro

**Dado** um usuário sem cadastro no sistema
**E** os dados: nome="João Silva", CPF="123.456.789-09", idade=25, email="joao@example.com", senha="Senha@123"
**Quando** ele clica em "Cadastrar como Passageiro"
**Então** o usuário é criado no sistema
**E** é redirecionado para a home do passageiro
**E** tem acesso apenas a funcionalidades de passageiro (listar linhas, confirmar presença, etc)
**E** não tem acesso a funcionalidades de motorista

### Cenário 1.2: Cadastro bem-sucedido como Motorista

**Dado** um usuário sem cadastro no sistema
**E** os dados: nome="João Silva", CPF="123.456.789-09", CNH="0123456789", ano_nascimento=1990, email="joao@example.com", senha="Senha@123"
**Quando** ele clica em "Cadastrar como Motorista"
**Então** o usuário é criado no sistema
**E** é redirecionado para a tela de cadastro de veículo (primeira funcionalidade obrigatória)
**E** tem acesso apenas a funcionalidades de motorista

---

## Cenários de Erro

### Cenário 1.3: CPF inválido

**Dado** um formulário de cadastro
**Quando** o usuário preenche CPF inválido (ex: "000.000.000-00")
**E** clica em "Cadastrar"
**Então** exibe erro: "CPF inválido"
**E** o usuário não é criado
**E** o foco retorna ao campo de CPF

### Cenário 1.4: CPF já cadastrado

**Dado** um CPF já registrado no sistema
**Quando** outro usuário tenta cadastrar com o mesmo CPF
**Então** exibe erro: "CPF já cadastrado no sistema"
**E** o usuário não é criado

### Cenário 1.5: Email já cadastrado

**Dado** um email já registrado no sistema
**Quando** outro usuário tenta cadastrar com o mesmo email
**Então** exibe erro: "Email já cadastrado no sistema"
**E** o usuário não é criado

### Cenário 1.6: Senha fraca

**Dado** um formulário de cadastro
**Quando** o usuário preenche uma senha que não atende aos requisitos
**Exemplos de senhas inválidas:**

- "abc123" (sem letra maiúscula e sem caractere especial)
- "Abc" (menos de 6 caracteres)
- "ABCDEF123" (sem letra minúscula)
- "abcdef123" (sem letra maiúscula)
- "Abcdef" (sem número e sem caractere especial)
  **E** clica em "Cadastrar"
  **Então** exibe erro: "Senha deve ter no mínimo 6 caracteres, 1 número, 1 maiúscula, 1 minúscula e 1 caractere especial"
  **E** o usuário não é criado

### Cenário 1.7: Email inválido

**Dado** um formulário de cadastro
**Quando** o usuário preenche um email em formato inválido (ex: "joao@", "joao.com", "@example.com")
**E** clica em "Cadastrar"
**Então** exibe erro: "Email em formato inválido"
**E** o usuário não é criado

### Cenário 1.8: Campos obrigatórios vazios (Passageiro)

**Dado** um formulário de cadastro como Passageiro
**Quando** o usuário deixa campos obrigatórios em branco
**Campos obrigatórios: nome, CPF, idade, email, senha**
**E** clica em "Cadastrar"
**Então** exibe erro: "Preencha todos os campos obrigatórios"
**E** o usuário não é criado

### Cenário 1.9: Campos obrigatórios vazios (Motorista)

**Dado** um formulário de cadastro como Motorista
**Quando** o usuário deixa campos obrigatórios em branco
**Campos obrigatórios: nome, CPF, CNH, ano_nascimento, email, senha**
**E** clica em "Cadastrar"
**Então** exibe erro: "Preencha todos os campos obrigatórios"
**E** o usuário não é criado

### Cenário 1.10: CNH já cadastrado (Motorista)

**Dado** uma CNH já registrada no sistema
**Quando** outro usuário tenta cadastrar como motorista com a mesma CNH
**Então** exibe erro: "CNH já cadastrada no sistema"
**E** o usuário não é criado

### Cenário 1.11: Usuário sem cadastro tenta acessar funcionalidade

**Dado** um usuário sem cadastro
**Quando** ele tenta acessar qualquer funcionalidade da aplicação (ex: clicar em "Ver linhas")
**Então** é redirecionado para a tela de login/cadastro

---

## Notas Técnicas

- CPF será validado via algoritmo de dígito verificador
- Email será validado via regex padrão
- Senha será validada via regex: `^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$`
- CNH: validação desligada por padrão em testes, estrutura pronta para produção
- Todos os dados serão armazenados em banco PostgreSQL com constraints de unicidade em CPF, Email e CNH
