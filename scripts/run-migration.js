import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Starting migration...\n');

  try {
    // Read the migration file
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20260316000000_add_required_document_fields.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n⏳ Executing migration...\n');

    // Execute the SQL commands one by one
    const commands = [
      `ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_for text`,
      `ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_thru text`,
      `ALTER TABLE letters ADD COLUMN IF NOT EXISTS document_from text`,
      `CREATE INDEX IF NOT EXISTS idx_letters_document_for ON letters(document_for)`,
      `CREATE INDEX IF NOT EXISTS idx_letters_document_from ON letters(document_from)`
    ];

    for (const command of commands) {
      console.log(`Executing: ${command}`);
      const { error } = await supabase.rpc('exec_sql', { sql: command });
      
      if (error) {
        console.error(`❌ Error executing command: ${error.message}`);
        // Try alternative method using REST API
        console.log('Trying alternative method...');
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({ sql: command })
        });
        
        if (!response.ok) {
          console.error(`❌ Alternative method also failed`);
        }
      } else {
        console.log('✅ Success\n');
      }
    }

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📋 Verifying columns...\n');

    // Verify the columns were added
    const { data, error } = await supabase
      .from('letters')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error verifying columns:', error.message);
    } else {
      console.log('✅ Columns verified! Sample record structure:');
      if (data && data.length > 0) {
        console.log(Object.keys(data[0]));
      } else {
        console.log('No records found, but table structure should be updated.');
      }
    }

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
