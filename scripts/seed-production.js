const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.local file not found!');
  process.exit(1);
}

const env = fs.readFileSync(envPath, 'utf8').split('\n').reduce((acc, line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return acc;
  const [k, ...v] = trimmed.split('=');
  if (k && v) acc[k.trim()] = v.join('=').trim();
  return acc;
}, {});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function seedProduction() {
  console.log('=== SEEDING PRODUCTION SUPABASE ===');
  console.log('Target Supabase URL:', supabaseUrl);

  const email = 'admin@admin.com';
  const password = 'admin';
  const fullName = 'Admin';

  // Cleanup old dummy user if present
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  if (!listError && usersData?.users) {
    const oldUser = usersData.users.find(u => u.email === 'admin@bizzgrow.com');
    if (oldUser) {
      await supabase.from('profiles').delete().eq('id', oldUser.id);
      await supabase.auth.admin.deleteUser(oldUser.id);
      console.log('[AUTH] Cleaned up legacy dummy user admin@bizzgrow.com');
    }
  }

  // 1. Create or fetch Auth User
  let userId = null;
  const { data: refreshedUsersData } = await supabase.auth.admin.listUsers();
  if (refreshedUsersData?.users) {
    const existingUser = refreshedUsersData.users.find(u => u.email === email);
    if (existingUser) {
      userId = existingUser.id;
      console.log(`[AUTH] Admin user found: ${email} (ID: ${userId})`);
    }
  }

  if (!userId) {
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (createError) {
      console.error('[AUTH] Failed to create user:', createError.message);
    } else {
      userId = createData.user.id;
      console.log(`[AUTH] Successfully created user: ${email} (ID: ${userId})`);
    }
  }

  if (!userId) {
    console.error('[AUTH] Could not establish user ID. Stopping.');
    return;
  }

  // 2. Check and seed public.profiles
  const { error: profileCheckError } = await supabase.from('profiles').select('id').limit(1);
  if (profileCheckError && profileCheckError.code === 'PGRST205') {
    console.log('\n[WARNING] Database tables (public.profiles, etc.) do not exist yet on Supabase Cloud.');
    console.log('Please execute the migration script (supabase/migrations/20260904000000_initial_schema.sql) in the Supabase Dashboard SQL Editor.');
    console.log('Once executed, re-run this seed script to populate profiles, categories, and vendors!');
    return;
  }

  // Upsert profile
  const { error: profileUpsertError } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: fullName,
    email: email,
    role: 'admin',
    updated_at: new Date().toISOString()
  });

  if (profileUpsertError) {
    console.error('[PROFILES] Failed to upsert profile:', profileUpsertError.message);
  } else {
    console.log(`[PROFILES] Successfully upserted profile for ${email}`);
  }

  // 3. Seed Default Categories
  const categories = [
    { name: 'Lenovo Commercial', description: 'Laptops, desktops and workstations for commercial enterprise customers' },
    { name: 'Lenovo Personal', description: 'Consumer laptops, gaming PCs, and personal accessories' },
    { name: 'Dell Enterprise & Client', description: 'Dell Servers, Storage, Latitude and XPS laptops' },
    { name: 'HP Commercial & Enterprise', description: 'HP ProBook, EliteBook, ZBook and printers' },
    { name: 'Apple Business', description: 'MacBook Pro, iMac, iPad and Mac Studio solutions' },
    { name: 'Software & Licensing', description: 'Microsoft 365, Cloud subscriptions, and enterprise software' }
  ];

  for (const cat of categories) {
    const { error } = await supabase.from('categories').upsert(cat, { onConflict: 'name' });
    if (error) console.error(`[CATEGORIES] Error inserting ${cat.name}:`, error.message);
  }
  console.log('[CATEGORIES] Default categories seeded.');

  // Fetch categories map by name -> id
  const { data: catRows } = await supabase.from('categories').select('id, name');
  const catMap = (catRows || []).reduce((acc, row) => {
    acc[row.name] = row.id;
    return acc;
  }, {});

  // 4. Seed Initial Vendors
  const vendors = [
    {
      company_name: 'Apex Infotech Solutions',
      contact_person: 'Rajesh Sharma',
      email: 'sales@apexinfotech.com',
      whatsapp_number: '+919876543210',
      address: 'Plot 42, Tech Park, Electronic City, Bengaluru',
      gst_number: '29ABCDE1234F1Z5',
      notes: 'Authorized Lenovo Platinum Partner for Commercial & Workstations',
      status: 'active',
      registration_status: 'approved',
      category_names: ['Lenovo Commercial', 'Lenovo Personal']
    },
    {
      company_name: 'TechnoSphere Digital Media',
      contact_person: 'Ananya Patel',
      email: 'contact@technospheredigital.in',
      whatsapp_number: '+919812345678',
      address: 'Suite 302, Cyber Tower, Hitec City, Hyderabad',
      gst_number: '36AAACT9876Q1Z9',
      notes: 'Specialized in Hardware Distribution & Cloud Licensing',
      status: 'active',
      registration_status: 'approved',
      category_names: ['Lenovo Commercial', 'Software & Licensing']
    },
    {
      company_name: 'Nexus Compute Systems',
      contact_person: 'Vikramaditya Rao',
      email: 'procurement@nexuscompute.com',
      whatsapp_number: '+919900112233',
      address: '15 Mahatma Gandhi Road, Connaught Place, New Delhi',
      gst_number: '07AAACN5432M1Z2',
      notes: 'Enterprise supplier for HP and Dell IT Infrastructure',
      status: 'active',
      registration_status: 'approved',
      category_names: ['Dell Enterprise & Client', 'HP Commercial & Enterprise']
    }
  ];

  for (const v of vendors) {
    const { category_names, ...vData } = v;
    
    // Check if vendor already exists by company_name
    const { data: existingVendor } = await supabase
      .from('vendors')
      .select('id')
      .eq('company_name', v.company_name)
      .maybeSingle();

    let vendorId = existingVendor?.id;

    if (vendorId) {
      const { error } = await supabase.from('vendors').update(vData).eq('id', vendorId);
      if (error) console.error(`[VENDORS] Error updating ${v.company_name}:`, error.message);
      else console.log(`[VENDORS] Updated existing vendor: ${v.company_name}`);
    } else {
      const { data: newVendor, error } = await supabase.from('vendors').insert(vData).select('id').single();
      if (error) console.error(`[VENDORS] Error inserting ${v.company_name}:`, error.message);
      else {
        vendorId = newVendor.id;
        console.log(`[VENDORS] Inserted new vendor: ${v.company_name}`);
      }
    }

    // Link categories if vendorId established
    if (vendorId && category_names && category_names.length > 0) {
      for (const catName of category_names) {
        const catId = catMap[catName];
        if (catId) {
          await supabase.from('vendor_categories').upsert(
            { vendor_id: vendorId, category_id: catId },
            { onConflict: 'vendor_id,category_id' }
          );
        }
      }
    }
  }

  console.log('[VENDORS] Default vendors and vendor categories seeded.');

  // 5. Seed System Settings if table exists
  const defaultSettings = {
    company_name: 'TechnoSphere Business Solutions',
    official_email: 'sales@technosphere.in',
    phone_number: '+91 98765 43210',
    office_address: 'TechnoSphere Tower, Cyber Hub, Industrial Zone',
    gstin_number: '27AAAAA0000A1Z5',
    default_gst_rate: 18.0,
    available_gst_slabs: [0, 5, 12, 18, 28],
    delivery_terms_presets: [
      'Doorstep Delivery (5-7 Business Days)',
      'Doorstep Express Delivery (48 Hours)',
      'Ex-Works / Factory Pickup',
      'FOB Shipping',
    ],
    warranty_terms_presets: [
      '1 Year Standard Manufacturer Warranty',
      '2 Years Onsite Warranty',
      '3 Years Premier Support Warranty',
      '90 Days Limited Warranty',
    ],
    email_subject_prefix: 'Request for Quotation',
    email_footer_note: 'Please email your official quotation with price breakdown and lead time to sales@technosphere.in',
    whatsapp_header: 'QUOTATION REQUEST - TechnoSphere',
  };

  const { error: settingsError } = await supabase.from('system_settings').upsert({
    key: 'main_config',
    value: defaultSettings,
    updated_at: new Date().toISOString()
  }, { onConflict: 'key' });

  if (settingsError) {
    console.error('[SETTINGS] Error seeding system_settings:', settingsError.message);
  } else {
    console.log('[SETTINGS] Default system settings seeded.');
  }

  console.log('\n=== SEEDING COMPLETED SUCCESSFULLY ===');
}

seedProduction().catch(err => {
  console.error('Fatal error seeding production:', err);
});
