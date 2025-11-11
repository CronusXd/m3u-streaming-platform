# 🎬 M3U Streaming Platform

Plataforma profissional para gerenciar e reproduzir playlists M3U com suporte a HLS, construída com Node.js, Next.js e Supabase.

## ✨ Features

- 📺 **Player HLS** - Reproduza streams HLS diretamente no navegador com hls.js
- 🔐 **Autenticação** - Sistema completo com Supabase Auth (email/password + magic link)
- ⭐ **Favoritos** - Salve seus canais favoritos para acesso rápido
- 🔍 **Busca** - Encontre canais facilmente com busca em tempo real
- 📱 **Responsivo** - Interface moderna que funciona em qualquer dispositivo
- 🌙 **Dark Mode** - Suporte completo a tema escuro
- 🔒 **Seguro** - Rate limiting, validação de inputs, RLS policies
- 📊 **Observabilidade** - Health checks, logs estruturados, métricas Prometheus

## 🏗️ Arquitetura

```
m3u-streaming-platform/
├── backend/          # API REST (Node.js + Express + TypeScript)
├── frontend/         # Web App (Next.js 14 + React + Tailwind)
├── infra/           # Migrations SQL, Docker, CI/CD
└── docs/            # Documentação
```

## 🚀 Quick Start

### Pré-requisitos

- Node.js 18+
- npm ou yarn
- Conta no Supabase (gratuita)

### 1. Clone o repositório

```bash
git clone <repo-url>
cd m3u-streaming-platform
```

### 2. Configure o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá para **SQL Editor** e execute:
   - `infra/migrations/001_initial_schema.sql`
   - `infra/migrations/002_rls_policies.sql`
3. Copie as API keys de **Settings > API**

### 3. Configure as variáveis de ambiente

**IMPORTANTE:** Todas as variáveis ficam no `.env` da RAIZ!

```bash
# Copiar template
copy .env.example .env

# Editar com suas credenciais do Supabase
notepad .env
```

**Edite `.env` na raiz:**
```env
# Supabase
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-key-aqui
SUPABASE_ANON_KEY=sua-anon-key-aqui

# JWT
JWT_SECRET=qualquer-string-aleatoria

# Frontend (mesmas credenciais)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Setup automático

```bash
# Este comando faz TUDO:
# - Sincroniza variáveis de ambiente
# - Instala dependências do backend e frontend
npm run setup
```

### 5. Execute os testes

```bash
# Testar tudo automaticamente
TestAll.bat

# OU executar testes manualmente
cd backend
npm test
```

### 6. Inicie os servidores

```bash
# Opção 1: Iniciar tudo automaticamente (RECOMENDADO)
npm run dev

# Opção 2: Iniciar manualmente
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 7. Acesse a aplicação

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/healthz

## 🧪 Testes

### Verificação Rápida

```bash
# Windows
test-setup.bat

# Linux/Mac
chmod +x test-setup.sh
./test-setup.sh
```

### Testes Unitários

```bash
cd backend
npm test                 # Executar todos os testes
npm run test:watch       # Modo watch
npm run test:ci          # Com cobertura
```

### Testes de Integração

```bash
cd backend
npm test src/routes/     # Testes de API
```

## 📚 Documentação

- [Quick Test Guide](QUICK_TEST_GUIDE.md) - Guia rápido de testes
- [Testing Checklist](TESTING_CHECKLIST.md) - Checklist completo de testes
- [Backend README](backend/README.md) - Documentação do backend
- [Frontend README](frontend/README.md) - Documentação do frontend
- [Infra README](infra/README.md) - Setup do Supabase e migrations

## 🛠️ Stack Tecnológica

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Validation:** Zod
- **Testing:** Jest + Supertest
- **Logging:** Pino
- **Security:** Helmet, CORS, Rate Limiting

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **UI:** React 18 + Tailwind CSS
- **Auth:** Supabase Auth Helpers
- **Player:** hls.js
- **State:** React Context + Hooks
- **Testing:** Jest + React Testing Library

### Infrastructure
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **Container:** Docker + Docker Compose
- **CI/CD:** GitHub Actions
- **Deploy:** Vercel (Frontend) + Render/Fly.io (Backend)

## 📦 Scripts Disponíveis

### Backend

```bash
npm run dev          # Desenvolvimento com hot reload
npm run build        # Build para produção
npm start            # Iniciar produção
npm test             # Executar testes
npm run lint         # Verificar código
npm run type-check   # Verificar TypeScript
```

### Frontend

```bash
npm run dev          # Desenvolvimento
npm run build        # Build para produção
npm start            # Iniciar produção
npm test             # Executar testes
npm run lint         # Verificar código
npm run type-check   # Verificar TypeScript
```

## 🐳 Docker

### Desenvolvimento

```bash
# Criar .env na raiz
cp .env.example .env

# Iniciar todos os serviços
docker-compose up

# Parar serviços
docker-compose down
```

### Produção

```bash
# Build das imagens
docker-compose -f docker-compose.prod.yml build

# Iniciar
docker-compose -f docker-compose.prod.yml up -d
```

## 🔒 Segurança

- ✅ Autenticação JWT via Supabase
- ✅ Row Level Security (RLS) no banco
- ✅ Rate limiting (100 req/min geral, 10 req/min uploads)
- ✅ Validação de inputs com Zod
- ✅ Helmet para security headers
- ✅ CORS configurado
- ✅ Sanitização de logs (sem tokens/senhas)
- ✅ HTTPS obrigatório em produção

## 📊 Observabilidade

### Health Checks

```bash
# Health check completo
curl http://localhost:3001/healthz

# Readiness
curl http://localhost:3001/readyz

# Liveness
curl http://localhost:3001/livez
```

### Métricas (Prometheus)

```bash
# Habilitar métricas
export ENABLE_METRICS=true

# Acessar métricas
curl http://localhost:3001/metrics
```

### Logs

Logs estruturados em JSON (produção) ou pretty (desenvolvimento):

```bash
# Ver logs do backend
cd backend
npm run dev

# Ver logs do Docker
docker-compose logs -f backend
```

## 🚢 Deploy

### Frontend (Vercel)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel
```

### Backend (Render/Fly.io)

Ver [infra/README.md](infra/README.md) para instruções detalhadas.

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/amazing-feature`)
3. Commit suas mudanças (`git commit -m 'Add amazing feature'`)
4. Push para a branch (`git push origin feature/amazing-feature`)
5. Abra um Pull Request

## 📝 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🐛 Troubleshooting

### Erro: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Erro: "Supabase connection failed"
- Verifique se as variáveis de ambiente estão corretas
- Verifique se o projeto Supabase está ativo
- Verifique se as migrations foram executadas

### Erro: "Port already in use"
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### Frontend não carrega
```bash
cd frontend
rm -rf .next
npm run dev
```

## 📞 Suporte

- 📧 Email: support@example.com
- 💬 Discord: [Link]
- 📖 Docs: [Link]

## 🙏 Agradecimentos

- [Supabase](https://supabase.com) - Backend as a Service
- [Next.js](https://nextjs.org) - React Framework
- [hls.js](https://github.com/video-dev/hls.js) - HLS Player
- [Tailwind CSS](https://tailwindcss.com) - CSS Framework

---

Feito com ❤️ por [Seu Nome]
