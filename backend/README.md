# FastVan Backend

Servidor Node.js/Express para o aplicativo FastVan - coordenação de transportes entre passageiros e motoristas de vans.

## 📁 Estrutura

```
backend/
├── src/
│   ├── services/
│   │   ├── authService.js      # Autenticação, validação e criação de usuários
│   │   └── userService.js      # Operações CRUD de usuários
│   ├── utils/
│   │   └── validators.js       # Funções de validação reutilizáveis
│   └── __tests__/
│       └── RF1-cadastro-usuarios.test.js  # Suite de testes (40+ casos)
├── package.json
├── .env.example
└── README.md                   # Este arquivo
```

## ✅ Implementado

### Services

- **authService.js**:
  - ✅ `createUser()` - Cadastro com validação completa
  - ✅ `authenticateUser()` - Login com JWT
  - ✅ `verifyToken()` - Validação de tokens
  - ✅ Suporte a roles: DRIVER e PASSENGER

- **userService.js**:
  - ✅ `createUserInDB()` - Criar usuário
  - ✅ `getUserByEmail()` - Buscar por email
  - ✅ `getUserByCPF()` - Buscar por CPF
  - ✅ `getUserByCNH()` - Buscar por CNH
  - ✅ `getUserById()` - Buscar por ID
  - ✅ Mock database para testes

### Validadores (validators.js)

- ✅ `validateCPF()` - CPF brasileiro (dígitos verificadores)
- ✅ `validateEmail()` - Formato de email
- ✅ `validatePassword()` - Força de senha (6+ chars, maiús, minús, número, especial)
- ✅ `validateCNH()` - CNH (básico, TODO para produção)
- ✅ `validateAge()` - Idade mínima (18 anos)
- ✅ `validateBirthYear()` - Ano de nascimento válido
- ✅ `isEmpty()` - Verifica campos vazios

### Testes (Jest)

- ✅ 40+ test cases para RF1
- ✅ Validação de CPF (6 testes)
- ✅ Validação de Email (4 testes)
- ✅ Validação de Senha (8 testes)
- ✅ Validação de CNH (2 testes)
- ✅ Registro de Passageiro (4 testes)
- ✅ Registro de Motorista (3 testes)
- ✅ Cenários de erro (8 testes)
- ✅ RBAC/Controle de Acesso (2 testes)

## 🚀 Como Usar

### Instalação

```bash
npm install
```

### Testes

```bash
# Rodar todos os testes
npm test

# Modo watch (reexecuta ao salvar)
npm run test:watch

# Coverage (cobertura de testes)
npm run test:coverage

# Apenas testes de RF1
npm run test:rf1
```

### Desenvolvimento

```bash
# Servidor em desenvolvimento (com auto-reload)
npm run dev

# Iniciar servidor (produção)
npm start
```

## 🔐 Autenticação (RF1)

### Fluxo de Cadastro

1. **Validação de Entrada**
   - Todos os campos obrigatórios preenchidos
   - Tipo correto (DRIVER ou PASSENGER)

2. **Validações de Campo**
   - CPF: Válido (dígitos verificadores) e único
   - Email: Formato válido e único
   - Senha: 6+ caracteres, maiúscula, minúscula, número, especial
   - CNH (motorista): Unique
   - Idade/Ano de Nascimento: 18+ anos

3. **Armazenamento**
   - Senha hash com bcrypt (10 rounds)
   - Usuário armazenado no banco

4. **Autenticação**
   - JWT gerado com 7 dias de expiração
   - Redirecionamento conforme role:
     - DRIVER → `/driver/register-vehicle`
     - PASSENGER → `/passenger/home`

### Códigos de Erro

```javascript
INVALID_CPF; // CPF não passa na validação
CPF_ALREADY_EXISTS; // CPF já cadastrado
INVALID_EMAIL; // Email em formato inválido
EMAIL_ALREADY_EXISTS; // Email já cadastrado
WEAK_PASSWORD; // Senha não cumpre requisitos
INVALID_CNH; // CNH inválida
CNH_ALREADY_EXISTS; // CNH já cadastrada
INVALID_BIRTH_YEAR; // Ano de nascimento inválido
INVALID_AGE; // Idade não cumpre requisitos (18+)
MISSING_REQUIRED_FIELD; // Campo obrigatório vazio
UNAUTHENTICATED; // Não autenticado
```

