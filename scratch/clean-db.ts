import fs from 'fs';
import path from 'path';

// Read .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  for (const line of envConfig.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
        process.env[key] = val;
      }
    }
  }
}

import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  const supabase = createAdminClient();
  const { data: leads, error } = await supabase.from('leads').select('id, lead_number, product_item');
  if (error) {
    console.error('Database query error:', error);
    return;
  }

  console.log(`Found ${leads?.length || 0} total leads in Supabase database.`);

  let updatedCount = 0;
  for (const l of leads || []) {
    if (l.product_item && /\(\+\d+\s+(additional|more)\s+items?\)/i.test(l.product_item)) {
      const cleaned = l.product_item.replace(/\s*\(\+\d+\s+(additional|more)\s+items?\)/gi, '').trim();
      console.log(`[Lead ${l.lead_number}] Updating product_item: "${l.product_item}" -> "${cleaned}"`);
      const { error: updateErr } = await supabase.from('leads').update({ product_item: cleaned }).eq('id', l.id);
      if (updateErr) {
        console.error(`Error updating lead ${l.id}:`, updateErr);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Successfully cleaned ${updatedCount} older lead records in Supabase PostgreSQL.`);
}

main();
