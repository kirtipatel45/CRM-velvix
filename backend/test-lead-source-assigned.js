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
  console.log('--- TESTING LEAD SOURCE & SALES ASSIGNMENT ---');

  // 1. Employee Login
  const loginRes = await request('/auth/login', {
    method: 'POST',
    body: { email: 'admin@velvix.com', password: 'admin123' },
  });
  if (!loginRes.ok) throw new Error('Login failed');
  const token = loginRes.data.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Fetch Sales Team
  console.log('\nFetching sales team for dropdown...');
  const salesTeamRes = await request('/lead-generation/sales-team', {
    method: 'GET',
    headers: authHeaders,
  });
  if (!salesTeamRes.ok) throw new Error('Failed to fetch sales team');
  console.log(`✅ Sales team fetched: ${salesTeamRes.data.data.length} members found`);
  const salesMember = salesTeamRes.data.data[0];

  // 3. Create Lead with Lead Source and Assigned To (no resume/chat leads fields)
  console.log('\nCreating lead with Lead Source and Assigned To...');
  const createRes = await request('/lead-generation', {
    method: 'POST',
    headers: authHeaders,
    body: {
      leadSource: 'Dice',
      assignedTo: salesMember?._id || null,
      linkedInProfiles: [
        {
          profileName: 'David Miller',
          url: 'https://dice.com/profile/david-miller',
          email: 'david.m@example.com',
          phone: '+1 555-0988',
        },
      ],
      entryDate: new Date().toISOString().split('T')[0],
      notes: 'Lead sourced from Dice tech portal',
    },
  });

  if (!createRes.ok) throw new Error(`Create lead failed: ${JSON.stringify(createRes.data)}`);
  const createdLead = createRes.data.data;
  console.log('✅ Lead created successfully:');
  console.log('  - Employee (Auto):', createdLead.employeeName);
  console.log('  - Lead Source:', createdLead.leadSource);
  console.log('  - Assigned To:', createdLead.assignedTo?.name || createdLead.assignedTo);

  if (createdLead.leadSource !== 'Dice') {
    throw new Error(`Expected leadSource "Dice", got "${createdLead.leadSource}"`);
  }

  // 4. Update Lead
  console.log('\nUpdating lead source to CareerBuilder...');
  const updateRes = await request(`/lead-generation/${createdLead._id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: {
      leadSource: 'CareerBuilder',
      assignedTo: salesMember?._id || null,
    },
  });

  if (!updateRes.ok) throw new Error(`Update lead failed: ${JSON.stringify(updateRes.data)}`);
  const updatedLead = updateRes.data.data;
  console.log('✅ Lead updated successfully:');
  console.log('  - Updated Lead Source:', updatedLead.leadSource);

  if (updatedLead.leadSource !== 'CareerBuilder') {
    throw new Error(`Expected updated leadSource "CareerBuilder", got "${updatedLead.leadSource}"`);
  }

  console.log('\n========================================');
  console.log('🎉 LEAD SOURCE & SALES DROPDOWN VERIFIED 100%!');
  console.log('========================================\n');
}

run().catch((err) => {
  console.error('❌ Test failed:', err.message);
  process.exit(1);
});
