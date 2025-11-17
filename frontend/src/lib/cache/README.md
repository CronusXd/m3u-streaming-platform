# Sistema de Cache IndexedDB

Sistema completo de cache para aplicações web, capaz de armazenar 60-80MB de dados com download progressivo, priorização inteligente e expiração automática.

## 📋 Índice

- [Características](#características)
- [Instalação](#instalação)
- [Uso Básico](#uso-básico)
- [API Completa](#api-completa)
- [Configuração](#configuração)
- [Eventos](#eventos)
- [Exemplos](#exemplos)
- [Troubleshooting](#troubleshooting)

## ✨ Características

- ✅ **IndexedDB** com fallback para LocalStorage
- ✅ **Compactação automática** com LZ-String (40-60% de redução)
- ✅ **Chunking automático** para dados grandes (chunks de 5MB)
- ✅ **Download progressivo** com fila de prioridade
- ✅ **Priorização dinâmica** (usuário clica, seção é priorizada)
- ✅ **TTL de 7 dias** com expiração automática
- ✅ **LRU (Least Recently Used)** para limpeza inteligente
- ✅ **Estatísticas** (hits, misses, tamanho, performance)
- ✅ **Sincronização** com verificação de atualizações
- ✅ **Sistema de eventos** para monitoramento
- ✅ **Retry automático** com backoff exponencial

## 📦 Instalação

```javascript
import { CacheManager } from './lib/cache/CacheManager.js';
```

## 🚀 Uso Básico

### Inicialização

```javascript
const cache = new CacheManager();
await cache.init();
```

### Salvar Dados

```javascript
const filmesData = {
  filmes: [
    { id: 1, titulo: 'Filme 1' },
    { id: 2, titulo: 'Filme 2' }
  ]
};

await cache.save('filmes', filmesData);
```

### Carregar Dados

```javascript
const filmes = await cache.load('filmes');

if (filmes) {
  console.log('Cache hit!', filmes);
} else {
  console.log('Cache miss');
}
```

### Smart Loading (Carregar ou Baixar)

```javascript
// Tenta carregar do cache, se não existir, baixa automaticamente
const filmes = await cache.loadOrDownload('filmes', '/api/filmes', 2);
```

## 📚 API Completa

### Inicialização

#### `init()`
Inicializa o sistema de cache.

```javascript
const success = await cache.init();
```

### Operações de Cache

#### `save(section, data, ttlSeconds?)`
Salva dados no cache.

```javascript
await cache.save('filmes', data);
await cache.save('series', data, 86400); // TTL de 1 dia
```

#### `load(section)`
Carrega dados do cache.

```javascript
const data = await cache.load('filmes');
```

#### `exists(section)`
Verifica se uma seção existe.

```javascript
if (await cache.exists('filmes')) {
  console.log('Filmes estão em cache');
}
```

#### `isExpired(section)`
Verifica se uma seção está expirada.

```javascript
if (await cache.isExpired('filmes')) {
  console.log('Cache expirado');
}
```

#### `clear(section)`
Remove uma seção do cache.

```javascript
await cache.clear('filmes');
```

#### `clearAll()`
Remove todas as seções.

```javascript
await cache.clearAll();
```

### Download Progressivo

#### `downloadSection(section, url, priority)`
Adiciona download à fila.

```javascript
await cache.downloadSection('filmes', '/api/filmes', 2); // Alta prioridade
```

#### `prioritizeSection(section)`
Prioriza download de uma seção.

```javascript
// Usuário clicou em "FILMES"
await cache.prioritizeSection('filmes');
```

#### `startBackgroundDownload(sectionsUrls)`
Inicia downloads em background.

```javascript
await cache.startBackgroundDownload({
  filmes: '/api/filmes',
  series: '/api/series',
  canais: '/api/canais'
});
```

#### `loadOrDownload(section, url, priority)`
Carrega do cache ou baixa se necessário.

```javascript
const filmes = await cache.loadOrDownload('filmes', '/api/filmes', 2);
```

### Sincronização

#### `checkForUpdates(section, versionUrl)`
Verifica se há atualizações.

```javascript
const hasUpdates = await cache.checkForUpdates('filmes', '/api/filmes/version');
```

#### `updateSection(section, dataUrl)`
Atualiza uma seção.

```javascript
await cache.updateSection('filmes', '/api/filmes');
```

#### `updateAll(sectionsUrls)`
Atualiza todas as seções.

```javascript
const result = await cache.updateAll({
  filmes: '/api/filmes',
  series: '/api/series'
});
```

### Estatísticas e Informações

#### `getStats()`
Obtém estatísticas do cache.

```javascript
const stats = await cache.getStats();
console.log('Hit Rate:', stats.hitRatePercentage, '%');
console.log('Tamanho:', stats.totalSizeMB, 'MB');
```

#### `getQuota()`
Obtém informações de quota.

```javascript
const quota = await cache.getQuota();
console.log('Usado:', quota.usageMB, 'MB');
console.log('Disponível:', quota.availableMB, 'MB');
```

#### `getSections()`
Lista todas as seções em cache.

```javascript
const sections = await cache.getSections();
```

#### `getInfo()`
Obtém informações completas.

```javascript
const info = await cache.getInfo();
```

### Limpeza

#### `cleanupExpired()`
Remove caches expirados.

```javascript
const removed = await cache.cleanupExpired();
```

#### `cleanupLRU(targetPercentage)`
Remove caches menos usados.

```javascript
await cache.cleanupLRU(0.7); // Limpar até 70% de uso
```

#### `freeSpace(bytesNeeded)`
Libera espaço necessário.

```javascript
const freed = await cache.freeSpace(10 * 1024 * 1024); // 10MB
```

### Eventos

#### `on(event, callback)`
Registra listener de evento.

```javascript
cache.on('cache:save', (data) => {
  console.log('Cache salvo:', data.section);
});
```

#### `off(event, callback)`
Remove listener de evento.

```javascript
cache.off('cache:save', handler);
```

## ⚙️ Configuração

### Configuração Padrão

```javascript
const cache = new CacheManager({
  dbName: 'AppCache',
  dbVersion: 1,
  defaultTTL: 604800, // 7 dias
  chunkSize: 5 * 1024 * 1024, // 5MB
  compressionEnabled: true,
  compressionThreshold: 1024, // 1KB
  maxRetries: 3,
  retryDelay: 1000,
  maxConcurrent: 3,
  quotaWarningThreshold: 0.8, // 80%
  cleanupOnInit: true,
  enableStats: true,
  debug: false
});
```

### Opções de Configuração

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `dbName` | string | 'AppCache' | Nome do banco IndexedDB |
| `dbVersion` | number | 1 | Versão do banco |
| `defaultTTL` | number | 604800 | TTL padrão em segundos (7 dias) |
| `chunkSize` | number | 5MB | Tamanho máximo do chunk |
| `compressionEnabled` | boolean | true | Habilitar compactação |
| `compressionThreshold` | number | 1024 | Threshold para compactação (bytes) |
| `maxRetries` | number | 3 | Tentativas máximas de download |
| `retryDelay` | number | 1000 | Delay base para retry (ms) |
| `maxConcurrent` | number | 3 | Downloads simultâneos máximos |
| `quotaWarningThreshold` | number | 0.8 | Threshold para warning de quota |
| `cleanupOnInit` | boolean | true | Limpar expirados ao iniciar |
| `enableStats` | boolean | true | Habilitar estatísticas |
| `debug` | boolean | false | Modo debug |

## 📡 Eventos

### Eventos de Cache

- `cache:save` - Cache salvo
- `cache:load` - Cache carregado
- `cache:clear` - Cache limpo
- `cache:expired` - Cache expirado

### Eventos de Download

- `download:start` - Download iniciado
- `download:progress` - Progresso do download
- `download:complete` - Download completo
- `download:error` - Erro no download

### Eventos de Quota

- `quota:warning` - Warning de quota (>80%)
- `quota:exceeded` - Quota excedida

### Eventos de Sistema

- `init:complete` - Inicialização completa
- `cleanup:complete` - Limpeza completa

### Exemplo de Uso de Eventos

```javascript
cache.on('download:progress', (data) => {
  console.log(`${data.section}: ${data.progress}%`);
});

cache.on('quota:warning', (data) => {
  console.warn('Quota alta:', (data.percentage * 100).toFixed(2), '%');
});

cache.on('cache:expired', (data) => {
  console.log('Cache expirado:', data.section);
});
```

## 💡 Exemplos

### Exemplo 1: Fluxo Básico

```javascript
const cache = new CacheManager();
await cache.init();

// Salvar
await cache.save('filmes', filmesData);

// Carregar
const filmes = await cache.load('filmes');
```

### Exemplo 2: Download com Priorização

```javascript
const cache = new CacheManager();
await cache.init();

// Iniciar downloads em background
await cache.startBackgroundDownload({
  filmes: '/api/filmes',
  series: '/api/series',
  canais: '/api/canais'
});

// Usuário clica em "FILMES"
await cache.prioritizeSection('filmes');
```

### Exemplo 3: Sincronização

```javascript
const cache = new CacheManager();
await cache.init();

// Verificar atualizações
const hasUpdates = await cache.checkForUpdates('filmes', '/api/filmes/version');

if (hasUpdates) {
  await cache.updateSection('filmes', '/api/filmes');
}
```

### Exemplo 4: Gerenciamento de Quota

```javascript
const cache = new CacheManager();
await cache.init();

const quota = await cache.getQuota();

if (quota.percentage > 0.8) {
  // Limpar caches expirados
  await cache.cleanupExpired();
  
  // Se ainda alto, usar LRU
  if (quota.percentage > 0.8) {
    await cache.cleanupLRU(0.7);
  }
}
```

## 🔧 Troubleshooting

### IndexedDB não disponível

O sistema usa fallback automático para LocalStorage (limitado a 100KB).

```javascript
if (cache.isUsingFallback()) {
  console.warn('Usando LocalStorage (limitado)');
}
```

### Quota excedida

```javascript
cache.on('quota:exceeded', async () => {
  await cache.cleanupLRU(0.5);
});
```

### Download falha

O sistema tenta automaticamente 3 vezes com backoff exponencial.

```javascript
cache.on('download:error', (data) => {
  console.error('Download falhou:', data.section, data.error);
});
```

### Cache não expira

Verifique se `cleanupOnInit` está habilitado:

```javascript
const cache = new CacheManager({
  cleanupOnInit: true
});
```

### Performance lenta

- Habilite compactação: `compressionEnabled: true`
- Ajuste chunk size: `chunkSize: 10 * 1024 * 1024` (10MB)
- Reduza TTL: `defaultTTL: 86400` (1 dia)

## 📊 Métricas de Performance

### Tempos Esperados

- **Save (1MB)**: <100ms
- **Save (5MB)**: <500ms
- **Save (50MB)**: <3s
- **Load (1MB)**: <50ms
- **Load (5MB)**: <200ms
- **Load (50MB)**: <1.5s

### Taxa de Compressão

- **JSON típico**: 40-60% de redução
- **Dados repetitivos**: até 80% de redução

## 🌐 Compatibilidade

- ✅ Chrome/Edge 24+
- ✅ Firefox 16+
- ✅ Safari 10+
- ✅ Opera 15+
- ⚠️ IE11 (suporte parcial, sem compactação)

## 📝 Licença

MIT

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, abra uma issue ou PR.

## 📧 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.
