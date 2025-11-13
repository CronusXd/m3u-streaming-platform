# Script para corrigir erros de TypeScript no Windows

Write-Host "Corrigindo erros de TypeScript..." -ForegroundColor Cyan

# 1. Remover import não utilizado em supabase.ts
$file = "src/clients/supabase.ts"
$content = Get-Content $file -Raw
$content = $content -replace "import \{ Channel \} from '../parsers/m3u-parser';`n", ""
Set-Content $file $content -NoNewline

# 2. Corrigir auth.middleware.ts
$file = "src/middleware/auth.middleware.ts"
$content = Get-Content $file -Raw
$content = $content -replace "\(req: Request, res: Response, next: NextFunction\)", "(_req: Request, _res: Response, next: NextFunction)"
$content = $content -replace "export const requireAdmin = \(req: Request, res: Response", "export const requireAdmin = (req: Request, _res: Response"
Set-Content $file $content -NoNewline

# 3. Corrigir error.middleware.ts
$file = "src/middleware/error.middleware.ts"
$content = Get-Content $file -Raw
$content = $content -replace "next: NextFunction`n\) => \{", "_next: NextFunction`n): void => {"
$content = $content -replace "return res.status", "res.status"
$content = $content -replace "\}\);`n  \}", "});`n    return;`n  }"
Set-Content $file $content -NoNewline

# 4. Corrigir logger.middleware.ts
$file = "src/middleware/logger.middleware.ts"
$content = Get-Content $file -Raw
$content = $content -replace "customLogLevel: \(req, res, err\)", "customLogLevel: (_req, res, err)"
Set-Content $file $content -NoNewline

# 5. Corrigir rate-limit.middleware.ts
$file = "src/middleware/rate-limit.middleware.ts"
$content = Get-Content $file -Raw
$content = $content -replace "handler: \(req, res\)", "handler: (_req, res)"
Set-Content $file $content -NoNewline

# 6. Corrigir validation.middleware.ts
$file = "src/middleware/validation.middleware.ts"
$content = Get-Content $file -Raw
$content = $content -replace "\(req: Request, res: Response, next", "(_req: Request, _res: Response, next"
Set-Content $file $content -NoNewline

# 7. Corrigir series-grouper.ts
$file = "src/parsers/series-grouper.ts"
$content = Get-Content $file -Raw
$content = $content -replace "    // Contar total de episódios`n    const totalEpisodes = series.reduce\(\(sum, s\) => sum \+ s.episodes.length, 0\);`n`n", ""
Set-Content $file $content -NoNewline

# 8. Corrigir health.routes.ts
$file = "src/routes/health.routes.ts"
$content = Get-Content $file -Raw
$content = $content -replace "async \(req, res\)", "async (_req, res)"
$content = $content -replace "\(req, res\)", "(_req, res)"
Set-Content $file $content -NoNewline

# 9. Corrigir metrics.routes.ts
$file = "src/routes/metrics.routes.ts"
$content = Get-Content $file -Raw
$content = $content -replace "import promClient from 'prom-client';", "// import promClient from 'prom-client';"
$content = $content -replace "async \(req, res\)", "async (_req, res)"
Set-Content $file $content -NoNewline

# 10. Corrigir playlists.routes.ts
$file = "src/routes/playlists.routes.ts"
$content = Get-Content $file -Raw
$content = $content -replace "  validateBody,`n", ""
$content = $content -replace "  validateParams,`n", ""
$content = $content -replace "  validateQuery,`n", ""
$content = $content -replace "import \{`n  createPlaylistSchema,`n  playlistFiltersSchema,`n  playlistIdSchema,`n\} from '../schemas/playlist.schema';`n", ""
$content = $content -replace "fileFilter: \(req, file, cb\)", "fileFilter: (_req, file, cb)"
Set-Content $file $content -NoNewline

# 11. Corrigir sync-m3u.ts
$file = "src/scripts/sync-m3u.ts"
$content = Get-Content $file -Raw
$content = $content -replace "const SYSTEM_PLAYLIST_ID = process.env.SYSTEM_PLAYLIST_ID \|\| 'system-main';`n", ""
Set-Content $file $content -NoNewline

Write-Host "✅ Erros corrigidos!" -ForegroundColor Green
Write-Host "Execute: npm run build" -ForegroundColor Yellow
