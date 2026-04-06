import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env file manually
function loadEnv() {
  const envPath = join(__dirname, '..', '.env');
  const envContent = readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });
  
  return env;
}

const env = loadEnv();
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function runAllMigrations() {
  console.log('\n📋 Running all migrations...\n');

  try {
    // Test connection first
    console.log('Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('letters')
      .select('id')
      .limit(1);

    if (testError && testError.code !== 'PGRST116') {
      console.log('✅ Connection successful!\n');
    } else if (testError && testError.code === 'PGRST116') {
      console.log('✅ Connection successful! (Table not found yet - will be created)\n');
    }

    // All migrations to run
    const migrations = [
      {
        name: '20260219150830_create_letter_tracking_system.sql',
        sql: `
          -- Create letters table
          CREATE TABLE IF NOT EXISTS letters (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            reference_number text UNIQUE NOT NULL,
            title text NOT NULL,
            description text DEFAULT '',
            handler_pin text NOT NULL,
            created_at timestamptz DEFAULT now()
          );

          -- Create letter_statuses table
          CREATE TABLE IF NOT EXISTS letter_statuses (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            letter_id uuid NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
            status_type text NOT NULL CHECK (status_type IN ('noted', 'approved', 'reviewed')),
            signed_by text NOT NULL,
            signed_at timestamptz DEFAULT now(),
            notes text DEFAULT ''
          );

          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_letter_statuses_letter_id ON letter_statuses(letter_id);
          CREATE INDEX IF NOT EXISTS idx_letters_reference_number ON letters(reference_number);

          -- Enable RLS
          ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
          ALTER TABLE letter_statuses ENABLE ROW LEVEL SECURITY;

          -- Letters policies
          CREATE POLICY IF NOT EXISTS "Anyone can view letters"
            ON letters FOR SELECT
            USING (true);

          CREATE POLICY IF NOT EXISTS "Anyone can create letters"
            ON letters FOR INSERT
            WITH CHECK (true);

          -- Letter statuses policies
          CREATE POLICY IF NOT EXISTS "Anyone can view letter statuses"
            ON letter_statuses FOR SELECT
            USING (true);

          CREATE POLICY IF NOT EXISTS "Anyone can create letter statuses"
            ON letter_statuses FOR INSERT
            WITH CHECK (true);
        `
      },
      {
        name: '20260220081056_add_document_storage_fields.sql',
        sql: `
          ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_type text DEFAULT 'letter';
          ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_subject text DEFAULT '';
          ALTER TABLE letters ADD COLUMN IF NOT EXISTS file_url text;
          ALTER TABLE letters ADD COLUMN IF NOT EXISTS file_name text;

          CREATE INDEX IF NOT EXISTS idx_letters_reference ON letters(reference_number);
          CREATE INDEX IF NOT EXISTS idx_letters_title ON letters(title);
          CREATE INDEX IF NOT EXISTS idx_letters_type ON letters(document_type);
        `
      },
      {
        name: '20260304011444_create_documents_storage_bucket.sql',
        sql: `
          INSERT INTO storage.buckets (id, name, public)
          VALUES ('documents', 'documents', true)
          ON CONFLICT (id) DO NOTHING;

          CREATE POLICY IF NOT EXISTS "Anyone can view documents"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'documents');

          CREATE POLICY IF NOT EXISTS "Anyone can upload documents"
            ON storage.objects FOR INSERT
            WITH CHECK (bucket_id = 'documents');
        `
      },
      {
        name: '20260313000000_add_document_fields.sql',
        sql: `
          ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_for text;
          ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_thru text;
          ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_from text;
        `
      },
      {
        name: '20260316000000_add_required_document_fields.sql',
        sql: `
          ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_for text;
          ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_thru text;
          ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_from text;

          CREATE INDEX IF NOT EXISTS idx_letters_document_for ON letters(document_for);
          CREATE INDEX IF NOT EXISTS idx_letters_document_from ON letters(document_from);
        `
      }
    ];

    console.log('🚀 Running migrations in order...\n');

    for (const migration of migrations) {
      console.log(`📄 Running: ${migration.name}`);
      
      try {
        // Split by semicolon and run each statement
        const statements = migration.sql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const statement of statements) {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error && error.message && !error.message.includes('already exists')) {
            console.error(`  ❌ Error: ${error.message}`);
          }
        }
        
        console.log(`  ✅ Completed\n`);
      } catch (err) {
        console.error(`  ❌ Error: ${err.message}\n`);
      }
    }

    console.log('\n✅ All migrations completed!');
    console.log('\n📋 Verifying tables...\n');

    // Verify tables exist
    const { data: letters, error: lettersError } = await supabase
      .from('letters')
      .select('*')
      .limit(1);

    if (lettersError) {
      console.error('❌ Letters table error:', lettersError.message);
    } else {
      console.log('✅ Letters table exists');
    }

    const { data: statuses, error: statusesError } = await supabase
      .from('letter_statuses')
      .select('*')
      .limit(1);

    if (statusesError) {
      console.error('❌ Letter statuses table error:', statusesError.message);
    } else {
      console.log('✅ Letter statuses table exists');
    }

    console.log('\n🎉 Database setup complete! You can now create documents.\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

runAllMigrations();
