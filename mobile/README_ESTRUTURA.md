# FastVan Mobile

Aplicativo mobile para coordenação de transportes entre passageiros e motoristas de vans.

## 📁 Estrutura do Projeto

```
fast-van-mobile/
├── app/                          # Rotas da aplicação (Expo Router)
│   ├── _layout.tsx              # Layout raiz
│   ├── (auth)/                  # Grupo de rotas de autenticação
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (app)/                   # Grupo de rotas da aplicação (protegidas)
│       ├── _layout.tsx
│       ├── (passenger)/         # Funcionalidades de Passageiro
│       │   ├── _layout.tsx      # Bottom Tab Navigator
│       │   ├── home.tsx         # RF1: Home do passageiro
│       │   ├── lines.tsx        # RF3: Linhas disponíveis
│       │   ├── profile.tsx      # Perfil do passageiro
│       │   └── chat/
│       │       ├── _layout.tsx
│       │       ├── index.tsx    # RF13: Lista de conversas privadas
│       │       └── [id].tsx     # Chat privado com motorista
│       ├── (driver)/            # Funcionalidades de Motorista
│       │   ├── _layout.tsx      # Bottom Tab Navigator
│       │   ├── home.tsx         # Home do motorista
│       │   ├── register-vehicle.tsx  # RF2: Registro de veículo
│       │   ├── earnings.tsx     # Ganhos do motorista
│       │   ├── profile.tsx      # Perfil do motorista
│       │   └── chat/
│       │       ├── _layout.tsx
│       │       ├── index.tsx    # Lista de conversas privadas
│       │       └── [id].tsx     # Chat privado com passageiro
│       └── shared/              # Funcionalidades compartilhadas
│           ├── _layout.tsx
│           ├── alerts.tsx       # RF4/RF5: Ocupação e alertas de lotação
│           ├── maps.tsx         # Mapa da rota
│           └── chat-group.tsx   # RF13: Chat em grupo da linha
│
├── components/                   # Componentes reutilizáveis
│   ├── auth/                    # Componentes de autenticação
│   ├── common/                  # Componentes comuns (Button, Input, etc)
│   ├── chat/                    # Componentes de chat
│   ├── maps/                    # Componentes de mapa
│   ├── passenger/               # Componentes específicos do passageiro
│   └── driver/                  # Componentes específicos do motorista
│
├── hooks/                        # Custom React Hooks
│   ├── useAuth.ts              # Gerenciamento de autenticação
│   └── useLocation.ts          # Gerenciamento de localização
│
├── services/                     # Serviços de negócio
│   ├── api.ts                  # Cliente HTTP (axios)
│   └── storage.ts              # Armazenamento local (AsyncStorage)
│
├── types/                        # Definições TypeScript
│   ├── auth.ts                 # Tipos de autenticação
│   ├── chat.ts                 # Tipos de chat
│   ├── location.ts             # Tipos de localização
│   └── user.ts                 # Tipos de usuário
│
├── constants/                    # Constantes da aplicação
│   ├── colors.ts               # Paleta de cores e espaçamento
│   └── api.ts                  # Endpoints e configurações de API
│
├── assets/                       # Imagens, fontes, etc
├── app.json                      # Configuração do Expo
├── package.json                  # Dependências
├── tsconfig.json                 # Configuração TypeScript
└── .env.example                  # Variáveis de ambiente exemplo
```

## 🎯 Mapeamento com Requirements (RF)

| Pasta/Screen                     | RF      | Funcionalidade                                |
| -------------------------------- | ------- | --------------------------------------------- |
| (auth)/login                     | -       | Tela de login                                 |
| (auth)/register                  | RF1     | Cadastro de Usuários                          |
| (passenger)/home                 | RF1     | Home do passageiro                            |
| (driver)/register-vehicle        | RF2     | Cadastro de Veículos (parte de RF2)           |
| (driver)/create-line             | RF2     | Cadastro e Gerenciamento de Rotas             |
| (passenger)/lines                | RF3     | Confirmação de Presença pelo Aluno            |
| shared/alerts                    | RF4/RF5 | Visualização de Ocupação e Alertas de Lotação |
| (passenger)/chat & (driver)/chat | RF13    | Chat Privado 1-to-1                           |
| shared/chat-group                | RF13    | Chat em Grupo da Linha                        |

## 🚀 Como Iniciar

```bash
# Instalar dependências
npm install

# Criar arquivo .env com base em .env.example
cp .env.example .env

# Iniciar o servidor Expo
npm start

# Para Android
npm run android

# Para iOS (requer Mac)
npm run ios

# Para Web
npm run web
```

## 📦 Dependências Principais

- **expo-router**: Navegação entre rotas
- **react-navigation**: Navegação com Bottom Tabs
- **axios**: Cliente HTTP
- **@react-native-async-storage/async-storage**: Armazenamento local
- **expo-location**: Acesso à localização do usuário

## 🏗️ Stack Tecnológico

- **Frontend**: React Native + Expo
- **Linguagem**: TypeScript
- **Navegação**: Expo Router (File-based routing)
- **Estado Global**: Redux (próximo) ou Context API
- **HTTP Client**: Axios
- **Armazenamento**: AsyncStorage + SQLite (offline)
- **Maps**: Google Maps ou Mapbox (próximo)
- **Chat Real-time**: Firebase ou WebSocket (próximo)
- **Testes**: Jest + Detox (próximo)

## 📝 Próximos Passos

1. ✅ Criar estrutura base (concluído)
2. ⏳ Implementar telas de auth (login/register)
3. ⏳ Integrar com backend para RF1 (cadastro)
4. ⏳ Implementar RF2-RF8 conforme prioridade
5. ⏳ Adicionar Redux para estado global
6. ⏳ Implementar Firebase para chat real-time
7. ⏳ Adicionar Google Maps
8. ⏳ Testes E2E com Detox
