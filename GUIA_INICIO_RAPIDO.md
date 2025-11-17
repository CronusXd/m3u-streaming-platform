# 🚀 Guia de Início Rápido - PlayCoreTV

**Status Atual:** ✅ Dependências instaladas | ⚠️ Banco de dados precisa ser configurado

---

## 📋 CHECKLIST DE AÇÕES

### ✅ JÁ FEITO
- [x] Dependências instaladas (root, backend, frontend)
- [x] Arquivos .env criados e configurados
- [x] Vulnerabilidade crítica do Next.js corrigida
- [x] Erros críticos de TypeScript corrigidos
- [x] Arquivos .m3u removidos do repositório

### 🔴 FAZER AGORA (15 minutos)

#### 1. Configurar Banco de Dados Supabase (10 min)

**Passo 1:** Acesse seu projeto Supabase
- URL: https://supabase.com/dashboard/project/nmekiixqqshrnjqjazcd

**Passo 2:** Execute o script SQL principal
1. Vá para **SQL Editor** no menu lateral
2. Clique em **New Query**
3. Copie e cole o conteúdo de: `supabase/migrations/FINAL_SCRIPT_COMPLETO.sql`
4. Clique em **Run** (ou pressione Ctrl+Enter)

**Passo 3:** Execute a função de agrupamento de séries
1. Nova query no SQL Editor
2. Copie e cole: `supabase/migrations/20250115_create_get_series_grouped_function.sql`
3. Clique em **Run**

**Passo 4:** Verificar se as tabelas foram criadas
```sql
-- Execute esta query para verificar
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

Você deve ver estas tabelas:
- ✅ categories
- ✅ channels
- ✅ favorites
- ✅ series
- ✅ watch_history
- ✅ playlists (se existir)

---

#### 2. Testar Conexão com Supabase (2 min)

```bash
# Testar backend
cd backend
npm test
```

**Resultado esperado:** Testes devem passar (pelo menos os principais)

---

#### 3. Iniciar a Aplicação (3 min)

**Opção A: Iniciar tudo junto (RECOMENDADO)**
```bash
# Na raiz do projeto
npm run dev
```

**Opção B: Iniciar separadamente**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

**URLs:**
- 🌐 Frontend: http://localhost:3000
- 🔌 Backend API: http://localhost:3001
- ❤️ Health Check: http://localhost:3001/healthz

---

### 🟡 FAZER DEPOIS (Opcional)

#### 4. Importar Playlist M3U (se tiver uma)

Se você tem uma playlist M3U para importar:

```bash
# Criar arquivo Lista.m3u na raiz (não será commitado)
# Depois executar:
cd backend
npm run sync-m3u-complete
```

**Nota:** O arquivo `.m3u` não será commitado (está no .gitignore)

---

#### 5. Configurar TMDB para Logos (Opcional)

O projeto já tem uma chave TMDB configurada no `.env`:
```
TMDB_API_KEY=50d01ad0e7bde0a9a410a565e91b5cf6
```

Para buscar logos de filmes/séries:
```bash
cd backend
npm run fetch-all-logos
```

---

## 🐛 TROUBLESHOOTING

### Erro: "Supabase connection failed"
**Solução:**
1. Verifique se o projeto Supabase está ativo
2. Confirme as credenciais no `.env`
3. Execute as migrations SQL

### Erro: "Port 3001 already in use"
**Solução:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Ou mude a porta no .env
PORT=3002
```

### Erro: "Cannot find module"
**Solução:**
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
cd backend && npm install
cd ../frontend && npm install
```

### Frontend não carrega
**Solução:**
```bash
cd frontend
rm -rf .next
npm run dev
```

---

## 📊 VERIFICAÇÃO DE SAÚDE

### Backend está funcionando?
```bash
curl http://localhost:3001/healthz
```

**Resposta esperada:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T...",
  "uptime": 123.45,
  "database": "connected"
}
```

### Frontend está funcionando?
Abra: http://localhost:3000

Você deve ver a página de login/cadastro do PlayCoreTV

---

## 🎯 PRÓXIMOS PASSOS APÓS INICIAR

1. **Criar uma conta** no frontend
2. **Fazer login**
3. **Importar uma playlist M3U** (se tiver)
4. **Explorar canais, filmes e séries**
5. **Testar o player de vídeo**

---

## 📚 DOCUMENTAÇÃO ADICIONAL

- **README Principal:** `README.md`
- **Auditoria de Segurança:** `AUDITORIA_SEGURANCA.md`
- **Arquitetura Backend:** `backend/ARCHITECTURE.md`
- **Guia de Sincronização:** `backend/SYNC_GUIDE.md`
- **Setup TMDB:** `TMDB_SETUP.md`

---

## 🆘 PRECISA DE AJUDA?

Se encontrar problemas:
1. Verifique os logs do backend/frontend
2. Consulte `AUDITORIA_SEGURANCA.md`
3. Verifique se todas as migrations SQL foram executadas
4. Confirme que as credenciais do Supabase estão corretas

---

**Última atualização:** 15/01/2025  
**Status:** ✅ Pronto para iniciar após configurar banco de dados
