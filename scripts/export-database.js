import { supabase } from '../src/lib/supabase.js';
import fs from 'fs';

async function exportDatabase() {
  console.log('Starting database export...\n');

  try {
    const { data: letters, error: lettersError } = await supabase
      .from('letters')
      .select('*')
      .order('created_at', { ascending: true });

    if (lettersError) throw lettersError;

    const { data: statuses, error: statusesError } = await supabase
      .from('letter_statuses')
      .select('*')
      .order('signed_at', { ascending: true });

    if (statusesError) throw statusesError;

    const exportData = {
      export_date: new Date().toISOString(),
      database: 'document_tracking_system',
      tables: {
        letters: {
          count: letters.length,
          data: letters,
        },
        letter_statuses: {
          count: statuses.length,
          data: statuses,
        },
      },
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `database-export-${timestamp}.json`;

    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));

    console.log('Export completed successfully!');
    console.log(`File saved: ${filename}`);
    console.log(`\nSummary:`);
    console.log(`- Letters: ${letters.length}`);
    console.log(`- Letter Statuses: ${statuses.length}`);

    const sqlFilename = `database-export-${timestamp}.sql`;
    let sqlContent = `-- Database Export: ${new Date().toISOString()}\n`;
    sqlContent += `-- Document Tracking System\n\n`;

    if (letters.length > 0) {
      sqlContent += `-- Letters (${letters.length} records)\n`;
      letters.forEach((letter) => {
        const values = [
          `'${letter.id}'`,
          `'${letter.reference_number.replace(/'/g, "''")}'`,
          `'${letter.title.replace(/'/g, "''")}'`,
          letter.description ? `'${letter.description.replace(/'/g, "''")}'` : "''",
          `'${letter.handler_pin.replace(/'/g, "''")}'`,
          `'${letter.created_at}'`,
          letter.document_type ? `'${letter.document_type.replace(/'/g, "''")}'` : "'letter'",
          letter.document_subject ? `'${letter.document_subject.replace(/'/g, "''")}'` : "''",
          letter.file_url ? `'${letter.file_url.replace(/'/g, "''")}'` : 'NULL',
          letter.file_name ? `'${letter.file_name.replace(/'/g, "''")}'` : 'NULL',
        ];
        sqlContent += `INSERT INTO letters (id, reference_number, title, description, handler_pin, created_at, document_type, document_subject, file_url, file_name) VALUES (${values.join(', ')});\n`;
      });
      sqlContent += '\n';
    }

    if (statuses.length > 0) {
      sqlContent += `-- Letter Statuses (${statuses.length} records)\n`;
      statuses.forEach((status) => {
        const values = [
          `'${status.id}'`,
          `'${status.letter_id}'`,
          `'${status.status_type}'`,
          `'${status.signed_by.replace(/'/g, "''")}'`,
          `'${status.signed_at}'`,
          status.notes ? `'${status.notes.replace(/'/g, "''")}'` : "''",
        ];
        sqlContent += `INSERT INTO letter_statuses (id, letter_id, status_type, signed_by, signed_at, notes) VALUES (${values.join(', ')});\n`;
      });
    }

    fs.writeFileSync(sqlFilename, sqlContent);
    console.log(`SQL file saved: ${sqlFilename}\n`);
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  }
}

exportDatabase();
