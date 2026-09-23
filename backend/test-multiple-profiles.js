import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:5002/api';

async function request(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('--- TESTING MULTIPLE LINKEDIN PROFILES & AUTO EMPLOYEE NAME ---');

  // 1. Employee Login
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@velvix.com', password: 'admin123' },
  });
  if (!loginRes.ok) throw new Error('Login failed');
  const token = loginRes.data.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Create Lead with Multiple Profiles (without manual employeeName)
  const profiles = [
    {
      profileName: 'Alice Morgan',
      url: 'https://linkedin.com/in/alice-morgan',
      email: 'alice.m@example.com',
      phone: '+1 555-0101',
    },
    {
      profileName: 'Bob Vance',
      url: 'https://linkedin.com/in/bob-vance',
      email: 'bob.vance@example.com',
      phone: '+1 555-0102',
    },
  ];

  console.log('\nCreating lead with 2 LinkedIn profiles...');
  const createRes = await request('/lead-generation', {
    method: 'POST',
    headers: authHeaders,
    body: {
      dailyResumeLeads: 32,
      dailyChatLeads: 4,
      linkedInProfiles: profiles,
      entryDate: new Date().toISOString().split('T')[0],
      notes: 'Contains multiple candidate profiles',
    },
  });

  if (!createRes.ok) throw new Error(`Create failed: ${JSON.stringify(createRes.data)}`);
  const created = createRes.data.data;
  console.log('✅ Lead created successfully:');
  console.log('  - Employee Name (auto-filled):', created.employeeName);
  console.log('  - Profiles count:', created.linkedInProfiles?.length);
  console.log('  - Profiles:', created.linkedInProfiles);

  if (created.employeeName !== 'Admin User') {
    throw new Error(`Expected employeeName "Admin User", got "${created.employeeName}"`);
  }
  if (created.linkedInProfiles?.length !== 2) {
    throw new Error(`Expected 2 profiles, got ${created.linkedInProfiles?.length}`);
  }

  // 3. Edit / Update Lead with a 3rd Profile
  console.log('\nUpdating lead to add a 3rd profile...');
  const updatedProfiles = [
    ...profiles,
    {
      profileName: 'Charlie Davis',
      url: 'https://linkedin.com/in/charlie-davis',
      email: 'charlie.d@example.com',
      phone: '+1 555-0103',
    },
  ];

  const updateRes = await request(`/lead-generation/${created._id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: {
      dailyResumeLeads: 35,
      dailyChatLeads: 5,
      linkedInProfiles: updatedProfiles,
    },
  });

  if (!updateRes.ok) throw new Error(`Update failed: ${JSON.stringify(updateRes.data)}`);
  const updated = updateRes.data.data;
  console.log('✅ Lead updated successfully:');
  console.log('  - Updated Profiles count:', updated.linkedInProfiles?.length);

  if (updated.linkedInProfiles?.length !== 3) {
    throw new Error(`Expected 3 profiles after update, got ${updated.linkedInProfiles?.length}`);
  }

  console.log('\n========================================');
  console.log('🎉 MULTIPLE PROFILES & AUTO-NAME VERIFIED 100%!');
  console.log('========================================\n');
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
