import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Candidate from './models/Candidate.js';
import Skill from './models/Skill.js';
import CandidateSkill from './models/CandidateSkill.js';
import Marketing from './models/Marketing.js';
import MarketingEntrySkill from './models/MarketingEntrySkill.js';
import User from './models/User.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'http://localhost:5002/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = options.headers || {};
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body instanceof FormData || typeof options.body === 'string'
      ? options.body
      : options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

// Minimal valid PDF generator for test purposes with specific text
function createSimplePdfBuffer(textContent) {
  const cleanText = textContent.replace(/[()\\]/g, ' ');
  const streamContent = `BT\n/F1 12 Tf\n50 700 Td\n(${cleanText}) Tj\nET`;
  const streamLen = Buffer.byteLength(streamContent);

  const obj1 = '1 0 obj\n<<\n  /Type /Catalog\n  /Pages 2 0 R\n>>\nendobj\n';
  const obj2 = '2 0 obj\n<<\n  /Type /Pages\n  /Kids [3 0 R]\n  /Count 1\n>>\nendobj\n';
  const obj3 = '3 0 obj\n<<\n  /Type /Page\n  /Parent 2 0 R\n  /MediaBox [0 0 612 792]\n  /Resources <<\n    /Font <<\n      /F1 <<\n        /Type /Font\n        /Subtype /Type1\n        /BaseFont /Helvetica\n      >>\n    >>\n  >>\n  /Contents 4 0 R\n>>\nendobj\n';
  const obj4 = `4 0 obj\n<<\n  /Length ${streamLen}\n>>\nstream\n${streamContent}\nendstream\nendobj\n`;

  const header = '%PDF-1.4\n';
  const offset1 = header.length;
  const offset2 = offset1 + obj1.length;
  const offset3 = offset2 + obj2.length;
  const offset4 = offset3 + obj3.length;
  const xrefOffset = offset4 + obj4.length;

  const xref = `xref\n0 5\n0000000000 65535 f \n${offset1.toString().padStart(10, '0')} 00000 n \n${offset2.toString().padStart(10, '0')} 00000 n \n${offset3.toString().padStart(10, '0')} 00000 n \n${offset4.toString().padStart(10, '0')} 00000 n \ntrailer\n<<\n  /Size 5\n  /Root 1 0 R\n>>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(header + obj1 + obj2 + obj3 + obj4 + xref, 'utf-8');
}

async function runVerification() {
  console.log('================================================================');
  console.log('  END-TO-END AUTOMATED TEST SUITE:');
  console.log('  Resume Skill Extraction + Marketing Entry Integration');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/crm-velvix');

  try {
    // 1. Employee Login
    console.log('1. Logging in as Admin/Employee...');
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@velvix.com', password: 'admin123' },
    });
    if (!loginRes.ok) throw new Error(`Login failed: ${JSON.stringify(loginRes.data)}`);
    const token = loginRes.data.data.token;
    const authHeaders = { Authorization: `Bearer ${token}` };
    console.log('   ✅ Logged in successfully\n');

    // 2. Create Candidate A
    const timestamp = Date.now();
    const candidateAEmail = `alex.rivers.${timestamp}@example.com`;
    console.log(`2. Creating Candidate A (${candidateAEmail})...`);
    const candidateA = await Candidate.create({
      firstName: 'Alex',
      lastName: 'Rivers',
      email: candidateAEmail,
      phone: '+1 555-0199',
      currentCity: 'Austin, TX',
      primarySkill: 'Full Stack Engineer',
      accountStatus: 'active',
      isOnboarded: true,
    });
    console.log(`   ✅ Candidate A created with ID: ${candidateA._id}\n`);

    // 3. Create Sample Resume PDF with Skill Variations
    // Contains: React.js, ReactJS, React, Node.js, NodeJS, Postgres, PostgreSQL, MongoDB, Docker, Git, AWS
    console.log('3. Preparing ATS Resume with skill variations (React.js, ReactJS, Node.js, Postgres, MongoDB, Docker, Git, AWS)...');
    const testUploadDir = path.join(__dirname, 'uploads', 'resumes');
    if (!fs.existsSync(testUploadDir)) fs.mkdirSync(testUploadDir, { recursive: true });

    const samplePdfText = 'Skills and Technologies: React.js, ReactJS, React, Node.js, NodeJS, Node, FastAPI, Python, Postgres, PostgreSQL, MongoDB, Docker, Git, AWS';
    const pdfBuffer = createSimplePdfBuffer(samplePdfText);
    const testPdfPath = path.join(testUploadDir, `test-resume-${timestamp}.pdf`);
    fs.writeFileSync(testPdfPath, pdfBuffer);

    // 4. Test Resume Upload via Multipart Form
    console.log('4. Uploading ATS Resume to POST /api/candidates/:id/resume...');
    const formData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    formData.append('resume', blob, `alex_rivers_ats_${timestamp}.pdf`);

    const uploadRes = await fetch(`${API_BASE}/candidates/${candidateA._id}/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const uploadData = await uploadRes.json();
    console.log(`   Upload HTTP Status: ${uploadRes.status}`);
    console.log(`   Server Response: ${uploadData.message}`);
    console.log(`   Parsing Status: ${uploadData.parsingStatus}`);
    console.log(`   Total Extracted Skills: ${uploadData.total}`);

    if (uploadData.parsingStatus !== 'COMPLETED') {
      throw new Error(`Expected COMPLETED parsing status, got ${uploadData.parsingStatus}`);
    }
    console.log('   ✅ Automatic Resume parsing & skill extraction SUCCEEDED on upload\n');

    // 5. Test GET Candidate Skills API
    console.log('5. Fetching stored skills via GET /api/candidates/:id/skills...');
    const getSkillsRes = await request(`/candidates/${candidateA._id}/skills`, {
      headers: authHeaders,
    });
    if (!getSkillsRes.ok) throw new Error(`GET skills failed: ${JSON.stringify(getSkillsRes.data)}`);
    const fetchedSkills = getSkillsRes.data.skills;
    console.log(`   Retrieved ${fetchedSkills.length} structured skills:`);
    fetchedSkills.forEach((s) => {
      console.log(`     - [${s.category}] ${s.name} (norm: ${s.normalizedName}, source: ${s.source}, conf: ${s.confidence})`);
    });

    // Verify deduplication: React should appear ONLY ONCE, Node.js ONLY ONCE, PostgreSQL ONLY ONCE
    const reactCount = fetchedSkills.filter((s) => s.name === 'React').length;
    const nodeCount = fetchedSkills.filter((s) => s.name === 'Node.js').length;
    const postgresCount = fetchedSkills.filter((s) => s.name === 'PostgreSQL').length;
    console.log(`   Deduplication verification: React count = ${reactCount}, Node.js count = ${nodeCount}, PostgreSQL count = ${postgresCount}`);
    if (reactCount !== 1 || nodeCount !== 1 || postgresCount !== 1) {
      throw new Error(`Deduplication failed! React: ${reactCount}, Node: ${nodeCount}, Postgres: ${postgresCount}`);
    }
    console.log('   ✅ Normalization & Deduplication verified: Zero duplicate skill variations\n');

    // 6. Test Manually Adding a Skill
    console.log('6. Adding a manual skill (Leadership in Other) to Candidate A...');
    const addManualRes = await request(`/candidates/${candidateA._id}/skills`, {
      method: 'POST',
      headers: authHeaders,
      body: { name: 'Leadership', category: 'Other' },
    });
    if (!addManualRes.ok) throw new Error(`Add manual skill failed: ${JSON.stringify(addManualRes.data)}`);
    console.log(`   ✅ Manual skill added: ${addManualRes.data.skill.name} (source: ${addManualRes.data.skill.source})\n`);

    // 7. Test Re-upload with Different Resume Content
    // New Resume has: Angular, Python, Redis
    // Must replace resume skills, but PRESERVE the manual skill "Leadership"!
    console.log('7. Re-uploading a new resume with Angular, Python, Redis to test replacement behavior...');
    const newPdfText = 'Core Technical Skills: Angular, Python, Redis';
    const newPdfBuffer = createSimplePdfBuffer(newPdfText);
    const newFormData = new FormData();
    newFormData.append('resume', new Blob([newPdfBuffer], { type: 'application/pdf' }), `alex_new_${timestamp}.pdf`);

    const reuploadRes = await fetch(`${API_BASE}/candidates/${candidateA._id}/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: newFormData,
    });
    const reuploadData = await reuploadRes.json();
    console.log(`   Re-upload Response: ${reuploadData.message}`);

    const skillsAfterReupload = await request(`/candidates/${candidateA._id}/skills`, { headers: authHeaders });
    const skillsList = skillsAfterReupload.data.skills;
    console.log(`   Candidate skills after new resume:`);
    skillsList.forEach((s) => console.log(`     - ${s.name} (${s.source})`));

    const hasAngular = skillsList.some((s) => s.name === 'Angular' && s.source === 'resume');
    const hasRedis = skillsList.some((s) => s.name === 'Redis' && s.source === 'resume');
    const hasManualLeadership = skillsList.some((s) => s.name === 'Leadership' && s.source === 'manual');
    const oldReact = skillsList.find((s) => s.name === 'React');

    console.log(`   Verification: Angular present? ${hasAngular}, Redis present? ${hasRedis}, Manual Leadership preserved? ${hasManualLeadership}, Old React removed? ${!oldReact}`);
    if (!hasAngular || !hasRedis || !hasManualLeadership || oldReact) {
      throw new Error('Re-upload replacement logic failed to properly update resume skills or preserve manual skills');
    }
    console.log('   ✅ Re-upload behavior verified: Obsolete resume skills replaced, manual skill preserved!\n');

    // 8. Test Candidate B (Candidate with NO resume / NO skills)
    console.log('8. Testing Candidate B (no resume uploaded yet)...');
    const candidateB = await Candidate.create({
      firstName: 'Jordan',
      lastName: 'Taylor',
      email: `jordan.taylor.${timestamp}@example.com`,
      accountStatus: 'invited',
    });
    const candidateBSkillsRes = await request(`/candidates/${candidateB._id}/skills`, { headers: authHeaders });
    console.log(`   Candidate B skills total: ${candidateBSkillsRes.data.total}, parsingStatus: ${candidateBSkillsRes.data.parsingStatus}`);
    if (candidateBSkillsRes.data.total !== 0) {
      throw new Error('Candidate B should have 0 skills');
    }
    console.log('   ✅ Candidate without resume handled correctly\n');

    // 9. Test Marketing Entry Integration
    console.log('9. Creating a Marketing Entry for Candidate A with selected skills...');
    // Candidate A has: Angular, Python, Redis, Leadership
    // Marketing requirement: "Angular Developer" -> select Angular and Redis
    const angularSkill = skillsList.find((s) => s.name === 'Angular');
    const redisSkill = skillsList.find((s) => s.name === 'Redis');

    const selectedMarketingSkills = [
      { skillId: angularSkill.id, name: angularSkill.name, category: angularSkill.category },
      { skillId: redisSkill.id, name: redisSkill.name, category: redisSkill.category },
    ];

    const createMarketingRes = await request('/marketing', {
      method: 'POST',
      headers: authHeaders,
      body: {
        employeeName: 'Sarah Jenkins',
        teamLeaderName: 'General',
        entryDate: new Date().toISOString().split('T')[0],
        longApplicationsSubmitted: 10,
        easyApplicationsSubmitted: 15,
        candidates: [
          {
            candidateId: candidateA._id,
            candidateName: 'Alex Rivers',
            candidateEmail: candidateA.email,
            jobTitle: 'Angular Developer',
            experienceYears: 5,
            experienceMonths: 0,
            selectedSkills: selectedMarketingSkills,
          },
        ],
        selectedSkills: selectedMarketingSkills,
      },
    });

    if (!createMarketingRes.ok) throw new Error(`Create marketing entry failed: ${JSON.stringify(createMarketingRes.data)}`);
    const marketingId = createMarketingRes.data.data._id;
    console.log(`   ✅ Marketing Entry created with ID: ${marketingId}`);

    // Verify snapshot in MarketingEntrySkill collection
    const entrySkillsInDb = await MarketingEntrySkill.find({ marketingEntry: marketingId });
    console.log(`   Saved MarketingEntrySkills count in DB: ${entrySkillsInDb.length}`);
    entrySkillsInDb.forEach((s) => console.log(`     - Skill: ${s.name} (${s.category})`));
    if (entrySkillsInDb.length !== 2) {
      throw new Error(`Expected 2 MarketingEntrySkills in DB, found ${entrySkillsInDb.length}`);
    }
    console.log('   ✅ Marketing entry skills snapshot verified in database\n');

    // 10. Verify Marketing Entry Stability when Candidate Skills Change
    console.log('10. Verifying Marketing Entry snapshot does NOT change when candidate updates resume later...');
    // Add new skill or remove skill from candidate
    await CandidateSkill.deleteMany({ candidate: candidateA._id }); // simulate resume wipe or update
    const candidateSkillsNow = await CandidateSkill.find({ candidate: candidateA._id });
    console.log(`    Candidate current skills in DB: ${candidateSkillsNow.length}`);

    // Fetch the marketing entry: should still retain Angular and Redis!
    const fetchMarketingRes = await request(`/marketing/${marketingId}`, { headers: authHeaders });
    const savedEntry = fetchMarketingRes.data.data;
    const entryCandidateSkills = savedEntry.candidates[0]?.selectedSkills || savedEntry.selectedSkills || [];
    console.log(`    Marketing Entry retained selected skills: ${entryCandidateSkills.map((s) => s.name).join(', ')}`);
    if (entryCandidateSkills.length !== 2) {
      throw new Error('Marketing entry lost its saved skills after candidate skill changes!');
    }
    console.log('   ✅ Critical requirement verified: Marketing Entry retains selected skills snapshot!\n');

    // 11. Cleanup test files & test candidates
    console.log('11. Cleaning up test artifacts...');
    if (fs.existsSync(testPdfPath)) fs.unlinkSync(testPdfPath);
    await Candidate.deleteMany({ _id: { $in: [candidateA._id, candidateB._id] } });
    await CandidateSkill.deleteMany({ candidate: { $in: [candidateA._id, candidateB._id] } });
    await Marketing.findByIdAndDelete(marketingId);
    await MarketingEntrySkill.deleteMany({ marketingEntry: marketingId });
    console.log('   ✅ Cleanup complete\n');

    console.log('================================================================');
    console.log('  🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY! (11/11)');
    console.log('================================================================');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

runVerification();