## 📋 Validação de Senhas

Requisitos (todos obrigatórios):

- Mínimo **6 caracteres**
- Pelo menos **1 letra maiúscula** (A-Z)
- Pelo menos **1 letra minúscula** (a-z)
- Pelo menos **1 número** (0-9)
- Pelo menos **1 caractere especial** (!@#$%^&\*)

**Exemplos válidos:**

- `SenhaValida123!`
- `Test@1234`
- `MyPass#2024`

**Exemplos inválidos:**

- `123456` (sem letras ou especiais)
- `Senha123` (sem especial)
- `senha#@!` (sem maiúscula ou número)

## 🗄️ Estrutura de Dados

### User (Base)

```javascript
{
  id: string,
  name: string,
  cpf: string,          // Sem máscara no BD
  email: string,
  password: string,     // Hash bcrypt
  role: 'DRIVER' | 'PASSENGER',
  createdAt: Date,
  updatedAt: Date
}
```

### Driver (estende User)

```javascript
{
  ...user,
  cnh: string,          // Única
  birthYear: number,    // Resultado em idade 18-150
  vehicle?: Vehicle     // Relacionamento futuro
}
```

### Passenger (estende User)

```javascript
{
  ...user,
  age: number           // 18+
}
```

## 🔄 Padrão de Resposta

### Sucesso

```javascript
{
  success: true,
  user: {
    id: string,
    name: string,
    email: string,
    role: 'DRIVER' | 'PASSENGER'
  },
  token: string,        // JWT válido por 7 dias
  redirectTo: string    // URL de redirecionamento
}
```

### Erro

```javascript
{
  success: false,
  error: {
    code: string,      // Código do erro
    field?: string,    // Campo relacionado (opcional)
    message: string    // Mensagem amigável
  }
}
```

## 🔧 Dependências Principais

```json
{
  "bcryptjs": "^2.4.3", // Hash de senhas
  "jsonwebtoken": "^9.1.0", // JWT tokens
  "express": "^4.18.2", // Framework web
  "pg": "^8.11.2", // PostgreSQL client (próximo)
  "dotenv": "^16.3.1" // Variáveis de ambiente
}
```

## 📝 Próximos Passos

- [ ] Integrar PostgreSQL
- [ ] Criar endpoints REST (`/auth/register`, `/auth/login`)
- [ ] Middleware de autenticação
- [ ] Rate limiting
- [ ] Swagger/OpenAPI docs
- [ ] RF2: Cadastro de Veículos
- [ ] RF3: Criação de Linhas
- [ ] Firebase: Chat em tempo real
- [ ] Emails transacionais
- [ ] Logs estruturados

## 🧪 Exemplo de Teste

```javascript
describe("RF1 - Cadastro de Usuários", () => {
  test("deve cadastrar um passageiro com sucesso", async () => {
    const response = await createUser({
      name: "João Silva",
      cpf: "123.456.789-10",
      email: "joao@example.com",
      password: "ValidPass123!",
      role: "PASSENGER",
      age: 25,
    });

    expect(response.success).toBe(true);
    expect(response.user.role).toBe("PASSENGER");
    expect(response.token).toBeDefined();
    expect(response.redirectTo).toBe("/passenger/home");
  });
});
```

## 🚫 Limitações Atuais

- Banco de dados é mock (em memória)
- Sem persistência entre reinicializações
- Validação de CNH desativada em testes (flag `validateInProduction`)
- Sem email verification
- Sem 2FA

## ❓ FAQ

**P: Como adicionar um novo validador?**
R: Adicione a função em `validators.js` e exporte-a em `authService.js`.

**P: Onde está o banco de dados?**
R: Próximo passo é integrar PostgreSQL. Use `userService.js` como interface.

**P: Qual é a força da senha?**
R: Implementamos OWASP guidelines: 6+ chars com maiús, minús, número e especial.

**P: Como o JWT funciona?**
R: Token gerado com `jwt.sign()`, válido por 7 dias, inclui `id`, `email` e `role`.

## 📞 Suporte

Consulte:

- `/docs/RF1-criterios-aceite.md` - Critérios de teste
- `__tests__/RF1-cadastro-usuarios.test.js` - Exemplos de teste
- `.copilotcustominstructions` - Instruções do projeto
