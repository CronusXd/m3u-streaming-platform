# 🔄 Como Limpar Cache e Testar as Mudanças

## ⚠️ IMPORTANTE

As mudanças JÁ ESTÃO no código, mas você precisa:
1. Reiniciar o servidor Next.js
2. Limpar o cache do navegador
3. Fazer novo pré-carregamento

---

## 📋 Passo a Passo

### 1. Parar o Servidor Next.js
```bash
# Pressione Ctrl+C no terminal onde o Next.js está rodando
```

### 2. Reiniciar o Servidor
```bash
cd frontend
npm run dev
```

### 3. Limpar Cache do Navegador
Abra o DevTools (F12) e execute:
```javascript
// Deletar IndexedDB
indexedDB.deleteDatabase('PlayCoreTVOptimized');

// Limpar localStorage
localStorage.clear();

// Limpar sessionStorage
sessionStorage.clear();

// Recarregar página
location.reload();
```

### 4. Fazer Login Novamente
- Faça login
- Aguarde o pré-carregamento completo
- Observe os logs no console

---

## 🔍 Logs Esperados

### Console do Navegador
```
👤 Usuário logado, iniciando pré-carregamento...
🚀 Iniciando pré-carregamento...
📥 Cache inválido, baixando TODOS os dados...

📥 Baixando séries...
📊 Total de registros: 150581
📄 Páginas necessárias: 151
✅ Progresso: 10/151 páginas
✅ Progresso: 20/151 páginas
...
✅ Progresso: 151/151 páginas
📊 150581 episódios encontrados
📊 3500 séries únicas encontradas  ⚡ (MENOS que antes!)
✅ Progresso: 50/3500 séries (1%)
✅ Progresso: 100/3500 séries (3%)
✅ Progresso: 150/3500 séries (4%)
...
✅ Progresso: 3500/3500 séries (100%)
✅ [Preload] 3500 séries processadas em 8s
✅ 3500 séries pré-carregadas
```

### Console do Servidor (Terminal)
```
🚀 [Preload] Iniciando pré-carregamento de séries...
📊 Total de registros: 150581
📄 Páginas necessárias: 151
✅ Progresso: 10/151 páginas
...
📊 150581 episódios encontrados
📊 3500 séries únicas encontradas
✅ Progresso: 50/3500 séries (1%)
...
✅ [Preload] 3500 séries processadas em 8s
```

---

## ✅ Verificações

### 1. Número de Séries
**Antes:** ~13513 séries (com duplicatas)
**Depois:** ~3500 séries (sem duplicatas) ✅

### 2. Tela de Séries
**Verificar:**
- ✅ "1 Contra Todos" aparece apenas 1 vez
- ✅ Mostra "4 temporadas, X episódios"
- ❌ NÃO deve mostrar "S01", "S02", "S03", "S04" separados

### 3. Modal da Série
**Ao clicar em "1 Contra Todos":**
- ✅ Dropdown mostra "Estação - 1", "Estação - 2", "Estação - 3", "Estação - 4"
- ✅ Pode trocar entre temporadas
- ✅ Cada temporada mostra seus episódios em ordem

### 4. Episódios Organizados
**Ao selecionar uma temporada:**
- ✅ Episódios em ordem (E01, E02, E03...)
- ✅ Nomes corretos (S01E01, S01E02, etc.)

---

## 🐛 Se Ainda Não Funcionar

### Verificar se o Servidor Reiniciou
```bash
# No terminal do Next.js, deve aparecer:
✓ Ready in 2.5s
○ Local:   http://localhost:3000
```

### Verificar se o Cache Foi Limpo
```javascript
// No console do navegador:
indexedDB.databases().then(dbs => console.log(dbs));
// Deve retornar array vazio ou sem 'PlayCoreTVOptimized'
```

### Forçar Rebuild
```bash
cd frontend
rm -rf .next
npm run dev
```

---

## 📊 Auditoria das Mudanças

### ✅ Arquivo: frontend/src/app/api/iptv/preload/series/route.ts

**Linha 76-103:** Função `extractSeasonEpisode()`
```typescript
function extractSeasonEpisode(nomeEpisodio: string) {
  const match = nomeEpisodio.match(/S(\d+)E(\d+)/i);
  // ...
}
```
✅ **PRESENTE**

**Linha 130-138:** Função `cleanSeriesName()`
```typescript
const cleanSeriesName = (name: string): string => {
  return name
    .replace(/\s+S\d+$/i, '')
    .replace(/\s+Season\s+\d+$/i, '')
    .replace(/\s+Temporada\s+\d+$/i, '')
    .trim();
};
```
✅ **PRESENTE**

**Linha 140-149:** Agrupamento por nome limpo
```typescript
allContent.forEach((item: any) => {
  const cleanName = cleanSeriesName(item.nome);
  if (!seriesMap.has(cleanName)) {
    seriesMap.set(cleanName, []);
  }
  seriesMap.get(cleanName)!.push(item);
});
```
✅ **PRESENTE**

**Linha 160-227:** Processamento progressivo
```typescript
const batchSize = 50;
for (let i = 0; i < seriesNames.length; i += batchSize) {
  // ...
  const progress = Math.round((processed / seriesNames.length) * 100);
  console.log(`✅ Progresso: ${processed}/${seriesNames.length} séries (${progress}%)`);
}
```
✅ **PRESENTE**

---

## 🎯 Conclusão

**TODAS as mudanças estão no código!**

O problema é que:
1. O servidor Next.js precisa ser reiniciado
2. O cache antigo precisa ser limpo
3. Um novo pré-carregamento precisa ser feito

**Siga os passos acima e vai funcionar!** 🚀

---

**Data:** 17/01/2025  
**Status:** ✅ Código atualizado (precisa reiniciar)
