# Estrutura do Monorepo FastVan

## 📦 Organização Geral

```
fast-van-v2/ (monorepo)
│
├── backend/                          📱 SERVIDOR (Node.js + Express)
│   ├── src/
│   │   ├── services/
│   │   │   ├── authService.js       ✅ Cadastro e autenticação
│   │   │   └── userService.js       ✅ CRUD de usuários
│   │   ├── utils/
│   │   │   └── validators.js        ✅ Validações (CPF, Email, Senha, CNH)
│   │   └── __tests__/
│   │       └── RF1-cadastro-usuarios.test.js  ✅ 40+ testes
│   ├── package.json
│   ├── .env.example
│   └── README.md                    (próximo: criar)
│
├── mobile/                           📱 APP (React Native + Expo)
│   ├── app/
│   │   ├── _layout.tsx              🎯 Root layout
│   │   ├── (auth)/                  🔐 Autenticação
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── _layout.tsx
│   │   └── (app)/                   🏠 Aplicação principal
│   │       ├── (passenger)/         👤 Passageiro
│   │       │   ├── home.tsx
│   │       │   ├── lines.tsx
│   │       │   ├── profile.tsx
│   │       │   ├── chat/
│   │       │   └── _layout.tsx
│   │       ├── (driver)/            🚗 Motorista
│   │       │   ├── home.tsx
│   │       │   ├── register-vehicle.tsx
│   │       │   ├── earnings.tsx
│   │       │   ├── profile.tsx
│   │       │   ├── chat/
│   │       │   └── _layout.tsx
│   │       └── shared/              🔄 Compartilhado
│   │           ├── alerts.tsx
│   │           ├── maps.tsx
│   │           ├── chat-group.tsx
│   │           └── _layout.tsx
│   │
│   ├── components/
│   │   ├── auth/                    🔐 Login/Register
│   │   ├── common/                  🧩 Button, Input, etc
│   │   ├── chat/                    💬 Chat components
│   │   ├── maps/                    🗺️ Map components
│   │   ├── passenger/               👤 Passenger specific
│   │   └── driver/                  🚗 Driver specific
│   │
│   ├── hooks/
│   │   ├── useAuth.ts              ✅ Autenticação
│   │   └── useLocation.ts          ✅ GPS
│   │
│   ├── services/
│   │   ├── api.ts                  ✅ Axios client com interceptors
│   │   └── storage.ts              ✅ AsyncStorage wrapper
│   │
│   ├── types/
│   │   ├── auth.ts                 ✅ Auth types
│   │   ├── user.ts                 ✅ User types
│   │   ├── chat.ts                 ✅ Chat types
│   │   └── location.ts             ✅ Location types
│   │
│   ├── constants/
│   │   ├── colors.ts               ✅ Design system
│   │   └── api.ts                  ✅ Endpoints
│   │
│   ├── assets/
│   │   ├── images/
│   │   └── fonts/
│   │
│   ├── package.json
│   ├── app.json
│   ├── .env.example
│   ├── tsconfig.json
│   └── README_ESTRUTURA.md
│
├── docs/                             📚 DOCUMENTAÇÃO
│   └── RF1-criterios-aceite.md      ✅ Cenários de teste
│
├── README.md                         📖 README principal (monorepo)
├── package.json                      📦 Scripts do monorepo
├── .gitignore                        🚫 Ignore patterns
└── .copilotcustominstructions        🤖 Instruções Copilot
```

## 🎯 Mapeamento de Funcionalidades

### Backend (Node.js/Express)

```
RF1: Cadastro de Usuários
├── POST /auth/register          → authService.createUser()
├── POST /auth/login             → authService.authenticateUser()
├── Validações:
│   ├── CPF (único, dígitos corretos)
│   ├── Email (formato, único)
│   ├── Senha (6+ chars, 1 maiús, 1 minús, 1 número, 1 especial)
│   ├── CNH (único, para motoristas)
│   └── Idade (18+ anos)
└── Testes Jest: ✅ 40+ test cases
```

### Mobile (React Native/Expo)

```
Autenticação
├── (auth)/login       → Tela de login
└── (auth)/register    → Tela de cadastro (RF1)

Passageiro
├── home              → Dashboard do passageiro
├── lines             → Consultar linhas (RF3)
├── chat/
│   ├── index         → Lista de conversas (RF6)
│   └── [id]          → Chat privado 1-to-1
└── profile           → Perfil do passageiro

Motorista
├── home              → Dashboard do motorista
├── register-vehicle  → Cadastro de veículo (RF2)
├── earnings          → Ganhos
├── chat/
│   ├── index         → Lista de conversas
│   └── [id]          → Chat privado 1-to-1
└── profile           → Perfil do motorista

Compartilhado
├── alerts            → Notificações do sistema (RF7)
├── maps              → Visualizar rota (RF8)
└── chat-group        → Chat em grupo da linha (RF7)
```

## 📊 Status de Implementação

### ✅ Concluído

- Backend: authService.js com 40+ validações
- Backend: Testes Jest completos (RF1)
- Backend: Validators utilities
- Mobile: Estrutura de rotas completa
- Mobile: Types/Interfaces TypeScript
- Mobile: Serviços (API, Storage)
- Mobile: Hooks (Auth, Location)
- Documentação: Critérios de aceite (RF1)

### ⏳ Em Progresso

- Backend: Banco de dados PostgreSQL
- Backend: Endpoints REST
- Mobile: Telas de Login/Register

### 📋 Próximos

- RF2: Cadastro de Veículos
- RF3: Criação de Linhas
- Firebase: Chat em tempo real
- Google Maps: Visualização de rotas
- Redux: Estado global
- Testes Detox: E2E tests

## 🚀 Como Usar

### Instalar tudo

```bash
npm run install:all
```

### Backend

```bash
npm run backend:test         # Rodar testes
npm run backend:test:rf1     # Apenas RF1
npm run backend:dev          # Servidor em desenvolvimento
```

### Mobile

```bash
npm run mobile:start         # Iniciar Expo
npm run mobile:android       # Build Android
```

### Verificar Status

```bash
npm run test:coverage        # Coverage do backend
```

## 📝 Convenções

### Backend

- Arquivos: `camelCase.js`
- Funções: `camelCase()`
- Constantes: `UPPER_SNAKE_CASE`
- Pastas: `lowercase`

### Mobile

- Componentes: `PascalCase.tsx`
- Hooks: `useHookName.ts`
- Tipos: `interface PascalCase`
- Rotas: `lowercase-with-dashes`

### Git

```
feat(RF1): adiciona cadastro de usuários
fix(auth): corrige validação de CPF
docs: atualiza README
refactor: organiza estrutura de pastas
test(RF1): adiciona 5 novos test cases
```

## 🔐 Segurança

- JWT tokens com 7 dias de expiração
- Senhas hasheadas com bcrypt
- Validação de CPF com algoritmo oficial
- CORS configurado
- Rate limiting (próximo)
- LGPD compliance (próximo)

## 📞 Suporte

- Documentação: `/docs`
- Instruções Copilot: `.copilotcustominstructions`
- Testes: `npm run test`
- Coverage: `npm run test:coverage`
