#!/bin/bash
# Script para corrigir erros de TypeScript

echo "Corrigindo erros de TypeScript..."

# Remover import não utilizado
sed -i "s/import { Channel } from '..\/parsers\/m3u-parser';//g" src/clients/supabase.ts

# Corrigir parâmetros não utilizados com underscore
find src -name "*.ts" -type f -exec sed -i 's/(req: Request, res: Response, next: NextFunction)/(_req: Request, _res: Response, next: NextFunction)/g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/(req, res, err)/(_req, res, err)/g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/handler: (req, res)/handler: (_req, res)/g' {} \;
find src -name "*.ts" -type f -exec sed -i 's/fileFilter: (req, file, cb)/fileFilter: (_req, file, cb)/g' {} \;

# Remover variável não utilizada
sed -i '/const totalEpisodes = series.reduce/d' src/parsers/series-grouper.ts
sed -i '/const SYSTEM_PLAYLIST_ID/d' src/scripts/sync-m3u.ts

# Comentar import do prom-client
sed -i "s/import promClient from 'prom-client'/\/\/ import promClient from 'prom-client'/g" src/routes/metrics.routes.ts

# Remover imports não utilizados
sed -i '/validateBody,/d' src/routes/playlists.routes.ts
sed -i '/validateParams,/d' src/routes/playlists.routes.ts
sed -i '/validateQuery,/d' src/routes/playlists.routes.ts
sed -i '/createPlaylistSchema,/d' src/routes/playlists.routes.ts
sed -i '/playlistIdSchema,/d' src/routes/playlists.routes.ts

echo "Erros corrigidos!"
