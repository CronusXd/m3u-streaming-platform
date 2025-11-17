# 📜 Scripts do PlayCoreTV

## 🚀 Scripts Principais (USE ESTES!)

Os scripts principais estão na pasta **`sync/`**:

### 1️⃣ Sincronizar Lista M3U
```bash
npm run sync:m3u
```
Limpa o banco e importa toda a lista M3U novamente.

### 2️⃣ Buscar Logos do TMDB
```bash
npm run sync:tmdb
```
Busca logos faltantes no TMDB (35 req/s, multi-thread).

---

## 📂 Estrutura

```
scripts/
├── sync/                    ← USE ESTES!
│   ├── 1-sync-m3u-full.ts
│   ├── 2-fetch-tmdb-logos.ts
│   └── README.md
│
├── old/                     ← Scripts antigos (não use)
│   └── README.md
│
└── README.md                ← Você está aqui
```

---

## 📖 Documentação Completa

Veja `sync/README.md` para:
- Descrição detalhada de cada script
- Exemplos de uso
- Troubleshooting
- Configurações avançadas

---

## ⚡ Quick Start

```bash
# 1. Sincronizar lista M3U (primeira vez ou nova lista)
npm run sync:m3u

# 2. Buscar logos faltantes
npm run sync:tmdb
```

Pronto! 🎉
