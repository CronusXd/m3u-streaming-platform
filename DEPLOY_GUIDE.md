# 🚀 Guia de Deploy

## Arquitetura Recomendada

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vercel)                        │
│  - Next.js                                                  │
│  - Interface do usuário                                     │
│  - Conecta direto no Supabase                              │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ API Calls
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Render/Railway)                 │
│  - API REST (Express)                                       │
│  - Script de Sincronização (Cron)                          │
│  - Conecta no Supabase                                     │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ Database
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE                                 │
│  - PostgreSQL                                               │
│  - Auth                                                     │
│  - Storage                                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## Opção 1: Vercel (Frontend) + Render (Backend) ⭐ RECOMENDADO

### Frontend na Vercel

```bash
# 1. Instalar Vercel CLI
npm i -g vercel

# 2. Deploy do frontend
cd frontend
vercel

# 3. Configurar variáveis de ambiente na Vercel Dashboard:
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
NEXT_PUBLIC_API_URL=https://seu-backend.onrender.com
```

### Backend no Render

1. Acesse [render.com](https://render.com)
2. Conecte seu repositório GitHub
3. Crie um **Web Service**:
   - **Build Command:** `cd backend && npm install && npm run build`
   - **Start Command:** `cd backend && npm start`
   - **Environment:** Node
   
4. Adicione variáveis de ambiente:
   ```
   SUPABASE_URL=https://xxx.supabase.co
   SUPABASE_SERVICE_KEY=sua-service-key
   SUPABASE_ANON_KEY=sua-anon-key
   M3U_SYNC_URL=http://play.dnsrot.vip/get.php?username=X&password=Y&type=m3u_plus&output=m3u8
   ```

5. Crie um **Cron Job** no Render:
   - **Command:** `cd backend && npm run sync-m3u`
   - **Schedule:** `0 3 * * *` (todo dia às 3h)

---

## Opção 2: Vercel (Frontend) + Railway (Backend)

### Frontend na Vercel
(mesmo processo acima)

### Backend no Railway

1. Acesse [railway.app](https://railway.app)
2. Crie um novo projeto
3. Conecte seu repositório
4. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`

5. Adicione variáveis de ambiente (mesmas acima)

6. Para o Cron Job, adicione no `package.json`:
   ```json
   "scripts": {
     "start": "node dist/index.js & npm run schedule-sync:build"
   }
   ```

---

## Opção 3: GitHub Actions (Sync) + Vercel (Frontend + API)

### Frontend + API na Vercel
(mesmo processo acima, mas incluindo o backend)

### Sync via GitHub Actions

Crie `.github/workflows/sync-m3u.yml`:

```yaml
name: Sync M3U Daily

on:
  schedule:
    - cron: '0 3 * * *'  # Todo dia às 3h UTC
  workflow_dispatch:  # Permite execução manual

jobs:
  sync:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd backend
          npm install
      
      - name: Run sync
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          M3U_SYNC_URL: ${{ secrets.M3U_SYNC_URL }}
        run: |
          cd backend
          npm run sync-m3u
```

Adicione os secrets no GitHub:
- Settings > Secrets > Actions
- Adicione: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `M3U_SYNC_URL`

---

## Opção 4: Tudo em um VPS

### DigitalOcean / Linode / Vultr

```bash
# 1. Conectar no servidor
ssh root@seu-ip

# 2. Instalar Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Instalar PM2
npm install -g pm2

# 4. Clonar repositório
git clone https://github.com/seu-usuario/playcoretv.git
cd playcoretv

# 5. Configurar backend
cd backend
cp .env.example .env
nano .env  # Editar variáveis

# 6. Instalar e buildar
npm install
npm run build

# 7. Iniciar com PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 8. Configurar frontend
cd ../frontend
npm install
npm run build

# 9. Instalar Nginx
sudo apt install nginx

# 10. Configurar Nginx (ver abaixo)
```

**Nginx config** (`/etc/nginx/sites-available/playcoretv`):
```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 📊 Comparação de Opções

| Opção | Custo | Facilidade | Cron Job | Recomendado |
|-------|-------|------------|----------|-------------|
| Vercel + Render | Gratuito | ⭐⭐⭐⭐⭐ | ✅ Nativo | ✅ SIM |
| Vercel + Railway | Gratuito | ⭐⭐⭐⭐⭐ | ✅ Nativo | ✅ SIM |
| Vercel + GitHub Actions | Gratuito | ⭐⭐⭐⭐ | ✅ GitHub | ✅ SIM |
| VPS (DigitalOcean) | $4/mês | ⭐⭐⭐ | ✅ PM2 | ⚠️ Avançado |
| Tudo na Vercel | Gratuito | ⭐⭐ | ❌ Não | ❌ NÃO |

---

## ✅ Recomendação Final

**Para iniciantes:** Vercel (Frontend) + Render (Backend + Cron)

**Vantagens:**
- ✅ 100% gratuito
- ✅ Fácil de configurar
- ✅ Cron job nativo
- ✅ SSL automático
- ✅ Deploy automático via Git
- ✅ Logs fáceis de ver

**Desvantagens:**
- ⚠️ Render pode dormir após 15min de inatividade (plano gratuito)
- ⚠️ Limite de 750 horas/mês no plano gratuito

---

## 🚀 Próximos Passos

1. ✅ Aplicar migration no Supabase (via SQL Editor)
2. ✅ Testar sync local: `npm run sync-m3u`
3. ✅ Escolher opção de deploy
4. ✅ Configurar variáveis de ambiente
5. ✅ Fazer deploy
6. ✅ Testar em produção

---

**Criado em:** 2024-01-15  
**Atualizado em:** 2024-01-15
