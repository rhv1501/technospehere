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

async function checkStorage() {
  console.log('--- Checking Storage Buckets in Supabase ---');
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    console.error('Error listing buckets:', error);
    return;
  }
  console.log('Existing buckets:', buckets.map(b => ({ id: b.id, name: b.name, public: b.public })));

  // Try creating/verifying lead-attachments bucket
  const bucketName = 'lead-attachments';
  const existing = buckets.find(b => b.id === bucketName);
  if (!existing) {
    console.log(`Bucket "${bucketName}" does not exist! Creating...`);
    const { data: createData, error: createErr } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 20971520, // 20MB
    });
    if (createErr) {
      console.error(`Failed to create bucket "${bucketName}":`, createErr);
    } else {
      console.log(`Successfully created bucket "${bucketName}"!`, createData);
    }
  } else {
    console.log(`Bucket "${bucketName}" already exists.`);
  }

  // Also check vendor-documents bucket
  const vendorBucketName = 'vendor-documents';
  const existingVendorBucket = buckets.find(b => b.id === vendorBucketName);
  if (!existingVendorBucket) {
    console.log(`Bucket "${vendorBucketName}" does not exist! Creating...`);
    const { data: createVendorData, error: createVendorErr } = await supabase.storage.createBucket(vendorBucketName, {
      public: true,
      fileSizeLimit: 20971520, // 20MB
    });
    if (createVendorErr) {
      console.error(`Failed to create bucket "${vendorBucketName}":`, createVendorErr);
    } else {
      console.log(`Successfully created bucket "${vendorBucketName}"!`, createVendorData);
    }
  }

  // Test uploading dummy file to lead-attachments
  console.log('\n--- Testing File Upload to lead-attachments ---');
  const testFileName = `test_${Date.now()}.txt`;
  const testBuffer = Buffer.from('Testing Supabase attachment upload functionality');
  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('lead-attachments')
    .upload(testFileName, testBuffer, { contentType: 'text/plain', upsert: true });

  if (uploadErr) {
    console.error('Test upload failed:', uploadErr);
  } else {
    console.log('Test upload SUCCESS! Path:', uploadData.path);
    // Cleanup test file
    await supabase.storage.from('lead-attachments').remove([testFileName]);
    console.log('Test upload file cleaned up.');
  }
}

checkStorage();
