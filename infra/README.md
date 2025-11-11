# Infrastructure - PlayCoreTV

This directory contains infrastructure configuration, database migrations, and deployment files.

## Directory Structure

```
infra/
├── migrations/          # SQL migration files
│   ├── 001_initial_schema.sql
│   └── 002_rls_policies.sql
├── seeds/              # Seed data for testing
│   └── sample_safe.m3u
├── docker-compose.yml  # Docker Compose configuration
└── README.md
```

## Supabase Setup

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in project details:
   - **Name**: playcoretv
   - **Database Password**: (choose a strong password)
   - **Region**: (choose closest to your users)
5. Wait for project to be created (~2 minutes)

### 2. Get API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: Used in frontend (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - **service_role key**: Used in backend (SUPABASE_SERVICE_KEY) - **Keep this secret!**

### 3. Run Database Migrations

#### Option A: Using Supabase SQL Editor (Recommended)

1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New Query"
3. Copy the content of `migrations/001_initial_schema.sql`
4. Paste and click "Run"
5. Repeat for `migrations/002_rls_policies.sql`

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 4. Verify Setup

1. Go to **Table Editor** in Supabase dashboard
2. You should see the following tables:
   - `playlists`
   - `channels`
   - `favorites`
3. Go to **Authentication** → **Policies**
4. Verify that RLS policies are enabled

### 5. Configure Environment Variables

#### Backend (.env)

```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here
```

#### Frontend (.env.local)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Database Schema

### Tables

**playlists**
- Stores M3U playlists uploaded by users
- Fields: id, owner_id, name, source_url, visibility, created_at, updated_at

**channels**
- Stores individual channels extracted from M3U playlists
- Fields: id, playlist_id, name, url, logo, group_title, language, tvg_id, raw_meta, is_hls, is_active, created_at

**favorites**
- Stores user favorite channels
- Fields: user_id, channel_id, created_at

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

- Users can only view/edit their own playlists
- Public playlists are visible to everyone
- Channels inherit visibility from their parent playlist
- Users can only manage their own favorites

## Seed Data

The `seeds/sample_safe.m3u` file contains 5 public test streams:

1. **Big Buck Bunny** - Open source animated short film
2. **Sintel Trailer** - Blender Foundation project
3. **Tears of Steel** - Blender Foundation project
4. **Apple Test Stream** - Apple's HLS test stream
5. **Akamai Test Stream** - Akamai's test stream

All streams are legal, public, and free to use for testing purposes.

## Docker Compose

See `docker-compose.yml` for local development setup.

```bash
# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f
```

## Troubleshooting

### RLS Policies Not Working

If you're getting permission errors:

1. Verify RLS is enabled on all tables
2. Check that policies are created correctly
3. Ensure JWT token is being sent in requests
4. Verify user is authenticated

### Migration Errors

If migrations fail:

1. Check Supabase dashboard for error messages
2. Verify UUID extension is enabled
3. Ensure no conflicting table names
4. Try running migrations one at a time

### Connection Issues

If backend can't connect to Supabase:

1. Verify SUPABASE_URL is correct
2. Check that SUPABASE_SERVICE_KEY is the service_role key (not anon key)
3. Ensure no firewall blocking connections
4. Check Supabase project is not paused

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
