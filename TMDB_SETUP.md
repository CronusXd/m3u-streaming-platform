# Configuração da API do TMDB (The Movie Database)

## O que é TMDB?

O TMDB é um banco de dados de filmes e séries que fornece informações detalhadas como:
- Sinopses e descrições
- Posters e imagens de alta qualidade
- Informações de elenco e equipe
- Trailers e vídeos
- Avaliações e classificações
- Thumbnails de episódios
- E muito mais!

## Como obter sua chave de API

### 1. Criar uma conta no TMDB

1. Acesse: https://www.themoviedb.org/signup
2. Preencha o formulário de registro
3. Confirme seu email

### 2. Solicitar uma chave de API

1. Faça login na sua conta
2. Vá para: https://www.themoviedb.org/settings/api
3. Clique em "Request an API Key"
4. Escolha "Developer" (para uso pessoal/desenvolvimento)
5. Aceite os termos de uso
6. Preencha o formulário:
   - **Application Name**: PlayCoreTV (ou o nome do seu projeto)
   - **Application URL**: http://localhost:3000 (ou seu domínio)
   - **Application Summary**: IPTV player with movie and series information
7. Clique em "Submit"

### 3. Copiar sua chave de API

Após a aprovação (geralmente instantânea), você verá:
- **API Key (v3 auth)**: Esta é a chave que você precisa!

## Configurar no projeto

### 1. Criar arquivo .env.local

No diretório `frontend/`, crie um arquivo `.env.local`:

```bash
cd frontend
cp .env.example .env.local
```

### 2. Adicionar a chave de API

Edite o arquivo `.env.local` e adicione sua chave:

```env
NEXT_PUBLIC_TMDB_API_KEY=sua_chave_aqui
```

Exemplo:
```env
NEXT_PUBLIC_TMDB_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### 3. Reiniciar o servidor

Se o servidor estiver rodando, reinicie-o para carregar as novas variáveis de ambiente:

```bash
# Pare o servidor (Ctrl+C)
# Inicie novamente
npm run dev
```

## Funcionalidades implementadas

### Para Filmes:
- ✅ Busca automática de informações por nome
- ✅ Poster de alta qualidade
- ✅ Backdrop/imagem de fundo
- ✅ Sinopse completa
- ✅ Diretor e elenco principal
- ✅ Data de lançamento
- ✅ Duração do filme
- ✅ Gêneros
- ✅ Avaliação (estrelas)
- ✅ Trailer do YouTube

### Para Séries:
- ✅ Busca automática de informações por nome
- ✅ Poster de alta qualidade
- ✅ Informações dos criadores
- ✅ Sinopse completa
- ✅ Data de estreia
- ✅ Número de temporadas e episódios
- ✅ Gêneros
- ✅ Avaliação (estrelas)
- ✅ Trailer do YouTube
- ✅ Thumbnails de episódios
- ✅ Nomes e descrições de episódios
- ✅ Duração de cada episódio

## Limites da API

A API gratuita do TMDB tem os seguintes limites:
- **40 requisições por 10 segundos**
- **Sem limite diário**

O sistema já implementa cache automático para evitar requisições duplicadas.

## Testando

Após configurar, teste acessando:

1. **Filmes**: http://localhost:3000/dashboard/movies
   - Clique em qualquer filme
   - Você deve ver informações detalhadas do TMDB

2. **Séries**: http://localhost:3000/dashboard/series
   - Clique em qualquer série
   - Você deve ver informações detalhadas e thumbnails dos episódios

## Troubleshooting

### Erro: "Invalid API key"
- Verifique se copiou a chave corretamente
- Certifique-se de que não há espaços extras
- Reinicie o servidor após adicionar a chave

### Não aparece informações
- Abra o console do navegador (F12)
- Verifique se há erros relacionados ao TMDB
- O nome do filme/série pode não estar no banco de dados do TMDB
- Tente com filmes/séries mais conhecidos primeiro

### Imagens não carregam
- Verifique sua conexão com a internet
- O TMDB pode estar temporariamente indisponível
- Alguns conteúdos podem não ter imagens disponíveis

## Documentação oficial

Para mais informações sobre a API:
- Documentação: https://developers.themoviedb.org/3
- Fórum: https://www.themoviedb.org/talk
- Status da API: https://status.themoviedb.org/

## Suporte

Se tiver problemas:
1. Verifique o console do navegador para erros
2. Confirme que a chave de API está correta
3. Teste com filmes/séries populares primeiro
4. Verifique se o servidor foi reiniciado após adicionar a chave
