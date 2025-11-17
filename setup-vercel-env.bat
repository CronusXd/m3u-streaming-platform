@echo off
echo Configurando variáveis de ambiente na Vercel...
echo.

cd frontend

echo Adicionando NEXT_PUBLIC_SUPABASE_URL...
echo https://nmekiixqqshrnjqjazcd.supabase.co | vercel env add NEXT_PUBLIC_SUPABASE_URL production

echo Adicionando NEXT_PUBLIC_SUPABASE_ANON_KEY...
echo eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tZWtpaXhxcXNocm5qcWphemNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NjU0NDgsImV4cCI6MjA3ODQ0MTQ0OH0.Xwa2653aGHwiw44CdZviLohXi-Ovtf4AKXliqqHBuSA | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production

echo Adicionando NEXT_PUBLIC_TMDB_API_KEY...
echo 50d01ad0e7bde0a9a410a565e91b5cf6 | vercel env add NEXT_PUBLIC_TMDB_API_KEY production

echo Adicionando NEXT_PUBLIC_API_URL...
echo https://playcoretv-backend.vercel.app | vercel env add NEXT_PUBLIC_API_URL production

echo.
echo ✅ Variáveis de ambiente configuradas!
echo.
echo Agora execute: vercel --prod
cd ..
