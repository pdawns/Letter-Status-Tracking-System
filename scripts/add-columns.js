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
console.log('URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumns() {
  console.log('\n📋 Adding columns to letters table...\n');

  try {
    // Test connection first
    console.log('Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('letters')
      .select('id')
      .limit(1);

    if (testError) {
      console.error('❌ Connection test failed:', testError.message);
      console.log('\n⚠️  You need to run the SQL manually in Supabase Dashboard:');
      console.log('\n--- Copy and paste this SQL in Supabase SQL Editor ---\n');
      console.log(`ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_for text;`);
      console.log(`ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_thru text;`);
      console.log(`ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_from text;`);
      console.log(`CREATE INDEX IF NOT EXISTS idx_letters_document_for ON letters(document_for);`);
      console.log(`CREATE INDEX IF NOT EXISTS idx_letters_document_from ON letters(document_from);`);
      console.log('\n--- End of SQL ---\n');
      process.exit(1);
    }

    console.log('✅ Connection successful!\n');
    console.log('⚠️  Note: The Supabase client cannot run ALTER TABLE commands directly.');
    console.log('You need to run the SQL in the Supabase Dashboard.\n');
    console.log('📋 Steps:');
    console.log('1. Go to: https://supabase.com/dashboard/project/vzpuoofzowpvixrilotk/sql/new');
    console.log('2. Copy and paste the SQL below:');
    console.log('\n--- SQL to run ---\n');
    console.log(`ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_for text;`);
    console.log(`ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_thru text;`);
    console.log(`ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_from text;`);
    console.log(`CREATE INDEX IF NOT EXISTS idx_letters_document_for ON letters(document_for);`);
    console.log(`CREATE INDEX IF NOT EXISTS idx_letters_document_from ON letters(document_from);`);
    console.log('\n--- End of SQL ---\n');
    console.log('3. Click "Run" button');
    console.log('4. Come back and test creating a document!\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

addColumns();
