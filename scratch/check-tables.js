const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return acc;
  const [k, ...v] = trimmed.split('=');
  if (k && v) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTables() {
  const tables = [
    'profiles',
    'categories',
    'vendors',
    'vendor_categories',
    'vendor_registrations',
    'leads',
    'lead_attachments',
    'lead_vendors',
    'message_logs',
    'system_settings'
  ];

  console.log('--- Checking Supabase Tables Status ---');
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`[MISSING/ERROR] ${table}:`, error.code, error.message);
    } else {
      console.log(`[OK] ${table}: Table exists, row count sample:`, data.length);
    }
  }
}

checkTables();
