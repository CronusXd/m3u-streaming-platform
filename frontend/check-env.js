// Script para verificar variáveis de ambiente
const fs = require('fs');
const path = require('path');

console.log('Verificando variáveis de ambiente...\n');

// Carregar .env.local manualmente
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_API_URL'
];

let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✓ ${varName}: ${value.substring(0, 30)}...`);
  } else {
    console.log(`✗ ${varName}: MISSING`);
    allPresent = false;
  }
});

console.log('\n');

if (allPresent) {
  console.log('✓ Todas as variáveis estão configuradas!');
  process.exit(0);
} else {
  console.log('✗ Algumas variáveis estão faltando!');
  console.log('\nVerifique se o arquivo .env.local existe no diretório frontend/');
  process.exit(1);
}
