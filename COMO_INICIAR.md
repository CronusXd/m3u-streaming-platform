# 🚀 Como Iniciar o PlayCoreTV

## ✅ CONFIGURAÇÃO COMPLETA!

Todas as variáveis de ambiente estão configuradas corretamente:
- ✅ Backend: `.env` configurado
- ✅ Frontend: `.env.local` configurado
- ✅ Supabase: Credenciais OK

---

## 🎬 INICIAR APLICAÇÃO

### Opção 1: Iniciar Tudo (RECOMENDADO) ⭐

**Clique duas vezes no arquivo:**
```
start-all.bat
```

Isso vai:
- ✅ Abrir 2 janelas de terminal
- ✅ Iniciar backend na porta 3001
- ✅ Iniciar frontend na porta 3000
- ✅ Abrir automaticamente no navegador

### Opção 2: Usar NPM

```bash
npm run dev
```

### Opção 3: Iniciar Separadamente

**Terminal 1 - Backend:**
```bash
start-backend.bat
```
OU
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
start-frontend.bat
```
OU
```bash
cd frontend
npm run dev
```

---

## 🌐 ACESSAR APLICAÇÃO

Após iniciar, acesse:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Health Check:** http://localhost:3001/healthz

---

## ⚠️ IMPORTANTE: CONFIGURAR BANCO DE DADOS

Antes de usar a aplicação, você PRECISA executar as migrations SQL no Supabase:

### Passo 1: Acessar Supabase
https://supabase.com/dashboard/project/nmekiixqqshrnjqjazcd

### Passo 2: Executar SQL
1. Vá em **SQL Editor** → **New Query**
2. Abra `supabase/migrations/FINAL_SCRIPT_COMPLETO.sql`
3. Copie TODO o conteúdo
4. Cole no editor
5. Clique em **Run**

### Passo 3: Executar Função de Séries
1. Nova query
2. Abra `supabase/migrations/20250115_create_get_series_grouped_function.sql`
3. Copie e cole
4. Clique em **Run**

---

## 🎯 PRIMEIRO USO

1. ✅ Execute as migrations SQL (acima)
2. ✅ Inicie a aplicação (`start-all.bat`)
3. ✅ Acesse http://localhost:3000
4. ✅ Clique em "Criar Conta"
5. ✅ Preencha email e senha
6. ✅ Faça login
7. ✅ Explore o dashboard!

---

## 🛑 PARAR APLICAÇÃO

### Se usou start-all.bat:
- Feche as janelas de terminal que abriram

### Se usou npm run dev:
- Pressione `Ctrl + C` no terminal

---

## 🐛 PROBLEMAS?

### "Port 3001 already in use"
```bash
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### "Cannot connect to Supabase"
- Execute as migrations SQL no Supabase
- Verifique se o projeto está ativo

### Frontend não carrega
```bash
cd frontend
rmdir /s /q .next
npm run dev
```

---

## 📚 MAIS INFORMAÇÕES

- **Guia Completo:** `GUIA_INICIO_RAPIDO.md`
- **Próximos Passos:** `PROXIMOS_PASSOS.md`
- **Auditoria:** `AUDITORIA_SEGURANCA.md`
- **README:** `README.md`

---

## ✨ PRONTO!

Execute `start-all.bat` e comece a usar o PlayCoreTV! 🎉
