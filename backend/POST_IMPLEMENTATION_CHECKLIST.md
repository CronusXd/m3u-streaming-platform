# ✅ Checklist Pós-Implementação

Use este checklist para garantir que tudo está funcionando corretamente.

## 📋 Fase 1: Configuração Inicial

### 1.1 Banco de Dados

- [ ] Aplicar migration de séries
  ```bash
  cd supabase
  supabase db push
  ```

- [ ] Verificar que as tabelas foram criadas
  ```sql
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('series', 'episodes');
  ```

- [ ] Verificar índices
  ```sql
  SELECT indexname 
  FROM pg_indexes 
  WHERE tablename IN ('series', 'episodes');
  ```

### 1.2 Variáveis de Ambiente

- [ ] Copiar `.env.example` para `.env`
  ```bash
  cd backend
  cp .env.example .env
  ```

- [ ] Configurar variáveis obrigatórias:
  - [ ] `M3U_SYNC_URL`
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_KEY`

- [ ] Configurar variáveis opcionais (se necessário):
  - [ ] `SYNC_TIME_HOUR` (padrão: 3)
  - [ ] `SYNC_INTERVAL_HOURS` (padrão: 24)

### 1.3 Dependências

- [ ] Instalar dependências
  ```bash
  npm install
  ```

- [ ] Compilar TypeScript
  ```bash
  npm run build
  ```

- [ ] Verificar que não há erros de compilação

## 📋 Fase 2: Testes

### 2.1 Testes Unitários

- [ ] Executar testes
  ```bash
  npm test
  ```

- [ ] Verificar que todos os testes passam
  - [ ] `m3u-parser.test.ts`
  - [ ] `series-grouper.test.ts`
  - [ ] `playlist.service.test.ts`

### 2.2 Teste de Sincronização Manual

- [ ] Executar sincronização manual
  ```bash
  npm run sync-m3u
  ```

- [ ] Verificar logs:
  - [ ] Download do M3U bem-sucedido
  - [ ] Parse completo
  - [ ] Agrupamento de séries
  - [ ] Limpeza de dados antigos
  - [ ] Inserção de novos dados
  - [ ] Estatísticas exibidas

- [ ] Verificar banco de dados:
  ```sql
  -- Contar registros
  SELECT 
    (SELECT COUNT(*) FROM channels) as canais,
    (SELECT COUNT(*) FROM series) as series,
    (SELECT COUNT(*) FROM episodes) as episodios;
  ```

- [ ] Verificar que não há duplicatas:
  ```sql
  -- Buscar duplicatas
  SELECT name, COUNT(*) as count
  FROM channels
  GROUP BY name
  HAVING COUNT(*) > 1;
  ```

### 2.3 Teste de Agrupamento de Séries

- [ ] Verificar que episódios foram agrupados:
  ```sql
  -- Ver séries criadas
  SELECT name, total_episodes 
  FROM series 
  ORDER BY total_episodes DESC 
  LIMIT 10;
  ```

- [ ] Verificar episódios de uma série:
  ```sql
  -- Ver episódios de uma série
  SELECT s.name, e.season, e.episode, e.name as episode_name
  FROM series s
  JOIN episodes e ON e.series_id = s.id
  WHERE s.name LIKE '%Breaking Bad%'
  ORDER BY e.season, e.episode;
  ```

- [ ] Confirmar que episódios estão ordenados corretamente

## 📋 Fase 3: Agendamento Automático

### 3.1 Escolher Método de Agendamento

Escolha UMA das opções abaixo:

#### Opção A: PM2 (Recomendado para Produção)

- [ ] Instalar PM2 globalmente
  ```bash
  npm install -g pm2
  ```

- [ ] Iniciar com PM2
  ```bash
  pm2 start ecosystem.config.js
  ```

- [ ] Verificar que está rodando
  ```bash
  pm2 list
  ```

- [ ] Salvar configuração
  ```bash
  pm2 save
  ```

- [ ] Configurar startup automático
  ```bash
  pm2 startup
  # Executar o comando que o PM2 mostrar
  ```

- [ ] Testar logs
  ```bash
  pm2 logs m3u-sync-scheduler
  ```

#### Opção B: Cron (Linux/Mac)

- [ ] Editar crontab
  ```bash
  crontab -e
  ```

- [ ] Adicionar linha (ajustar caminho):
  ```
  0 3 * * * cd /caminho/para/backend && npm run sync-m3u >> /var/log/m3u-sync.log 2>&1
  ```

- [ ] Salvar e sair

- [ ] Verificar que foi adicionado
  ```bash
  crontab -l
  ```

- [ ] Criar arquivo de log
  ```bash
  sudo touch /var/log/m3u-sync.log
  sudo chmod 666 /var/log/m3u-sync.log
  ```

#### Opção C: Task Scheduler (Windows)

- [ ] Abrir "Agendador de Tarefas"

- [ ] Criar Tarefa Básica

- [ ] Configurar:
  - [ ] Nome: "Sincronização M3U PlayCoreTV"
  - [ ] Gatilho: Diariamente às 3:00
  - [ ] Ação: Iniciar programa
    - [ ] Programa: `npm`
    - [ ] Argumentos: `run sync-m3u`
    - [ ] Iniciar em: `C:\caminho\para\backend`

- [ ] Testar execução manual

#### Opção D: Script Node.js

- [ ] Iniciar agendador
  ```bash
  npm run schedule-sync -- --now
  ```

- [ ] Verificar que executou imediatamente

- [ ] Confirmar que agendou próxima execução

- [ ] Manter processo rodando (usar PM2 ou screen/tmux)

### 3.2 Verificar Agendamento

- [ ] Confirmar horário da próxima execução

- [ ] Documentar método escolhido

- [ ] Configurar alertas (opcional)

## 📋 Fase 4: Monitoramento

### 4.1 Logs

- [ ] Verificar que logs estão sendo gerados:
  - [ ] `logs/sync-out.log`
  - [ ] `logs/sync-error.log`

- [ ] Configurar rotação de logs (opcional)

- [ ] Testar visualização de logs em tempo real

### 4.2 Primeira Execução Agendada

- [ ] Aguardar primeira execução automática

- [ ] Verificar logs da execução

- [ ] Confirmar que dados foram atualizados

- [ ] Verificar estatísticas:
  - [ ] Duração da execução
  - [ ] Registros removidos
  - [ ] Registros inseridos
  - [ ] Erros (se houver)

### 4.3 Alertas (Opcional)

- [ ] Configurar notificação por email em caso de erro

- [ ] Configurar webhook para Slack/Discord

- [ ] Configurar monitoramento de uptime

## 📋 Fase 5: Validação Final

### 5.1 Verificar Duplicatas

- [ ] Executar sincronização 2-3 vezes manualmente
  ```bash
  npm run sync-m3u
  npm run sync-m3u
  npm run sync-m3u
  ```

- [ ] Verificar que o total de registros permanece estável
  ```sql
  SELECT COUNT(*) FROM channels;
  -- Deve ser ~160k, não 320k ou 480k
  ```

- [ ] Confirmar que não há acúmulo

### 5.2 Verificar Séries

- [ ] Buscar uma série conhecida
  ```sql
  SELECT * FROM series WHERE name LIKE '%Breaking Bad%';
  ```

- [ ] Verificar episódios da série
  ```sql
  SELECT * FROM episodes 
  WHERE series_id = 'id-da-serie'
  ORDER BY season, episode;
  ```

- [ ] Confirmar que episódios estão agrupados corretamente

### 5.3 Performance

- [ ] Medir tempo de execução
  - [ ] Deve ser < 2 minutos para 160k registros

- [ ] Verificar uso de memória
  - [ ] Deve ser < 500MB durante execução

- [ ] Verificar uso de CPU
  - [ ] Picos são normais durante inserção

### 5.4 Frontend (se aplicável)

- [ ] Verificar que canais aparecem no frontend

- [ ] Verificar que séries aparecem agrupadas

- [ ] Testar busca de canais

- [ ] Testar busca de séries

- [ ] Verificar que não há canais duplicados na UI

## 📋 Fase 6: Documentação

### 6.1 Documentar Configuração

- [ ] Anotar método de agendamento escolhido

- [ ] Documentar horário de execução

- [ ] Documentar credenciais (em local seguro)

- [ ] Criar runbook para troubleshooting

### 6.2 Treinar Equipe

- [ ] Mostrar como executar sincronização manual

- [ ] Mostrar como ver logs

- [ ] Mostrar como verificar status

- [ ] Mostrar queries SQL úteis

### 6.3 Backup

- [ ] Configurar backup automático do banco

- [ ] Testar restore de backup

- [ ] Documentar procedimento de backup

## 📋 Fase 7: Manutenção Contínua

### 7.1 Monitoramento Semanal

- [ ] Verificar logs de erro

- [ ] Verificar estatísticas de sincronização

- [ ] Verificar crescimento do banco de dados

- [ ] Verificar performance

### 7.2 Manutenção Mensal

- [ ] Revisar e limpar logs antigos

- [ ] Verificar espaço em disco

- [ ] Atualizar dependências (se necessário)

- [ ] Revisar e otimizar queries

### 7.3 Troubleshooting

- [ ] Ler [SYNC_GUIDE.md](./SYNC_GUIDE.md#troubleshooting)

- [ ] Ler [SQL_QUERIES.md](./SQL_QUERIES.md)

- [ ] Ter acesso ao [ARCHITECTURE.md](./ARCHITECTURE.md)

## ✅ Checklist Completo!

Quando todos os itens estiverem marcados:

- [ ] Sistema está funcionando corretamente
- [ ] Duplicatas foram eliminadas
- [ ] Séries estão agrupadas
- [ ] Sincronização automática está ativa
- [ ] Monitoramento está configurado
- [ ] Equipe está treinada
- [ ] Documentação está completa

## 🎉 Parabéns!

Seu sistema de sincronização automática está pronto para produção!

---

**Data de Implementação:** ___/___/______  
**Responsável:** _____________________  
**Método de Agendamento:** _____________________  
**Horário de Execução:** _____________________  

---

## 📞 Suporte

Em caso de problemas:

1. Consultar [SYNC_GUIDE.md](./SYNC_GUIDE.md)
2. Verificar logs em `logs/`
3. Executar queries de diagnóstico em [SQL_QUERIES.md](./SQL_QUERIES.md)
4. Revisar arquitetura em [ARCHITECTURE.md](./ARCHITECTURE.md)
