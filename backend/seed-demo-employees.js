import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import LeadGeneration from './models/LeadGeneration.js';
import Candidate from './models/Candidate.js';
import Marketing from './models/Marketing.js';
import UserActivityLog from './models/UserActivityLog.js';
import { calculateLeadGenerationMetrics } from './utils/calculations.js';

dotenv.config({ path: './.env' });

const DEMO_EMAILS = [
  'aarav.sharma@velvix.com',
  'priya.mehta@velvix.com',
  'rohan.verma@velvix.com',
  'ananya.iyer@velvix.com',
  'devansh.joshi@velvix.com',
  'sneha.kulkarni@velvix.com',
  'vikram.malhotra@velvix.com',
  'neha.kapoor@velvix.com',
  'kabir.singhania@velvix.com',
  'rhea.deshmukh@velvix.com',
];

const DEMO_NAMES = [
  'Aarav Sharma',
  'Priya Mehta',
  'Rohan Verma',
  'Ananya Iyer',
  'Devansh Joshi',
  'Sneha Kulkarni',
  'Vikram Malhotra',
  'Neha Kapoor',
  'Kabir Singhania',
  'Rhea Deshmukh',
];

async function seedDemoEmployees() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in .env');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.');

    // Find admin user to set as creator
    const adminUser = await User.findOne({ role: 'admin' });
    const adminId = adminUser?._id || new mongoose.Types.ObjectId();

    // 1. Clean up prior demo data if exists
    console.log('Cleaning up previous demo records if any...');
    const existingDemoUsers = await User.find({ email: { $in: DEMO_EMAILS } });
    const existingDemoUserIds = existingDemoUsers.map((u) => u._id);

    if (existingDemoUserIds.length > 0) {
      await LeadGeneration.deleteMany({
        $or: [
          { createdBy: { $in: existingDemoUserIds } },
          { employeeName: { $in: DEMO_NAMES } },
        ],
      });
      await Candidate.deleteMany({
        $or: [
          { convertedBy: { $in: existingDemoUserIds } },
          { email: { $regex: /@democandidate\.com$/i } },
        ],
      });
      await Marketing.deleteMany({
        $or: [
          { createdBy: { $in: existingDemoUserIds } },
          { employeeName: { $in: DEMO_NAMES } },
        ],
      });
      await UserActivityLog.deleteMany({
        userId: { $in: existingDemoUserIds },
      });
      await User.deleteMany({ _id: { $in: existingDemoUserIds } });
      console.log(`Cleaned up ${existingDemoUserIds.length} previous demo employees and their records.`);
    }

    // 2. Hash default password for demo employees: Velvix@123
    const hashedPassword = await bcrypt.hash('Velvix@123', 12);

    // 3. Define 10 Demo Employees
    const demoEmployeesDefs = [
      {
        name: 'Aarav Sharma',
        email: 'aarav.sharma@velvix.com',
        mobileNumber: '+1 (555) 234-5671',
        designation: 'Senior Lead Gen Specialist',
        role: 'lead_gen',
        allowedModules: ['lead_generation', 'leads'],
      },
      {
        name: 'Priya Mehta',
        email: 'priya.mehta@velvix.com',
        mobileNumber: '+1 (555) 345-6782',
        designation: 'Senior Sales Executive',
        role: 'sales',
        allowedModules: ['leads'],
      },
      {
        name: 'Rohan Verma',
        email: 'rohan.verma@velvix.com',
        mobileNumber: '+1 (555) 456-7893',
        designation: 'Sales Representative',
        role: 'sales',
        allowedModules: ['leads'],
      },
      {
        name: 'Ananya Iyer',
        email: 'ananya.iyer@velvix.com',
        mobileNumber: '+1 (555) 567-8904',
        designation: 'Technical Recruiter & Marketing Lead',
        role: 'marketing',
        allowedModules: ['candidates', 'marketing'],
      },
      {
        name: 'Devansh Joshi',
        email: 'devansh.joshi@velvix.com',
        mobileNumber: '+1 (555) 678-9015',
        designation: 'Lead Research Specialist',
        role: 'lead_gen',
        allowedModules: ['lead_generation'],
      },
      {
        name: 'Sneha Kulkarni',
        email: 'sneha.kulkarni@velvix.com',
        mobileNumber: '+1 (555) 789-0126',
        designation: 'Sales & Outreach Executive',
        role: 'sales',
        allowedModules: ['leads', 'candidates'],
      },
      {
        name: 'Vikram Malhotra',
        email: 'vikram.malhotra@velvix.com',
        mobileNumber: '+1 (555) 890-1237',
        designation: 'Talent Acquisition Specialist',
        role: 'marketing',
        allowedModules: ['candidates', 'marketing'],
      },
      {
        name: 'Neha Kapoor',
        email: 'neha.kapoor@velvix.com',
        mobileNumber: '+1 (555) 901-2348',
        designation: 'Lead Generation Associate',
        role: 'lead_gen',
        allowedModules: ['lead_generation', 'leads'],
      },
      {
        name: 'Kabir Singhania',
        email: 'kabir.singhania@velvix.com',
        mobileNumber: '+1 (555) 012-3459',
        designation: 'Calling Specialist',
        role: 'sales',
        allowedModules: ['leads'],
      },
      {
        name: 'Rhea Deshmukh',
        email: 'rhea.deshmukh@velvix.com',
        mobileNumber: '+1 (555) 123-4560',
        designation: 'Junior Associate (New Joiner)',
        role: 'employee',
        allowedModules: ['lead_generation', 'leads'],
      },
    ];

    console.log('Inserting 10 demo employees...');
    const createdUsers = [];
    for (const empDef of demoEmployeesDefs) {
      const user = await User.create({
        name: empDef.name,
        email: empDef.email,
        password: hashedPassword,
        mobileNumber: empDef.mobileNumber,
        designation: empDef.designation,
        role: empDef.role,
        allowedModules: empDef.allowedModules,
        status: 'Active',
        isActive: true,
        accountStatus: 'active',
        mustResetPassword: false,
        createdBy: adminId,
        lastLogin: new Date(Date.now() - Math.floor(Math.random() * 48) * 3600 * 1000),
      });
      createdUsers.push(user);
    }
    console.log(`Created ${createdUsers.length} demo employees.`);

    const userMap = {};
    createdUsers.forEach((u) => {
      userMap[u.email] = u;
    });

    const aarav = userMap['aarav.sharma@velvix.com'];
    const priya = userMap['priya.mehta@velvix.com'];
    const rohan = userMap['rohan.verma@velvix.com'];
    const ananya = userMap['ananya.iyer@velvix.com'];
    const devansh = userMap['devansh.joshi@velvix.com'];
    const sneha = userMap['sneha.kulkarni@velvix.com'];
    const vikram = userMap['vikram.malhotra@velvix.com'];
    const neha = userMap['neha.kapoor@velvix.com'];
    const kabir = userMap['kabir.singhania@velvix.com'];
    const rhea = userMap['rhea.deshmukh@velvix.com'];

    // 4. Create realistic work records

    // --- WORK FOR AARAV SHARMA (Top Lead Gen: 14 leads across 4 batches, 4 calls logged) ---
    console.log('Generating test work for Aarav Sharma...');
    const aaravLead1Metrics = calculateLeadGenerationMetrics({ dailyResumeLeads: 4, dailyChatLeads: 1 });
    const aaravLead1 = await LeadGeneration.create({
      employeeName: aarav.name,
      linkedInAccountsCount: 2,
      linkedInProfileNames: 'aarav-sharma-talent',
      connectionsRange: ['200+'],
      leadSource: 'LinkedIn',
      assignedTo: priya._id,
      dailyResumeLeads: 4,
      dailyChatLeads: 1,
      ...aaravLead1Metrics,
      entryDate: new Date(),
      createdBy: aarav._id,
      linkedInProfiles: [
        {
          profileName: 'Amit Trivedi - Principal Java Engineer',
          url: 'https://linkedin.com/in/demo-amit-trivedi',
          email: 'amit.trivedi@democandidate.com',
          phone: '+1 (555) 432-1098',
          lastCallStatus: 'picked_up',
          lastCallDuration: '04:15',
          isInterested: true,
          interestStatus: 'Interested',
          callCount: 2,
        },
        {
          profileName: 'Sara Khan - Cloud DevOps Architect',
          url: 'https://linkedin.com/in/demo-sara-khan',
          email: 'sara.khan@democandidate.com',
          phone: '+1 (555) 765-4321',
          lastCallStatus: 'picked_up',
          lastCallDuration: '03:40',
          isInterested: true,
          interestStatus: 'Interested',
          callCount: 1,
        },
        {
          profileName: 'Karan Mehra - Full Stack React / Node Lead',
          url: 'https://linkedin.com/in/demo-karan-mehra',
          email: 'karan.mehra@democandidate.com',
          phone: '+1 (555) 876-5432',
          lastCallStatus: 'voicemail',
          lastCallDuration: '00:45',
          isInterested: false,
          interestStatus: 'Pending',
          callCount: 1,
        },
        {
          profileName: 'Deepa Roy - Data Engineer Snowflake',
          url: 'https://linkedin.com/in/demo-deepa-roy',
          email: 'deepa.roy@democandidate.com',
          phone: '+1 (555) 987-6543',
          lastCallStatus: 'not_called',
          callCount: 0,
        },
      ],
      callLogs: [
        {
          profileName: 'Amit Trivedi - Principal Java Engineer',
          phone: '+1 (555) 432-1098',
          callerId: aarav._id,
          callerName: aarav.name,
          callDate: new Date(Date.now() - 3 * 3600 * 1000),
          callDuration: '04:15',
          callDurationSeconds: 255,
          outcome: 'picked_up',
          isInterested: true,
          interestStatus: 'Interested',
          notes: 'Candidate has 10+ years Java/Spring Boot experience, open to remote US contracts.',
        },
        {
          profileName: 'Sara Khan - Cloud DevOps Architect',
          phone: '+1 (555) 765-4321',
          callerId: aarav._id,
          callerName: aarav.name,
          callDate: new Date(Date.now() - 5 * 3600 * 1000),
          callDuration: '03:40',
          callDurationSeconds: 220,
          outcome: 'picked_up',
          isInterested: true,
          interestStatus: 'Interested',
          notes: 'AWS & Kubernetes certified, looking for immediate C2C placement.',
        },
        {
          profileName: 'Karan Mehra - Full Stack React / Node Lead',
          phone: '+1 (555) 876-5432',
          callerId: aarav._id,
          callerName: aarav.name,
          callDate: new Date(Date.now() - 7 * 3600 * 1000),
          callDuration: '00:45',
          callDurationSeconds: 45,
          outcome: 'voicemail',
          isInterested: false,
          interestStatus: 'Pending',
          notes: 'Left voicemail regarding senior contract roles.',
        },
        {
          profileName: 'Deepa Roy - Data Engineer Snowflake',
          phone: '+1 (555) 987-6543',
          callerId: aarav._id,
          callerName: aarav.name,
          callDate: new Date(Date.now() - 10 * 3600 * 1000),
          callDuration: '00:20',
          callDurationSeconds: 20,
          outcome: 'call_cut',
          isInterested: false,
          interestStatus: 'Pending',
          notes: 'Call disconnected after 2 rings.',
        },
      ],
      notes: 'High-value senior technical profiles sourced via LinkedIn Recruiter.',
    });

    const aaravLead2Metrics = calculateLeadGenerationMetrics({ dailyResumeLeads: 5, dailyChatLeads: 2 });
    await LeadGeneration.create({
      employeeName: aarav.name,
      linkedInAccountsCount: 2,
      connectionsRange: ['100-200'],
      leadSource: 'Dice',
      assignedTo: rohan._id,
      dailyResumeLeads: 5,
      dailyChatLeads: 2,
      ...aaravLead2Metrics,
      entryDate: new Date(Date.now() - 24 * 3600 * 1000),
      createdBy: aarav._id,
      linkedInProfiles: [
        { profileName: 'Nitin Rao - SAP HANA Architect', email: 'nitin.rao@democandidate.com', phone: '+1 (555) 111-2233' },
        { profileName: 'Divya Nambiar - Salesforce Technical Architect', email: 'divya.n@democandidate.com', phone: '+1 (555) 222-3344' },
        { profileName: 'Tanvi Shah - Lead QA Automation', email: 'tanvi.s@democandidate.com', phone: '+1 (555) 333-4455' },
        { profileName: 'Rahul Bhatia - Cybersecurity Specialist', email: 'rahul.b@democandidate.com', phone: '+1 (555) 444-5566' },
        { profileName: 'Manoj Pillai - Senior Python Developer', email: 'manoj.p@democandidate.com', phone: '+1 (555) 555-6677' },
      ],
      notes: 'Dice verified tech candidates with active availability.',
    });

    const aaravLead3Metrics = calculateLeadGenerationMetrics({ dailyResumeLeads: 5, dailyChatLeads: 0 });
    await LeadGeneration.create({
      employeeName: aarav.name,
      linkedInAccountsCount: 2,
      connectionsRange: ['200+'],
      leadSource: 'Indeed',
      assignedTo: sneha._id,
      dailyResumeLeads: 5,
      dailyChatLeads: 0,
      ...aaravLead3Metrics,
      entryDate: new Date(Date.now() - 48 * 3600 * 1000),
      createdBy: aarav._id,
      linkedInProfiles: [
        { profileName: 'Anil Gupta - AWS Cloud Architect', email: 'anil.g@democandidate.com', phone: '+1 (555) 666-7788' },
        { profileName: 'Pooja Reddy - Golang Backend Engineer', email: 'pooja.r@democandidate.com', phone: '+1 (555) 777-8899' },
        { profileName: 'Varun Sen - Mobile App Flutter Lead', email: 'varun.s@democandidate.com', phone: '+1 (555) 888-9900' },
        { profileName: 'Meera Chawla - Product Manager', email: 'meera.c@democandidate.com', phone: '+1 (555) 999-0011' },
        { profileName: 'Kunal Kapoor - Site Reliability Engineer', email: 'kunal.k@democandidate.com', phone: '+1 (555) 123-9876' },
      ],
      notes: 'Indeed active resumes downloaded.',
    });

    // Convert one profile to candidate for Aarav
    const candAarav = await Candidate.create({
      firstName: 'Amit',
      lastName: 'Trivedi',
      email: 'amit.trivedi@democandidate.com',
      phone: '+1 (555) 432-1098',
      sourceLeadId: aaravLead1._id,
      convertedBy: aarav._id,
      convertedAt: new Date(Date.now() - 2 * 3600 * 1000),
      currentCity: 'Dallas, TX',
      preferredJobTitles: ['Principal Java Engineer', 'Software Architect'],
      visaStatus: 'US Citizen',
      accountStatus: 'active',
      mustResetPassword: false,
    });
    aaravLead1.convertedToCandidateId = candAarav._id;
    aaravLead1.convertedCandidateIds = [candAarav._id];
    aaravLead1.convertedAt = new Date();
    await aaravLead1.save();

    await UserActivityLog.create({
      userId: aarav._id,
      userName: aarav.name,
      userRole: aarav.role,
      module: 'lead_generation',
      actionType: 'lead_created',
      title: 'Sourced 14 leads across LinkedIn, Dice, and Indeed',
      description: 'Added high-value IT profiles with contact numbers and LinkedIn URLs',
      timestamp: new Date(),
    });

    // --- WORK FOR PRIYA MEHTA (Top Sales: 16 calls, 3 candidate conversions) ---
    console.log('Generating test work for Priya Mehta...');
    const priyaLead = await LeadGeneration.create({
      employeeName: priya.name,
      linkedInAccountsCount: 1,
      connectionsRange: ['100-200'],
      leadSource: 'LinkedIn',
      assignedTo: priya._id,
      dailyResumeLeads: 2,
      dailyChatLeads: 1,
      entryDate: new Date(),
      createdBy: priya._id,
      linkedInProfiles: [
        {
          profileName: 'Rajesh Singhal - Data Architect',
          email: 'rajesh.singhal@democandidate.com',
          phone: '+1 (555) 234-8901',
          lastCallStatus: 'picked_up',
          lastCallDuration: '05:30',
          isInterested: true,
          interestStatus: 'Interested',
          callCount: 3,
        },
        {
          profileName: 'Simran Bajaj - Senior Scrum Master',
          email: 'simran.bajaj@democandidate.com',
          phone: '+1 (555) 345-9012',
          lastCallStatus: 'picked_up',
          lastCallDuration: '04:10',
          isInterested: true,
          interestStatus: 'Interested',
          callCount: 2,
        },
        {
          profileName: 'Naveen Kumar - Senior Machine Learning Engineer',
          email: 'naveen.kumar@democandidate.com',
          phone: '+1 (555) 456-0123',
          lastCallStatus: 'picked_up',
          lastCallDuration: '06:20',
          isInterested: true,
          interestStatus: 'Interested',
          callCount: 2,
        },
        {
          profileName: 'Gaurav Sethi - Oracle DBA Lead',
          email: 'gaurav.sethi@democandidate.com',
          phone: '+1 (555) 567-1234',
          lastCallStatus: 'voicemail',
          lastCallDuration: '00:35',
          isInterested: false,
          interestStatus: 'Pending',
          callCount: 1,
        },
      ],
      callLogs: [
        {
          profileName: 'Rajesh Singhal - Data Architect',
          phone: '+1 (555) 234-8901',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 1 * 3600 * 1000),
          callDuration: '05:30',
          callDurationSeconds: 330,
          outcome: 'picked_up',
          isInterested: true,
          interestStatus: 'Interested',
          notes: 'Candidate looking for C2C or W2 contract roles. Resume received.',
        },
        {
          profileName: 'Simran Bajaj - Senior Scrum Master',
          phone: '+1 (555) 345-9012',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 2 * 3600 * 1000),
          callDuration: '04:10',
          callDurationSeconds: 250,
          outcome: 'picked_up',
          isInterested: true,
          interestStatus: 'Interested',
          notes: 'Agile coach with 8 yrs experience. Interested in financial domain.',
        },
        {
          profileName: 'Naveen Kumar - Senior Machine Learning Engineer',
          phone: '+1 (555) 456-0123',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 3 * 3600 * 1000),
          callDuration: '06:20',
          callDurationSeconds: 380,
          outcome: 'picked_up',
          isInterested: true,
          interestStatus: 'Interested',
          notes: 'PyTorch and LLM deployment expertise. Discussed hourly rate $95/hr.',
        },
        {
          profileName: 'Gaurav Sethi - Oracle DBA Lead',
          phone: '+1 (555) 567-1234',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 4 * 3600 * 1000),
          callDuration: '00:35',
          callDurationSeconds: 35,
          outcome: 'voicemail',
          isInterested: false,
          interestStatus: 'Pending',
          notes: 'Voicemail dropped.',
        },
        {
          profileName: 'Priya Outreach Call 5',
          phone: '+1 (555) 678-2345',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 6 * 3600 * 1000),
          callDuration: '03:15',
          callDurationSeconds: 195,
          outcome: 'picked_up',
          isInterested: true,
          interestStatus: 'Interested',
          notes: 'Interested in Java backend positions.',
        },
        {
          profileName: 'Priya Outreach Call 6',
          phone: '+1 (555) 789-3456',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 8 * 3600 * 1000),
          callDuration: '02:45',
          callDurationSeconds: 165,
          outcome: 'picked_up',
          isInterested: true,
          interestStatus: 'Interested',
          notes: 'Agreed to send updated resume.',
        },
        {
          profileName: 'Priya Outreach Call 7',
          phone: '+1 (555) 890-4567',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 10 * 3600 * 1000),
          callDuration: '04:00',
          callDurationSeconds: 240,
          outcome: 'picked_up',
          isInterested: true,
          interestStatus: 'Interested',
          notes: 'QA automation lead looking for immediate placement.',
        },
        {
          profileName: 'Priya Outreach Call 8',
          phone: '+1 (555) 901-5678',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 12 * 3600 * 1000),
          callDuration: '00:50',
          callDurationSeconds: 50,
          outcome: 'voicemail',
          isInterested: false,
          interestStatus: 'Pending',
          notes: 'Voicemail message left.',
        },
        {
          profileName: 'Priya Outreach Call 9',
          phone: '+1 (555) 012-6789',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 14 * 3600 * 1000),
          callDuration: '00:00',
          callDurationSeconds: 0,
          outcome: 'not_answered',
          isInterested: false,
          interestStatus: 'Pending',
          notes: 'Ring, no answer.',
        },
        {
          profileName: 'Priya Outreach Call 10',
          phone: '+1 (555) 123-7890',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 16 * 3600 * 1000),
          callDuration: '00:00',
          callDurationSeconds: 0,
          outcome: 'not_answered',
          isInterested: false,
          interestStatus: 'Pending',
          notes: 'No answer.',
        },
        {
          profileName: 'Priya Outreach Call 11',
          phone: '+1 (555) 234-8902',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 18 * 3600 * 1000),
          callDuration: '00:30',
          callDurationSeconds: 30,
          outcome: 'call_cut',
          isInterested: false,
          interestStatus: 'Not Interested',
          notes: 'Not looking for new opportunities currently.',
        },
        {
          profileName: 'Priya Outreach Call 12',
          phone: '+1 (555) 345-9013',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 20 * 3600 * 1000),
          callDuration: '03:30',
          callDurationSeconds: 210,
          outcome: 'picked_up',
          isInterested: true,
          interestStatus: 'Interested',
          notes: 'Discussion about upcoming contracts in Atlanta.',
        },
        {
          profileName: 'Priya Outreach Call 13',
          phone: '+1 (555) 456-0124',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 22 * 3600 * 1000),
          callDuration: '00:40',
          callDurationSeconds: 40,
          outcome: 'voicemail',
          isInterested: false,
          interestStatus: 'Pending',
          notes: 'Voicemail left.',
        },
        {
          profileName: 'Priya Outreach Call 14',
          phone: '+1 (555) 567-1235',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 24 * 3600 * 1000),
          callDuration: '04:10',
          callDurationSeconds: 250,
          outcome: 'picked_up',
          isInterested: true,
          interestStatus: 'Interested',
          notes: 'Salesforce developer available for C2C.',
        },
        {
          profileName: 'Priya Outreach Call 15',
          phone: '+1 (555) 678-2346',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 26 * 3600 * 1000),
          callDuration: '00:00',
          callDurationSeconds: 0,
          outcome: 'not_answered',
          isInterested: false,
          interestStatus: 'Pending',
          notes: 'No response.',
        },
        {
          profileName: 'Priya Outreach Call 16',
          phone: '+1 (555) 789-3457',
          callerId: priya._id,
          callerName: priya.name,
          callDate: new Date(Date.now() - 28 * 3600 * 1000),
          callDuration: '05:00',
          callDurationSeconds: 300,
          outcome: 'picked_up',
          isInterested: true,
          interestStatus: 'Interested',
          notes: 'Cloud security engineer onboarded.',
        },
      ],
      notes: 'Sales pipeline calling and onboarding calls.',
    });

    // 3 Candidate conversions for Priya
    const candPriya1 = await Candidate.create({
      firstName: 'Rajesh',
      lastName: 'Singhal',
      email: 'rajesh.singhal@democandidate.com',
      phone: '+1 (555) 234-8901',
      sourceLeadId: priyaLead._id,
      convertedBy: priya._id,
      convertedAt: new Date(Date.now() - 1 * 3600 * 1000),
      currentCity: 'Austin, TX',
      preferredJobTitles: ['Data Architect', 'Big Data Lead'],
      visaStatus: 'Green Card',
      accountStatus: 'active',
      mustResetPassword: false,
    });
    const candPriya2 = await Candidate.create({
      firstName: 'Simran',
      lastName: 'Bajaj',
      email: 'simran.bajaj@democandidate.com',
      phone: '+1 (555) 345-9012',
      sourceLeadId: priyaLead._id,
      convertedBy: priya._id,
      convertedAt: new Date(Date.now() - 3 * 3600 * 1000),
      currentCity: 'Charlotte, NC',
      preferredJobTitles: ['Senior Scrum Master', 'Agile Coach'],
      visaStatus: 'H1B',
      accountStatus: 'active',
      mustResetPassword: false,
    });
    const candPriya3 = await Candidate.create({
      firstName: 'Naveen',
      lastName: 'Kumar',
      email: 'naveen.kumar@democandidate.com',
      phone: '+1 (555) 456-0123',
      sourceLeadId: priyaLead._id,
      convertedBy: priya._id,
      convertedAt: new Date(Date.now() - 5 * 3600 * 1000),
      currentCity: 'San Jose, CA',
      preferredJobTitles: ['Senior ML Engineer', 'AI Research Engineer'],
      visaStatus: 'US Citizen',
      accountStatus: 'active',
      mustResetPassword: false,
    });

    priyaLead.convertedCandidateIds = [candPriya1._id, candPriya2._id, candPriya3._id];
    await priyaLead.save();

    await UserActivityLog.create({
      userId: priya._id,
      userName: priya.name,
      userRole: priya.role,
      module: 'leads',
      actionType: 'candidate_converted',
      title: 'Converted 3 IT candidates from sales calling pipeline',
      description: 'Onboarded Rajesh Singhal, Simran Bajaj, and Naveen Kumar to candidate bench',
      timestamp: new Date(),
    });

    // --- WORK FOR ANANYA IYER (Top Marketing: 25 applications, 6 interviews) ---
    console.log('Generating test work for Ananya Iyer...');
    await Marketing.create({
      teamLeaderName: 'General Marketing',
      employeeName: ananya.name,
      candidates: [
        { candidateName: 'Amit Trivedi', candidateEmail: 'amit.trivedi@democandidate.com', jobTitle: 'Principal Java Engineer', experienceYears: 10, experienceMonths: 4 },
        { candidateName: 'Rajesh Singhal', candidateEmail: 'rajesh.singhal@democandidate.com', jobTitle: 'Data Architect', experienceYears: 12, experienceMonths: 0 },
      ],
      longApplicationsSubmitted: 15,
      easyApplicationsSubmitted: 10,
      totalApplications: 25,
      assessmentsReceived: 5,
      screeningCallsCompleted: 8,
      totalInterviews: 6,
      interviewStages: [
        { stage: 'Round 1', scheduled: 4, completed: 3 },
        { stage: 'Round 2', scheduled: 2, completed: 2 },
        { stage: 'Round 3', scheduled: 1, completed: 1 },
      ],
      entryDate: new Date(),
      createdBy: ananya._id,
      notes: 'Client submissions on Fortune 500 portals for high-priority technical roles.',
    });

    await UserActivityLog.create({
      userId: ananya._id,
      userName: ananya.name,
      userRole: ananya.role,
      module: 'marketing',
      actionType: 'marketing_submitted',
      title: 'Submitted 25 client job applications with 6 interviews',
      description: 'High submission volume for Java and Data Architect bench candidates',
      timestamp: new Date(),
    });

    // --- WORK FOR ROHAN VERMA (Sales: 12 calls, 2 conversions) ---
    console.log('Generating test work for Rohan Verma...');
    const rohanLead = await LeadGeneration.create({
      employeeName: rohan.name,
      linkedInAccountsCount: 1,
      connectionsRange: ['50-100'],
      leadSource: 'Dice',
      assignedTo: rohan._id,
      dailyResumeLeads: 1,
      dailyChatLeads: 1,
      entryDate: new Date(),
      createdBy: rohan._id,
      linkedInProfiles: [
        { profileName: 'Tarun Verma - Android Architect', email: 'tarun.v@democandidate.com', phone: '+1 (555) 123-3456', lastCallStatus: 'picked_up', isInterested: true, interestStatus: 'Interested', callCount: 2 },
        { profileName: 'Shalini Roy - QA Lead Automation', email: 'shalini.r@democandidate.com', phone: '+1 (555) 234-4567', lastCallStatus: 'picked_up', isInterested: true, interestStatus: 'Interested', callCount: 2 },
      ],
      callLogs: Array.from({ length: 12 }).map((_, i) => ({
        profileName: i % 2 === 0 ? 'Tarun Verma - Android Architect' : 'Shalini Roy - QA Lead Automation',
        phone: `+1 (555) 345-${1000 + i}`,
        callerId: rohan._id,
        callerName: rohan.name,
        callDate: new Date(Date.now() - (i + 1) * 2 * 3600 * 1000),
        callDuration: i % 2 === 0 ? '03:45' : '01:30',
        callDurationSeconds: i % 2 === 0 ? 225 : 90,
        outcome: i % 3 === 0 ? 'picked_up' : i % 3 === 1 ? 'voicemail' : 'not_answered',
        isInterested: i % 3 === 0,
        interestStatus: i % 3 === 0 ? 'Interested' : 'Pending',
        notes: `Rohan sales outreach log #${i + 1}`,
      })),
      notes: 'Outreach to Dice software profiles.',
    });

    const candRohan1 = await Candidate.create({
      firstName: 'Tarun',
      lastName: 'Verma',
      email: 'tarun.v@democandidate.com',
      phone: '+1 (555) 123-3456',
      sourceLeadId: rohanLead._id,
      convertedBy: rohan._id,
      convertedAt: new Date(Date.now() - 4 * 3600 * 1000),
      currentCity: 'Seattle, WA',
      preferredJobTitles: ['Android Architect', 'Mobile Tech Lead'],
      visaStatus: 'US Citizen',
      accountStatus: 'active',
      mustResetPassword: false,
    });
    const candRohan2 = await Candidate.create({
      firstName: 'Shalini',
      lastName: 'Roy',
      email: 'shalini.r@democandidate.com',
      phone: '+1 (555) 234-4567',
      sourceLeadId: rohanLead._id,
      convertedBy: rohan._id,
      convertedAt: new Date(Date.now() - 6 * 3600 * 1000),
      currentCity: 'Chicago, IL',
      preferredJobTitles: ['QA Lead Automation', 'SDET Manager'],
      visaStatus: 'Green Card',
      accountStatus: 'active',
      mustResetPassword: false,
    });
    rohanLead.convertedCandidateIds = [candRohan1._id, candRohan2._id];
    await rohanLead.save();

    // --- WORK FOR DEVANSH JOSHI (Lead Gen: 9 leads) ---
    console.log('Generating test work for Devansh Joshi...');
    const devanshMetrics = calculateLeadGenerationMetrics({ dailyResumeLeads: 8, dailyChatLeads: 1 });
    await LeadGeneration.create({
      employeeName: devansh.name,
      linkedInAccountsCount: 2,
      connectionsRange: ['100-200'],
      leadSource: 'Indeed',
      assignedTo: rohan._id,
      dailyResumeLeads: 8,
      dailyChatLeads: 1,
      ...devanshMetrics,
      entryDate: new Date(),
      createdBy: devansh._id,
      linkedInProfiles: [
        { profileName: 'Akash Gupta - Python Backend Engineer', email: 'akash.g@democandidate.com', phone: '+1 (555) 345-5678' },
        { profileName: 'Preeti Sharma - React Specialist', email: 'preeti.s@democandidate.com', phone: '+1 (555) 456-6789' },
        { profileName: 'Sameer Sen - Database Administrator', email: 'sameer.s@democandidate.com', phone: '+1 (555) 567-7890' },
        { profileName: 'Kavita Joshi - UI/UX Designer', email: 'kavita.j@democandidate.com', phone: '+1 (555) 678-8901' },
        { profileName: 'Ritesh Varma - Security Analyst', email: 'ritesh.v@democandidate.com', phone: '+1 (555) 789-9012' },
        { profileName: 'Nisha Pillai - Scrum Master', email: 'nisha.p@democandidate.com', phone: '+1 (555) 890-0123' },
        { profileName: 'Manish Kumar - Node.js Developer', email: 'manish.k@democandidate.com', phone: '+1 (555) 901-1234' },
        { profileName: 'Shruti Desai - Business Analyst', email: 'shruti.d@democandidate.com', phone: '+1 (555) 012-2345' },
        { profileName: 'Harsh Vardhan - Cloud Architect', email: 'harsh.v@democandidate.com', phone: '+1 (555) 123-3450' },
      ],
      notes: 'Indeed technical resume downloads.',
    });

    // --- WORK FOR SNEHA KULKARNI (Sales: 10 calls, 2 conversions) ---
    console.log('Generating test work for Sneha Kulkarni...');
    const snehaLead = await LeadGeneration.create({
      employeeName: sneha.name,
      linkedInAccountsCount: 1,
      connectionsRange: ['50-100'],
      leadSource: 'Monster',
      assignedTo: sneha._id,
      dailyResumeLeads: 2,
      dailyChatLeads: 0,
      entryDate: new Date(),
      createdBy: sneha._id,
      linkedInProfiles: [
        { profileName: 'Sunil Rao - AWS Solutions Architect', email: 'sunil.r@democandidate.com', phone: '+1 (555) 111-9988', lastCallStatus: 'picked_up', isInterested: true, interestStatus: 'Interested', callCount: 2 },
        { profileName: 'Radha Patel - Data Analyst', email: 'radha.p@democandidate.com', phone: '+1 (555) 222-8877', lastCallStatus: 'picked_up', isInterested: true, interestStatus: 'Interested', callCount: 2 },
      ],
      callLogs: Array.from({ length: 10 }).map((_, i) => ({
        profileName: i % 2 === 0 ? 'Sunil Rao - AWS Solutions Architect' : 'Radha Patel - Data Analyst',
        phone: `+1 (555) 444-${2000 + i}`,
        callerId: sneha._id,
        callerName: sneha.name,
        callDate: new Date(Date.now() - (i + 1) * 3 * 3600 * 1000),
        callDuration: i % 2 === 0 ? '04:10' : '02:00',
        callDurationSeconds: i % 2 === 0 ? 250 : 120,
        outcome: i % 2 === 0 ? 'picked_up' : 'not_answered',
        isInterested: i % 2 === 0,
        interestStatus: i % 2 === 0 ? 'Interested' : 'Pending',
        notes: `Sneha outreach call #${i + 1}`,
      })),
      notes: 'Monster lead contact calls.',
    });

    const candSneha1 = await Candidate.create({
      firstName: 'Sunil',
      lastName: 'Rao',
      email: 'sunil.r@democandidate.com',
      phone: '+1 (555) 111-9988',
      sourceLeadId: snehaLead._id,
      convertedBy: sneha._id,
      convertedAt: new Date(Date.now() - 3 * 3600 * 1000),
      currentCity: 'Phoenix, AZ',
      preferredJobTitles: ['AWS Solutions Architect', 'Cloud Infrastructure Engineer'],
      visaStatus: 'US Citizen',
      accountStatus: 'active',
      mustResetPassword: false,
    });
    const candSneha2 = await Candidate.create({
      firstName: 'Radha',
      lastName: 'Patel',
      email: 'radha.p@democandidate.com',
      phone: '+1 (555) 222-8877',
      sourceLeadId: snehaLead._id,
      convertedBy: sneha._id,
      convertedAt: new Date(Date.now() - 5 * 3600 * 1000),
      currentCity: 'Denver, CO',
      preferredJobTitles: ['Data Analyst', 'BI Developer'],
      visaStatus: 'H1B',
      accountStatus: 'active',
      mustResetPassword: false,
    });
    snehaLead.convertedCandidateIds = [candSneha1._id, candSneha2._id];
    await snehaLead.save();

    // --- WORK FOR VIKRAM MALHOTRA (Marketing: 14 applications, 3 interviews) ---
    console.log('Generating test work for Vikram Malhotra...');
    await Marketing.create({
      teamLeaderName: 'General Marketing',
      employeeName: vikram.name,
      candidates: [
        { candidateName: 'Sunil Rao', candidateEmail: 'sunil.r@democandidate.com', jobTitle: 'AWS Solutions Architect', experienceYears: 9, experienceMonths: 6 },
      ],
      longApplicationsSubmitted: 8,
      easyApplicationsSubmitted: 6,
      totalApplications: 14,
      assessmentsReceived: 3,
      screeningCallsCompleted: 4,
      totalInterviews: 3,
      interviewStages: [
        { stage: 'Round 1', scheduled: 2, completed: 2 },
        { stage: 'Round 2', scheduled: 1, completed: 1 },
      ],
      entryDate: new Date(),
      createdBy: vikram._id,
      notes: 'Direct client portal submissions for cloud architecture requirements.',
    });

    // --- WORK FOR NEHA KAPOOR (Lead Gen: 6 leads, 2 calls) ---
    console.log('Generating test work for Neha Kapoor...');
    const nehaMetrics = calculateLeadGenerationMetrics({ dailyResumeLeads: 5, dailyChatLeads: 1 });
    await LeadGeneration.create({
      employeeName: neha.name,
      linkedInAccountsCount: 1,
      connectionsRange: ['50-100'],
      leadSource: 'CareerBuilder',
      assignedTo: priya._id,
      dailyResumeLeads: 5,
      dailyChatLeads: 1,
      ...nehaMetrics,
      entryDate: new Date(),
      createdBy: neha._id,
      linkedInProfiles: [
        { profileName: 'Aditya Mathur - Salesforce Admin', email: 'aditya.m@democandidate.com', phone: '+1 (555) 321-4321' },
        { profileName: 'Deepak Chawla - Network Engineer', email: 'deepak.c@democandidate.com', phone: '+1 (555) 432-5432' },
        { profileName: 'Anjali Nair - Business Analyst', email: 'anjali.n@democandidate.com', phone: '+1 (555) 543-6543' },
        { profileName: 'Ravi Teja - Data Scientist', email: 'ravi.t@democandidate.com', phone: '+1 (555) 654-7654' },
        { profileName: 'Swati Seth - DevOps Consultant', email: 'swati.s@democandidate.com', phone: '+1 (555) 765-8765' },
        { profileName: 'Bhavin Shah - Java Microservices Engineer', email: 'bhavin.s@democandidate.com', phone: '+1 (555) 876-9876' },
      ],
      callLogs: [
        {
          profileName: 'Aditya Mathur - Salesforce Admin',
          phone: '+1 (555) 321-4321',
          callerId: neha._id,
          callerName: neha.name,
          callDate: new Date(),
          callDuration: '02:30',
          callDurationSeconds: 150,
          outcome: 'picked_up',
          isInterested: true,
          interestStatus: 'Interested',
          notes: 'Candidate interested in contract opportunities.',
        },
        {
          profileName: 'Deepak Chawla - Network Engineer',
          phone: '+1 (555) 432-5432',
          callerId: neha._id,
          callerName: neha.name,
          callDate: new Date(),
          callDuration: '00:00',
          callDurationSeconds: 0,
          outcome: 'not_answered',
          isInterested: false,
          interestStatus: 'Pending',
          notes: 'No response.',
        },
      ],
      notes: 'CareerBuilder IT leads verified.',
    });

    // --- WORK FOR KABIR SINGHANIA (Sales: 6 calls, 1 conversion) ---
    console.log('Generating test work for Kabir Singhania...');
    const kabirLead = await LeadGeneration.create({
      employeeName: kabir.name,
      linkedInAccountsCount: 1,
      connectionsRange: ['0-50'],
      leadSource: 'Referral',
      assignedTo: kabir._id,
      dailyResumeLeads: 1,
      dailyChatLeads: 0,
      entryDate: new Date(),
      createdBy: kabir._id,
      linkedInProfiles: [
        { profileName: 'Prakash Rao - Senior ETL Developer', email: 'prakash.r@democandidate.com', phone: '+1 (555) 555-1212', lastCallStatus: 'picked_up', isInterested: true, interestStatus: 'Interested', callCount: 1 },
      ],
      callLogs: Array.from({ length: 6 }).map((_, i) => ({
        profileName: 'Prakash Rao - Senior ETL Developer',
        phone: `+1 (555) 555-${3000 + i}`,
        callerId: kabir._id,
        callerName: kabir.name,
        callDate: new Date(Date.now() - (i + 1) * 4 * 3600 * 1000),
        callDuration: i % 2 === 0 ? '03:00' : '00:40',
        callDurationSeconds: i % 2 === 0 ? 180 : 40,
        outcome: i % 2 === 0 ? 'picked_up' : 'voicemail',
        isInterested: i % 2 === 0,
        interestStatus: i % 2 === 0 ? 'Interested' : 'Pending',
        notes: `Kabir outreach call #${i + 1}`,
      })),
      notes: 'Referral candidates outreach.',
    });

    const candKabir = await Candidate.create({
      firstName: 'Prakash',
      lastName: 'Rao',
      email: 'prakash.r@democandidate.com',
      phone: '+1 (555) 555-1212',
      sourceLeadId: kabirLead._id,
      convertedBy: kabir._id,
      convertedAt: new Date(),
      currentCity: 'Tampa, FL',
      preferredJobTitles: ['Senior ETL Developer', 'Informatica Specialist'],
      visaStatus: 'Green Card',
      accountStatus: 'active',
      mustResetPassword: false,
    });
    kabirLead.convertedCandidateIds = [candKabir._id];
    await kabirLead.save();

    // --- WORK FOR RHEA DESHMUKH (New joiner: 0 work logged) ---
    // Rhea Deshmukh has 0 work logged, which will cleanly test the 'Attention Needed' status!
    console.log('Rhea Deshmukh left with 0 activity to test "Attention Needed" status.');

    console.log('\n=============================================');
    console.log('SUCCESS: All 10 demo employees & test data generated!');
    console.log('Default password for all demo accounts: Velvix@123');
    console.log('=============================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding demo employees:', error);
    process.exit(1);
  }
}

seedDemoEmployees();
