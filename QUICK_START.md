# 🚀 Quick Start - FastVan

Guia rápido para iniciar o desenvolvimento do FastVan.

## 📋 Pré-requisitos

- Node.js 18+
- npm 9+
- Git

## ⚡ Setup Inicial (5 minutos)

### 1. Clonar Repositório
```bash
git clone <seu-repo>
cd fast-van-v2
```

### 2. Instalar Dependências
```bash
# Instalar tudo (backend + mobile)
npm run install:all

# Ou manualmente:
cd backend && npm install
cd ../mobile && npm install
cd ..
```

### 3. Configurar Variáveis de Ambiente

#### Backend
```bash
cd backend
cp .env.example .env
# Edite .env com suas configurações
cd ..
```

#### Mobile
```bash
cd mobile
cp .env.example .env
cd ..
```

### 4. Rodar Testes Backend (Validar Setup)
```bash
npm run backend:test
```

Se todos os testes passarem, o backend está pronto! ✅

### 5. Iniciar Mobile
```bash
npm run mobile:start
```

Aguarde a mensagem: "Metro Bundler ready". Depois pressione:
- `a` para Android
- `i` para iOS
- `w` para Web

## 📚 Estrutura Rápida

```
fast-van-v2/
├── backend/        ← API Node.js/Express
├── mobile/         ← App React Native/Expo
├── docs/           ← Documentação
└── README.md       ← Guia principal
```

## 🎯 Tarefas Comuns

### Rodar Testes Backend
```bash
npm run backend:test        # Todos os testes
npm run backend:test:rf1    # Apenas RF1
npm run backend:test:watch  # Modo watch
npm test:coverage           # Com coverage
```

### Desenvolver Backend
```bash
npm run backend:dev         # Com auto-reload
npm run backend:start       # Produção
```

### Desenvolver Mobile
```bash
npm run mobile:start        # Expo dev server
npm run mobile:android      # Build Android
npm run mobile:ios          # Build iOS
npm run mobile:web          # Build Web
```

## 📁 Arquivos Importantes

| Arquivo | Descrição |
|---------|-----------|
| `README.md` | 📖 Guia principal do projeto |
| `ESTRUTURA.md` | 📊 Estrutura detalhada |
| `backend/README.md` | 📱 Documentação backend |
| `mobile/README_ESTRUTURA.md` | 📱 Documentação mobile |
| `docs/RF1-criterios-aceite.md` | ✅ Testes RF1 |
| `.copilotcustominstructions` | 🤖 Instruções Copilot |

## ✅ Checklist de Setup

- [ ] Node.js 18+ instalado (`node -v`)
- [ ] npm 9+ instalado (`npm -v`)
- [ ] Repositório clonado
- [ ] Dependências instaladas (`npm run install:all`)
- [ ] .env criados em backend/ e mobile/
- [ ] Testes backend passando (`npm run backend:test`)
- [ ] Expo iniciado (`npm run mobile:start`)

## 🐛 Troubleshooting

### ❌ `npm: command not found`
```bash
# Instale Node.js: https://nodejs.org/
# Depois verifique:
node -v
npm -v
```

### ❌ Testes falhando
```bash
# Limpe cache e reinstale
rm -rf backend/node_modules package-lock.json
npm run backend:install
npm run backend:test
```

### ❌ Expo não inicia
```bash
# Instale Expo CLI globalmente
npm install -g expo-cli

# Depois tente novamente
npm run mobile:start
```

### ❌ Porta 8081 em uso (Expo)
```bash
# Use outra porta
npx expo start --port 8082
```

## 📞 Próximos Passos

1. **Leia a documentação:**
   - `README.md` - Overview
   - `ESTRUTURA.md` - Estrutura detalhada
   - `backend/README.md` - Backend docs
   - `mobile/README_ESTRUTURA.md` - Mobile docs

2. **Explore o código:**
   - Backend: `backend/src/services/`
   - Mobile: `mobile/app/` (rotas) e `mobile/components/`

3. **Rode os testes:**
   ```bash
   npm run backend:test
   ```

4. **Inicie o desenvolvimento:**
   ```bash
   npm run mobile:start    # Frontend
   npm run backend:dev     # Backend (outro terminal)
   ```

## 🤝 Workflow de Desenvolvimento

1. **Crie uma branch:**
   ```bash
   git checkout -b feat/RF2-cadastro-veiculo
   ```

2. **Faça as mudanças**

3. **Rode testes:**
   ```bash
   npm run backend:test
   ```

4. **Commit e push:**
   ```bash
   git add .
   git commit -m "feat(RF2): cadastro de veículos"
   git push origin feat/RF2-cadastro-veiculo
   ```

5. **Abra um Pull Request**

## 📊 Stack Rápido

| Tecnologia | Uso | Versão |
|------------|-----|--------|
| Node.js | Backend runtime | 18+ |
| Express | Web framework | 4.18 |
| React Native | Mobile app | 0.81 |
| Expo | Mobile tooling | 54.0 |
| TypeScript | Type safety | 5.9 |
| Jest | Testing | 29.7 |
| Axios | HTTP client | 1.6 |
| PostgreSQL | Database | (próximo) |
| Firebase | Chat/Notifs | (próximo) |

## 🆘 Precisa de Ajuda?

- 📖 Leia `README.md` e `ESTRUTURA.md`
- 🔍 Veja os testes em `backend/__tests__/`
- 🤖 Consulte `.copilotcustominstructions`
- 💬 Abra uma issue ou discussion

---

**Bom desenvolvimento! 🚀**
