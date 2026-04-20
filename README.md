# FastVan - Monorepo

Aplicativo para facilitar o dia-a-dia de passageiros e motoristas de vans.

## 📁 Estrutura do Projeto

```
fast-van-v2/
├── backend/                     # Servidor Node.js/Express
│   ├── src/
│   │   ├── services/           # Serviços de negócio
│   │   │   ├── authService.js  # Autenticação e criação de usuários
│   │   │   └── userService.js  # Operações de usuários
│   │   ├── utils/
│   │   │   └── validators.js   # Validações reutilizáveis
│   │   └── __tests__/
│   │       └── RF1-cadastro-usuarios.test.js
│   ├── package.json
│   └── .env.example
│
├── mobile/                      # App Mobile (React Native + Expo)
│   ├── app/                    # Rotas e telas
│   ├── components/             # Componentes reutilizáveis
│   ├── hooks/                  # Custom hooks
│   ├── services/               # Serviços (API, Storage)
│   ├── types/                  # Tipos TypeScript
│   ├── constants/              # Configurações e constantes
│   ├── assets/                 # Imagens e fontes
│   ├── package.json
│   ├── app.json
│   └── README_ESTRUTURA.md
│
├── docs/                        # Documentação
│   ├── RF1-criterios-aceite.md # Critérios de aceitação RF1
│   ├── RF2-criterios-aceite.md # Critérios de aceitação RF2
│   └── RF3-criterios-aceite.md # Critérios de aceitação RF3
│
└── README.md                    # Este arquivo
```

## 🚀 Como Iniciar

### Backend (Node.js)

```bash
cd backend
npm install
npm test                    # Rodar testes
npm start                   # Iniciar servidor
```

**Serviços Implementados:**

- ✅ `authService.js` - Cadastro de usuários (RF1)
- ✅ `userService.js` - Operações no banco de dados
- ✅ `validators.js` - Validações (CPF, Email, Senha, CNH, Idade)
- ✅ Testes Jest para RF1

**Próximos passos:**

- [ ] Implementar banco de dados PostgreSQL
- [ ] Criar endpoints REST
- [ ] Implementar Firebase para chat
- [ ] Testes E2E

### Mobile (React Native + Expo)

```bash
cd mobile
npm install
npm start                   # Iniciar Expo
npm run android             # Rodar no Android
npm run ios                 # Rodar no iOS (requer Mac)
npm run web                 # Rodar na Web
```

**Estrutura:**

- ✅ Navegação com Expo Router
- ✅ Autenticação (Login/Register)
- ✅ Bottom Tab Navigation para Passageiros e Motoristas
- ✅ Tipagem TypeScript completa
- ✅ Serviços de API e Storage

**Próximos passos:**

- [ ] Telas de Login/Register
- [ ] Integração com backend
- [ ] Chat em tempo real
- [ ] Mapas e Geolocalização
- [ ] Notificações Push

## 📋 Funcionalidades (MVP)

| RF  | Nome                                          | Status                 | Prioridade |
| --- | --------------------------------------------- | ---------------------- | ---------- |
| 1   | Cadastro de Usuários                          | ✅ Backend + Critérios | Alta       |
| 2   | Cadastro e Gerenciamento de Rotas             | ✅ Backend + Critérios | Alta       |
| 3   | Confirmação de Presença pelo Aluno            | ✅ Backend + Critérios | Alta       |
| 4   | Visualização de Ocupação da Van em Tempo Real | ⏳ Planejamento        | Média      |
| 5   | Sistema de Alerta de Lotação Crítica          | ⏳ Planejamento        | Média      |
| 6   | Lista de Espera e Chamada de Van Extra        | ⏳ Planejamento        | Média      |
| 7   | Check-in por Geofencing (Sensor de GPS)       | ⏳ Planejamento        | Média      |
| 8   | Registro de Ausência de Última Hora           | ⏳ Planejamento        | Baixa      |

**Critérios oficiais:**

- RF1: [docs/RF1-criterios-aceite.md](docs/RF1-criterios-aceite.md)
- RF2: [docs/RF2-criterios-aceite.md](docs/RF2-criterios-aceite.md)
- RF3: [docs/RF3-criterios-aceite.md](docs/RF3-criterios-aceite.md)

## 🛠️ Stack Tecnológico

**Backend:**

- Node.js + Express
- PostgreSQL (banco de dados)
- JWT (autenticação)
- Firebase (chat e notificações)
- Jest (testes)

**Mobile:**

- React Native + Expo
- TypeScript
- Expo Router (navegação)
- React Navigation (Bottom Tabs)
- Axios (HTTP client)
- AsyncStorage (persistência)
- Firebase (chat real-time)

## 📚 Documentação

- [RF1 - Critérios de Aceitação](./docs/RF1-criterios-aceite.md) - Detalhes de validações e cenários de teste
- [RF2 - Critérios de Aceitação](./docs/RF2-criterios-aceite.md) - Cadastro e gerenciamento de rotas
- [RF3 - Critérios de Aceitação](./docs/RF3-criterios-aceite.md) - Confirmação de presença do aluno
- [RF5 - Critérios de Aceitação](./docs/RF5-criterios-aceite.md) - Alertas de lotação crítica
- [Estrutura Mobile](./mobile/README_ESTRUTURA.md) - Organização do app mobile

## 🔄 Fluxo de Trabalho (TDD)

1. **Entender** a funcionalidade
2. **Criar testes** em Jest
3. **Implementar** código
4. **Refatorar** conforme necessário
5. **Validar** com user

## 🤝 Pair Programming

O desenvolvimento segue modelo de pair programming:

- Implementação orientada por testes (TDD)
- User valida e aprova cada funcionalidade
- Prioridade em simplicidade e usabilidade

## 📝 Requisitos do Sistema

- Node.js 18+
- npm 9+
- Expo CLI
- (Opcional) Android Studio ou Xcode para build nativo

## 🔐 Variáveis de Ambiente

Crie arquivos `.env` em cada pasta:

**Backend** (`.env`):

```
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/fastvan
JWT_SECRET=seu-secret-aqui
FIREBASE_CONFIG=...
```

**Mobile** (`.env` ou `.env.local`):

```
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_ENV=development
```

## ✅ Checklist de Setup

- [ ] Clonar repositório
- [ ] Backend: `npm install` e rodar testes
- [ ] Mobile: `npm install` e verificar Expo
- [ ] Criar arquivos `.env` em ambas pastas
- [ ] Banco de dados PostgreSQL configurado (próximo)

## 📞 Contato

Para dúvidas ou sugestões sobre o projeto, consulte a documentação em `/docs` ou o arquivo `.copilotcustominstructions`.
