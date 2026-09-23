import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Candidate from './models/Candidate.js';
import LeadGeneration from './models/LeadGeneration.js';
import User from './models/User.js';

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

async function runTests() {
  console.log('--- STARTING CANDIDATE CONVERSION & PORTAL TEST SUITE ---');
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm-velvix');

  try {
    const timestamp = Date.now();
    const testEmail = `sarah.jenkins.${timestamp}@example.com`;

    // 1. Employee Login
    console.log('\n1. Logging in as Admin/Employee...');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@velvix.com', password: 'admin123' },
    });
    if (!loginRes.ok) throw new Error(`Employee login failed: ${JSON.stringify(loginRes.data)}`);
    const employeeToken = loginRes.data.data.token;
    console.log('✅ Employee login successful');

    const authHeaders = { Authorization: `Bearer ${employeeToken}` };

    // 2. Create a test lead
    console.log('\n2. Creating a test lead...');
    const createLeadRes = await request('/lead-generation', {
      method: 'POST',
      headers: authHeaders,
      body: {
        employeeName: 'Sarah Jenkins Lead',
        dailyResumeLeads: 35,
        dailyChatLeads: 5,
        linkedInAccountsCount: 2,
        entryDate: new Date().toISOString().split('T')[0],
        notes: 'Strong candidate for senior software engineer',
      },
    });
    if (!createLeadRes.ok) throw new Error(`Lead creation failed: ${JSON.stringify(createLeadRes.data)}`);
    const leadId = createLeadRes.data.data._id;
    console.log(`✅ Test lead created: ${leadId}`);

    // 3. Convert lead to candidate with valid email
    console.log('\n3. Converting lead to candidate...');
    const convertRes = await request(`/leads/${leadId}/convert-to-candidate`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        email: testEmail,
        firstName: 'Sarah',
        lastName: 'Jenkins',
        phone: '+1 555-0199',
      },
    });

    console.log('Response data:', convertRes.data);
    if (!convertRes.ok) throw new Error(`Conversion failed: ${JSON.stringify(convertRes.data)}`);
    if (convertRes.data.data.token || convertRes.data.data.tempPassword || convertRes.data.data.password) {
      throw new Error('SECURITY VIOLATION: Plaintext credentials returned in conversion response!');
    }
    const candidateId = convertRes.data.data.candidateId;
    console.log(`✅ Lead converted to Candidate ${candidateId} without exposing plaintext credentials`);

    // 4. Duplicate email check
    console.log('\n4. Testing duplicate candidate email rejection...');
    const lead2Res = await request('/lead-generation', {
      method: 'POST',
      headers: authHeaders,
      body: {
        employeeName: 'Sarah J Duplicate',
        dailyResumeLeads: 30,
        dailyChatLeads: 4,
      },
    });
    const lead2Id = lead2Res.data.data._id;

    const dupRes = await request(`/leads/${lead2Id}/convert-to-candidate`, {
      method: 'POST',
      headers: authHeaders,
      body: { email: testEmail.toUpperCase() }, // Test case insensitivity
    });
    if (dupRes.status === 400 && dupRes.data.code === 'DUPLICATE_CANDIDATE') {
      console.log('✅ Duplicate candidate email successfully rejected with 400 DUPLICATE_CANDIDATE');
    } else {
      throw new Error(`Duplicate check failed, expected 400 DUPLICATE_CANDIDATE: ${JSON.stringify(dupRes)}`);
    }

    // 5. Double conversion on same lead check
    console.log('\n5. Testing prevention of re-converting already converted lead...');
    const doubleConvertRes = await request(`/leads/${leadId}/convert-to-candidate`, {
      method: 'POST',
      headers: authHeaders,
      body: { email: `different.${timestamp}@example.com` },
    });
    if (doubleConvertRes.status === 400 && doubleConvertRes.data.code === 'ALREADY_CONVERTED') {
      console.log('✅ Re-conversion on same lead successfully rejected with 400 ALREADY_CONVERTED');
    } else {
      throw new Error(`Double conversion check failed: ${JSON.stringify(doubleConvertRes)}`);
    }

    // 6. Inspect candidate record in DB to verify hashes
    console.log('\n6. Checking DB storage for hashing and security...');
    const candidateInDb = await Candidate.findOne({ email: testEmail }).select('+passwordHash +tempCredential.tokenHash +tempCredential');
    console.log('Candidate in DB:', {
      hasPasswordHash: !!candidateInDb?.passwordHash,
      passwordHashPrefix: candidateInDb?.passwordHash?.substring(0, 4),
      hasTokenHash: !!candidateInDb?.tempCredential?.tokenHash,
      tokenHashPrefix: candidateInDb?.tempCredential?.tokenHash?.substring(0, 4),
    });
    if (!candidateInDb || !candidateInDb.passwordHash?.startsWith('$2') || !candidateInDb.tempCredential?.tokenHash?.startsWith('$2')) {
      throw new Error('SECURITY VIOLATION: Credentials not stored as bcrypt hashes in database!');
    }
    console.log('✅ DB inspection verified: passwordHash and tokenHash are bcrypt hashes.');

    // 7. Test candidate auth flow (First-login, forced password reset)
    console.log('\n7. Testing candidate first-login flow with invalid password...');
    const wrongLoginRes = await request('/candidate-auth/first-login', {
      method: 'POST',
      body: { email: testEmail, tempPassword: 'WrongPassword123!' },
    });
    if (wrongLoginRes.status === 401) {
      console.log('✅ Wrong temporary password rejected with 401');
    } else {
      throw new Error(`Wrong password test failed: ${JSON.stringify(wrongLoginRes)}`);
    }

    // 8. Test candidate first-login with real temp password
    console.log('\n8. Setting test temp credentials to verify full login flow...');
    const knownTempPass = 'TempPass!998';
    candidateInDb.passwordHash = await bcrypt.hash(knownTempPass, 10);
    candidateInDb.tempCredential.expiresAt = new Date(Date.now() + 72 * 3600 * 1000);
    candidateInDb.tempCredential.used = false;
    await candidateInDb.save();

    const firstLoginRes = await request('/candidate-auth/first-login', {
      method: 'POST',
      body: { email: testEmail, tempPassword: knownTempPass },
    });
    if (!firstLoginRes.ok || !firstLoginRes.data.resetToken) {
      throw new Error(`First login failed: ${JSON.stringify(firstLoginRes.data)}`);
    }
    const resetToken = firstLoginRes.data.resetToken;
    console.log('✅ First login succeeded, returned scoped resetToken');

    // 9. Verify replay prevention (tempCredential marked as used)
    console.log('\n9. Testing single-use replay protection...');
    const replayRes = await request('/candidate-auth/first-login', {
      method: 'POST',
      body: { email: testEmail, tempPassword: knownTempPass },
    });
    if (replayRes.status === 400 && replayRes.data.code === 'INVITE_ALREADY_USED') {
      console.log('✅ Temp credentials replay successfully rejected with 400 INVITE_ALREADY_USED');
    } else {
      throw new Error(`Replay protection failed: ${JSON.stringify(replayRes)}`);
    }

    // 10. Test password reset
    console.log('\n10. Setting permanent candidate password with scoped reset token...');
    const newPermanentPass = 'SecurePermanentPass123!';
    const setPassRes = await request('/candidate-auth/set-password', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resetToken}` },
      body: { newPassword: newPermanentPass },
    });
    if (!setPassRes.ok || !setPassRes.data.token) {
      throw new Error(`Set password failed: ${JSON.stringify(setPassRes.data)}`);
    }
    const candidateSessionToken = setPassRes.data.token;
    console.log('✅ Password reset succeeded. Received candidate session token');

    // 11. Test normal login with new password
    console.log('\n11. Testing normal candidate login with permanent password...');
    const normalLoginRes = await request('/candidate-auth/login', {
      method: 'POST',
      body: { email: testEmail, password: newPermanentPass },
    });
    if (!normalLoginRes.ok) throw new Error(`Normal login failed: ${JSON.stringify(normalLoginRes.data)}`);
    console.log('✅ Normal candidate login succeeded:', normalLoginRes.data.candidate);

    // 12. Security Test: Candidate token attempting to access employee route
    console.log('\n12. Testing security separation: Candidate token accessing employee /api/lead-generation...');
    const employeeAccessRes = await request('/lead-generation', {
      method: 'GET',
      headers: { Authorization: `Bearer ${candidateSessionToken}` },
    });
    if (employeeAccessRes.status === 403 || employeeAccessRes.status === 401) {
      console.log('✅ Candidate token access to employee route correctly forbidden (403/401)');
    } else {
      throw new Error(`SECURITY VIOLATION: Candidate token was allowed to access employee route: ${JSON.stringify(employeeAccessRes)}`);
    }

    // 13. Candidate accessing candidate route /api/candidate-auth/me
    console.log('\n13. Testing candidate accessing /api/candidate-auth/me...');
    const candidateMeRes = await request('/candidate-auth/me', {
      method: 'GET',
      headers: { Authorization: `Bearer ${candidateSessionToken}` },
    });
    if (!candidateMeRes.ok) throw new Error(`Candidate /me failed: ${JSON.stringify(candidateMeRes.data)}`);
    console.log('✅ Candidate /me access verified:', candidateMeRes.data.candidate.email);

    // 14. Test Resend Invite on pending lead
    console.log('\n14. Testing resend candidate invite on another converted lead...');
    const lead3Res = await request('/lead-generation', {
      method: 'POST',
      headers: authHeaders,
      body: {
        employeeName: 'Resend Test Lead',
        dailyResumeLeads: 30,
        dailyChatLeads: 3,
      },
    });
    const lead3Id = lead3Res.data.data._id;
    const resendEmail = `resend.${timestamp}@example.com`;

    await request(`/leads/${lead3Id}/convert-to-candidate`, {
      method: 'POST',
      headers: authHeaders,
      body: {
        email: resendEmail,
        firstName: 'Resend',
        lastName: 'User',
      },
    });

    const resendRes = await request(`/leads/${lead3Id}/resend-candidate-invite`, {
      method: 'POST',
      headers: authHeaders,
    });
    if (!resendRes.ok) throw new Error(`Resend invite failed: ${JSON.stringify(resendRes.data)}`);
    console.log('✅ Resend invite successful:', resendRes.data.message);

    console.log('\n========================================');
    console.log('🎉 ALL ACCEPTANCE CRITERIA VERIFIED 100%!');
    console.log('========================================\n');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTests();
