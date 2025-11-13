import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n📝 Please check your .env file at:', envPath);
  process.exit(1);
}

// Export validated environment variables
export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  
  supabase: {
    url: process.env.SUPABASE_URL!,
    anonKey: process.env.SUPABASE_ANON_KEY!,
    serviceKey: process.env.SUPABASE_SERVICE_KEY,
  },
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-jwt-secret-key-here',
  },
  
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  m3u: {
    syncUrl: process.env.M3U_SYNC_URL || '',
    systemPlaylistId: process.env.SYSTEM_PLAYLIST_ID || 'system-main',
  },
  
  tmdb: {
    apiKey: process.env.TMDB_API_KEY || '',
  },
};

console.log('✅ Environment variables loaded successfully');
console.log('📍 Supabase URL:', env.supabase.url);
console.log('🔑 Supabase Key:', env.supabase.anonKey ? '✓ Set' : '✗ Missing');
