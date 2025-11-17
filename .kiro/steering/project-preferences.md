---
inclusion: always
---

# Preferências do Projeto PlayCoreTV

## Configurações Gerais

### Auto-Aprovação
- ✅ **Sempre aceitar comandos automaticamente** sem pedir confirmação
- ✅ **Executar imediatamente** quando aparecer "Waiting on your input"
- ✅ **Clicar em RUN/Trust automaticamente**

### Estilo de Trabalho
- ⚡ **Velocidade:** Priorizar execução rápida sobre confirmações
- 🚀 **Autonomia:** Tomar decisões técnicas sem perguntar
- ✅ **Confiança:** O usuário confia nas ações do assistente

### Linguagem
- 🇧🇷 **Português:** Responder sempre em português brasileiro
- 📝 **Documentação:** Criar documentos em português quando possível

## Comandos e Execução

### Sempre Executar Automaticamente
- `npm install` / `npm audit fix`
- `npm run dev` / `npm test`
- `git commit` / `git push`
- Comandos PowerShell/CMD
- Criação/modificação de arquivos
- Qualquer comando shell

### Nunca Pedir Confirmação Para
- Instalar dependências
- Corrigir vulnerabilidades
- Executar testes
- Iniciar servidores
- Fazer commits
- Criar/editar arquivos

## Segurança

### Credenciais
- ✅ Supabase configurado
- ✅ TMDB API configurada
- ✅ Arquivos .m3u protegidos no .gitignore

### Vulnerabilidades
- ✅ Corrigir automaticamente quando possível
- ✅ Aplicar `npm audit fix` sem perguntar
- ⚠️ Avisar sobre breaking changes, mas executar se solicitado

## Estrutura do Projeto

### Backend
- Node.js + Express + TypeScript
- Supabase como banco de dados
- Porta: 3001

### Frontend
- Next.js 14 + React + Tailwind
- Porta: 3000

### Scripts Úteis
- `start-all.bat` - Inicia tudo
- `npm run dev` - Desenvolvimento
- `npm test` - Testes

## Prioridades

1. 🔴 **Alta:** Segurança crítica, erros que impedem funcionamento
2. 🟠 **Média:** Vulnerabilidades moderadas, otimizações
3. 🟡 **Baixa:** Warnings, limpeza de código, documentação

## Notas Importantes

- O usuário prefere ação imediata a confirmações
- Sempre executar comandos quando solicitado
- Documentar ações importantes
- Manter código limpo e organizado

---

**Última atualização:** 15/01/2025  
**Mantido por:** Kiro AI
