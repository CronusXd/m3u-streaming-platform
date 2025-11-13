#!/usr/bin/env node
/**
 * Agendador de Sincronização Automática
 * 
 * Este script executa a sincronização do M3U automaticamente
 * em intervalos configurados (padrão: 1x por dia às 3h da manhã)
 * 
 * Uso:
 * - npm run schedule-sync (mantém rodando)
 * - Ou configure como serviço do sistema (systemd, pm2, etc)
 */

import { config } from 'dotenv';
import { syncM3U } from './sync-m3u';

config();

// Configurações
const SYNC_INTERVAL_HOURS = parseInt(process.env.SYNC_INTERVAL_HOURS || '24', 10);
const SYNC_TIME_HOUR = parseInt(process.env.SYNC_TIME_HOUR || '3', 10); // 3h da manhã

/**
 * Calcula próximo horário de execução
 */
function getNextSyncTime(): Date {
  const now = new Date();
  const next = new Date();
  
  next.setHours(SYNC_TIME_HOUR, 0, 0, 0);
  
  // Se já passou da hora hoje, agendar para amanhã
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  
  return next;
}

/**
 * Calcula tempo até próxima execução em ms
 */
function getTimeUntilNextSync(): number {
  const next = getNextSyncTime();
  return next.getTime() - Date.now();
}

/**
 * Executa sincronização e agenda próxima
 */
async function runScheduledSync() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🕐 Sincronização agendada iniciada: ${new Date().toLocaleString()}`);
  console.log('='.repeat(60));
  
  try {
    await syncM3U();
    console.log('\n✅ Sincronização agendada concluída com sucesso');
  } catch (error) {
    console.error('\n❌ Erro na sincronização agendada:', error);
  }
  
  // Agendar próxima execução
  scheduleNextSync();
}

/**
 * Agenda próxima sincronização
 */
function scheduleNextSync() {
  const msUntilNext = getTimeUntilNextSync();
  const nextTime = getNextSyncTime();
  const hoursUntil = (msUntilNext / (1000 * 60 * 60)).toFixed(1);
  
  console.log(`\n⏰ Próxima sincronização agendada para: ${nextTime.toLocaleString()}`);
  console.log(`   (em ${hoursUntil} horas)`);
  
  setTimeout(runScheduledSync, msUntilNext);
}

/**
 * Inicia o agendador
 */
async function startScheduler() {
  console.log('🚀 Iniciando agendador de sincronização M3U');
  console.log(`⚙️  Configuração:`);
  console.log(`   - Intervalo: A cada ${SYNC_INTERVAL_HOURS}h`);
  console.log(`   - Horário: ${SYNC_TIME_HOUR}:00`);
  
  // Perguntar se quer executar agora
  const args = process.argv.slice(2);
  const runNow = args.includes('--now') || args.includes('-n');
  
  if (runNow) {
    console.log('\n▶️  Executando sincronização imediata...');
    await runScheduledSync();
  } else {
    console.log('\n⏭️  Pulando execução imediata (use --now para executar agora)');
    scheduleNextSync();
  }
  
  // Manter processo vivo
  console.log('\n✨ Agendador ativo. Pressione Ctrl+C para parar.\n');
}

// Tratamento de sinais para shutdown gracioso
process.on('SIGINT', () => {
  console.log('\n\n👋 Encerrando agendador...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Encerrando agendador...');
  process.exit(0);
});

// Iniciar
if (require.main === module) {
  startScheduler().catch((error) => {
    console.error('💥 Erro fatal no agendador:', error);
    process.exit(1);
  });
}

export { startScheduler, runScheduledSync };
