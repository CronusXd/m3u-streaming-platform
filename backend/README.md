# PlayCoreTV - Backend

Backend API for PlayCoreTV built with Node.js, TypeScript, and Express.

## 🚀 Quick Start

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Configure Supabase credentials in `.env`

4. Run development server:
```bash
npm run dev
```

## 🔄 M3U Sync (Novo!)

Sistema de sincronização automática que:
- ✅ Atualiza o banco de dados diariamente
- ✅ Elimina duplicatas (substitui ao invés de acumular)
- ✅ Agrupa episódios dentro das séries

### Setup Rápido

```bash
# Linux/Mac
./scripts/setup-sync.sh

# Windows
scripts\setup-sync.bat
```

### Execução Manual

```bash
npm run sync-m3u
```

### Documentação Completa

- 📖 [SYNC_GUIDE.md](./SYNC_GUIDE.md) - Guia completo
- 📖 [README_SYNC.md](./README_SYNC.md) - Quick start
- 📖 [SQL_QUERIES.md](./SQL_QUERIES.md) - Queries úteis

## 📦 Scripts Disponíveis

### Desenvolvimento
```bash
npm run dev              # Servidor de desenvolvimento
npm run build            # Build para produção
npm start                # Iniciar servidor (produção)
```

### Testes
```bash
npm test                 # Executar testes
npm run test:watch       # Testes em modo watch
npm run test:ci          # Testes com coverage (CI)
```

### Qualidade de Código
```bash
npm run lint             # Verificar lint
npm run lint:fix         # Corrigir problemas de lint
npm run format           # Formatar código
npm run type-check       # Verificar tipos TypeScript
```

### Sincronização M3U
```bash
npm run sync-m3u         # Sincronizar M3U uma vez
npm run schedule-sync    # Iniciar agendador automático
```

## 🗄️ Estrutura do Projeto

```
backend/
├── src/
│   ├── clients/         # Clientes externos (Supabase)
│   ├── errors/          # Classes de erro customizadas
│   ├── middleware/      # Middlewares Express
│   ├── parsers/         # Parsers (M3U, Series Grouper)
│   ├── routes/          # Rotas da API
│   ├── schemas/         # Schemas de validação (Zod)
│   ├── scripts/         # Scripts utilitários (sync, schedule)
│   ├── services/        # Lógica de negócio
│   ├── types/           # Tipos TypeScript
│   └── index.ts         # Entry point
├── scripts/             # Scripts de setup
├── logs/                # Logs (gerado automaticamente)
├── dist/                # Build output
└── tests/               # Testes
```

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Server
NODE_ENV=development
PORT=3001

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key

# M3U Sync (Novo!)
M3U_SYNC_URL=http://your-m3u-url.com/playlist.m3u
SYNC_TIME_HOUR=3
SYNC_INTERVAL_HOURS=24

# JWT
JWT_SECRET=your-secret

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## 🚀 Deploy

### PM2 (Recomendado)

```bash
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Docker

```bash
docker build -t playcoretv-backend .
docker run -p 3001:3001 --env-file .env playcoretv-backend
```

## 📚 API Endpoints

### Health
- `GET /health` - Health check

### Playlists
- `GET /api/playlists` - Listar playlists
- `POST /api/playlists` - Criar playlist
- `GET /api/playlists/:id` - Obter playlist
- `DELETE /api/playlists/:id` - Deletar playlist
- `POST /api/playlists/:id/refresh` - Atualizar playlist

### Channels
- `GET /api/channels` - Listar canais
- `GET /api/channels/:id` - Obter canal
- `GET /api/search` - Buscar canais

### Favorites
- `GET /api/favorites` - Listar favoritos
- `POST /api/favorites` - Adicionar favorito
- `DELETE /api/favorites/:id` - Remover favorito

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Testes específicos
npm test m3u-parser
npm test series-grouper
npm test playlist.service

# Coverage
npm run test:ci
```

## 📝 Logs

Logs são salvos em:
- `logs/api-out.log` - Logs da API
- `logs/api-error.log` - Erros da API
- `logs/sync-out.log` - Logs de sincronização
- `logs/sync-error.log` - Erros de sincronização

## 🐛 Troubleshooting

### Duplicatas no banco?
```bash
npm run sync-m3u  # Vai limpar e reinserir
```

### Episódios não agrupam?
Veja [SYNC_GUIDE.md](./SYNC_GUIDE.md#troubleshooting)

### Queries úteis
Veja [SQL_QUERIES.md](./SQL_QUERIES.md)

## 📄 Licença

MIT
