# 🔒 Proxy Backend Configurado

**Data:** 17/11/2025  
**Status:** ✅ Implementado

---

## 🎯 Problema Resolvido

**Erro:** `net::ERR_CERT_AUTHORITY_INVALID`  
**Causa:** Servidor de stream usando HTTPS com certificado SSL inválido  
**Solução:** Proxy do backend faz a requisição e retorna para o frontend

---

## 🛠️ Como Funciona

### Antes (Erro)
```
Frontend → https://195.181.162.138/stream.m3u8 ❌
         (Certificado SSL inválido)
```

### Agora (Funciona)
```
Frontend → Backend Proxy → https://195.181.162.138/stream.m3u8 ✅
                          (Backend aceita certificado inválido)
         ← Backend Proxy ← Stream
```

---

## 📝 Código Implementado

### Frontend (VideoPlayer.tsx)
```typescript
// Usar proxy do backend para URLs HTTPS com certificados inválidos
const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const streamUrl = url.startsWith('https://') 
  ? `${backendUrl}/api/stream-proxy?url=${encodeURIComponent(url)}`
  : url;

console.log('🔄 Usando proxy do backend para stream seguro');

const player = new Clappr.Player({
  source: streamUrl, // URL do proxy
  // ...
});
```

### Backend (stream-proxy.routes.ts)
Já estava implementado! ✅

---

## ⚙️ Configuração Necessária

### 1. Variável de Ambiente (Frontend)
```env
NEXT_PUBLIC_API_URL=https://seu-backend.vercel.app
```

**Onde configurar:**
- Vercel Dashboard → Projeto Frontend → Settings → Environment Variables
- Adicionar: `NEXT_PUBLIC_API_URL` = URL do backend

### 2. Backend Deployado
O backend precisa estar no ar para o proxy funcionar.

**Opções:**
1. Deploy na Vercel (recomendado)
2. Deploy no Heroku
3. Deploy no Railway
4. Servidor próprio

---

## 🚀 Próximos Passos

### 1. Deploy do Backend
```bash
cd backend
vercel --prod
```

### 2. Configurar Variável no Frontend
1. Ir em: https://vercel.com/lastdancenc/frontend/settings/environment-variables
2. Adicionar:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://backend-xxx.vercel.app` (URL do backend deployado)
   - Environment: Production

### 3. Redeploy do Frontend
```bash
cd frontend
vercel --prod
```

---

## 🧪 Como Testar

### Desenvolvimento (Local)
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Produção (Vercel)
```env
NEXT_PUBLIC_API_URL=https://backend-xxx.vercel.app
```

**Teste:**
1. Abrir TV ao Vivo
2. Clicar em canal com HTTPS
3. Verificar console:
   ```
   🎬 Carregando stream...
   🔄 Usando proxy do backend para stream seguro
   ✅ Stream carregado com sucesso
   ```

---

## 📊 Fluxo Completo

```
1. Usuário clica no canal
   ↓
2. Frontend detecta URL HTTPS
   ↓
3. Frontend usa proxy: /api/stream-proxy?url=...
   ↓
4. Backend recebe requisição
   ↓
5. Backend faz requisição HTTPS (aceita cert inválido)
   ↓
6. Backend retorna stream para frontend
   ↓
7. Clappr reproduz stream
   ↓
8. ✅ Funcionando!
```

---

## ⚠️ Importante

### URLs HTTP
- **Não usam proxy** (funcionam direto)
- Clappr aceita HTTP sem problemas

### URLs HTTPS
- **Usam proxy** (certificados inválidos)
- Backend faz a requisição
- Mais seguro e confiável

---

## 🎯 Status Atual

- ✅ Frontend: Deployado
- ⚠️ Backend: Precisa ser deployado
- ⚠️ Variável: Precisa ser configurada

**Próximo passo:** Deploy do backend na Vercel

---

**URL Frontend:** https://frontend-1oqrpw8qy-lastdancenc.vercel.app  
**URL Backend:** (Aguardando deploy)
