import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import Skill from '../models/Skill.js';
import CandidateSkill from '../models/CandidateSkill.js';
import Candidate from '../models/Candidate.js';

// ==========================================
// 1. CANONICAL SKILL DEFINITIONS & CATEGORIES
// ==========================================

export const SKILL_CATEGORIES = [
  'Sales & Marketing',
  'Business & Management',
  'Data & Analytics',
  'Finance & Accounting',
  'Human Resources',
  'Customer Service',
  'Design & Creative',
  'Engineering & Operations',
  'Healthcare & Medical',
  'Programming Languages',
  'Frontend',
  'Backend',
  'Databases',
  'Cloud & DevOps',
  'Tools',
  'Other',
];

/**
 * Multi-industry canonical skills covering Sales, Marketing, Business, Data,
 * Finance, HR, Creative, Healthcare, Engineering, and Software/DevOps.
 */
export const SKILL_DEFINITIONS = [
  // --- Sales & Marketing ---
  {
    canonical: 'CRM Software',
    normalized: 'crm software',
    category: 'Sales & Marketing',
    aliases: ['crm software', 'crm tools', 'crm systems', 'crm', 'customer relationship management tools', 'customer relationship management'],
  },
  {
    canonical: 'Marketing Campaigns',
    normalized: 'marketing campaigns',
    category: 'Sales & Marketing',
    aliases: ['marketing campaigns', 'campaign management', 'campaign performance', 'digital campaigns'],
  },
  {
    canonical: 'SEO Strategies',
    normalized: 'seo strategies',
    category: 'Sales & Marketing',
    aliases: ['seo strategies', 'seo', 'search engine optimization', 'on-page seo', 'off-page seo'],
  },
  {
    canonical: 'SEM / PPC',
    normalized: 'sem / ppc',
    category: 'Sales & Marketing',
    aliases: ['sem', 'ppc', 'pay-per-click', 'google ads', 'paid advertising', 'paid search'],
  },
  {
    canonical: 'Market Research',
    normalized: 'market research',
    category: 'Sales & Marketing',
    aliases: ['market research', 'marketing research', 'competitor analysis', 'market trends'],
  },
  {
    canonical: 'Email Marketing',
    normalized: 'email marketing',
    category: 'Sales & Marketing',
    aliases: ['email marketing', 'email campaigns', 'mailchimp', 'newsletter campaigns'],
  },
  {
    canonical: 'Social Media Marketing',
    normalized: 'social media marketing',
    category: 'Sales & Marketing',
    aliases: ['social media marketing', 'smm', 'social media management', 'social media strategy'],
  },
  {
    canonical: 'Content Marketing',
    normalized: 'content marketing',
    category: 'Sales & Marketing',
    aliases: ['content marketing', 'content strategy', 'copywriting', 'content creation'],
  },
  {
    canonical: 'Sales Strategies',
    normalized: 'sales strategies',
    category: 'Sales & Marketing',
    aliases: ['sales strategies', 'sales strategy', 'comprehensive sales strategies', 'strategic sales'],
  },
  {
    canonical: 'Lead Generation',
    normalized: 'lead generation',
    category: 'Sales & Marketing',
    aliases: ['lead generation', 'lead gen', 'prospecting', 'cold outreach', 'cold calling'],
  },
  {
    canonical: 'Customer Acquisition',
    normalized: 'customer acquisition',
    category: 'Sales & Marketing',
    aliases: ['customer acquisition', 'client acquisition', 'user acquisition'],
  },
  {
    canonical: 'Brand Positioning',
    normalized: 'brand positioning',
    category: 'Sales & Marketing',
    aliases: ['brand positioning', 'brand repositioning', 'branding', 'brand management', 'brand strategy'],
  },
  {
    canonical: 'Public Relations (PR)',
    normalized: 'public relations (pr)',
    category: 'Sales & Marketing',
    aliases: ['public relations', 'pr', 'media relations', 'press releases'],
  },
  {
    canonical: 'Salesforce',
    normalized: 'salesforce',
    category: 'Sales & Marketing',
    aliases: ['salesforce', 'salesforce crm', 'sfdc'],
  },
  {
    canonical: 'HubSpot',
    normalized: 'hubspot',
    category: 'Sales & Marketing',
    aliases: ['hubspot', 'hubspot crm'],
  },
  {
    canonical: 'B2B Sales',
    normalized: 'b2b sales',
    category: 'Sales & Marketing',
    aliases: ['b2b sales', 'b2b', 'enterprise sales', 'account-based marketing'],
  },
  {
    canonical: 'B2C Sales',
    normalized: 'b2c sales',
    category: 'Sales & Marketing',
    aliases: ['b2c sales', 'b2c', 'retail sales', 'direct sales'],
  },

  // --- Data & Analytics ---
  {
    canonical: 'Data Analysis',
    normalized: 'data analysis',
    category: 'Data & Analytics',
    aliases: ['data analysis', 'data analytical skills', 'analyzing sales data', 'data analytics', 'quantitative analysis'],
  },
  {
    canonical: 'Google Analytics',
    normalized: 'google analytics',
    category: 'Data & Analytics',
    aliases: ['google analytics', 'ga4', 'google analytics 4'],
  },
  {
    canonical: 'Business Intelligence',
    normalized: 'business intelligence',
    category: 'Data & Analytics',
    aliases: ['business intelligence', 'bi', 'bi tools'],
  },
  {
    canonical: 'Tableau',
    normalized: 'tableau',
    category: 'Data & Analytics',
    aliases: ['tableau', 'tableau desktop'],
  },
  {
    canonical: 'Power BI',
    normalized: 'power bi',
    category: 'Data & Analytics',
    aliases: ['power bi', 'powerbi', 'microsoft power bi'],
  },
  {
    canonical: 'Excel (Advanced)',
    normalized: 'excel (advanced)',
    category: 'Data & Analytics',
    aliases: ['excel', 'advanced excel', 'microsoft excel', 'vlookup', 'pivot tables', 'ms excel'],
  },
  {
    canonical: 'Data Modeling',
    normalized: 'data modeling',
    category: 'Data & Analytics',
    aliases: ['data modeling', 'data warehousing', 'etl', 'data extraction'],
  },
  {
    canonical: 'Statistics',
    normalized: 'statistics',
    category: 'Data & Analytics',
    aliases: ['statistics', 'statistical modeling', 'statistical analysis', 'hypothesis testing'],
  },

  // --- Business & Management ---
  {
    canonical: 'Negotiation',
    normalized: 'negotiation',
    category: 'Business & Management',
    aliases: ['negotiation', 'negotiation capabilities', 'contract negotiation', 'deal negotiation'],
  },
  {
    canonical: 'Project Management',
    normalized: 'project management',
    category: 'Business & Management',
    aliases: ['project management', 'pmp', 'project planning', 'project delivery'],
  },
  {
    canonical: 'Strategic Planning',
    normalized: 'strategic planning',
    category: 'Business & Management',
    aliases: ['strategic planning', 'strategic direction', 'business strategy', 'corporate strategy'],
  },
  {
    canonical: 'Business Development',
    normalized: 'business development',
    category: 'Business & Management',
    aliases: ['business development', 'biz dev', 'partnership development'],
  },
  {
    canonical: 'Operations Management',
    normalized: 'operations management',
    category: 'Business & Management',
    aliases: ['operations management', 'operational efficiency', 'business operations'],
  },
  {
    canonical: 'Team Leadership',
    normalized: 'team leadership',
    category: 'Business & Management',
    aliases: ['team leadership', 'people management', 'leading teams', 'staff supervision'],
  },
  {
    canonical: 'Mentorship',
    normalized: 'mentorship',
    category: 'Business & Management',
    aliases: ['mentorship', 'mentored a team', 'coaching', 'talent mentoring'],
  },
  {
    canonical: 'Agile & Scrum',
    normalized: 'agile & scrum',
    category: 'Business & Management',
    aliases: ['agile', 'scrum', 'kanban', 'sprint planning', 'scrum master', 'agile methodology'],
  },
  {
    canonical: 'Budgeting & Forecasting',
    normalized: 'budgeting & forecasting',
    category: 'Business & Management',
    aliases: ['budgeting', 'financial forecasting', 'budget management', 'cost optimization'],
  },
  {
    canonical: 'Risk Management',
    normalized: 'risk management',
    category: 'Business & Management',
    aliases: ['risk management', 'risk assessment', 'compliance management'],
  },
  {
    canonical: 'Change Management',
    normalized: 'change management',
    category: 'Business & Management',
    aliases: ['change management', 'organizational change'],
  },

  // --- Finance & Accounting ---
  {
    canonical: 'Financial Analysis',
    normalized: 'financial analysis',
    category: 'Finance & Accounting',
    aliases: ['financial analysis', 'financial modeling', 'financial reporting', 'variance analysis'],
  },
  {
    canonical: 'Accounting',
    normalized: 'accounting',
    category: 'Finance & Accounting',
    aliases: ['accounting', 'general ledger', 'journal entries', 'balance sheet'],
  },
  {
    canonical: 'QuickBooks',
    normalized: 'quickbooks',
    category: 'Finance & Accounting',
    aliases: ['quickbooks', 'quickbooks online', 'qbo'],
  },
  {
    canonical: 'Bookkeeping',
    normalized: 'bookkeeping',
    category: 'Finance & Accounting',
    aliases: ['bookkeeping', 'accounts payable', 'accounts receivable', 'ap/ar'],
  },
  {
    canonical: 'Auditing',
    normalized: 'auditing',
    category: 'Finance & Accounting',
    aliases: ['auditing', 'internal audit', 'external audit', 'audit compliance'],
  },
  {
    canonical: 'Tax Preparation',
    normalized: 'tax preparation',
    category: 'Finance & Accounting',
    aliases: ['tax preparation', 'tax compliance', 'corporate tax', 'sales tax'],
  },
  {
    canonical: 'SAP',
    normalized: 'sap',
    category: 'Finance & Accounting',
    aliases: ['sap', 'sap erp', 'sap fico'],
  },
  {
    canonical: 'GAAP Compliance',
    normalized: 'gaap compliance',
    category: 'Finance & Accounting',
    aliases: ['gaap', 'us gaap', 'ifrs'],
  },

  // --- Human Resources ---
  {
    canonical: 'Talent Acquisition',
    normalized: 'talent acquisition',
    category: 'Human Resources',
    aliases: ['talent acquisition', 'recruitment', 'recruiting', 'staffing', 'sourcing candidates'],
  },
  {
    canonical: 'Employee Relations',
    normalized: 'employee relations',
    category: 'Human Resources',
    aliases: ['employee relations', 'workplace relations', 'conflict resolution'],
  },
  {
    canonical: 'HRIS',
    normalized: 'hris',
    category: 'Human Resources',
    aliases: ['hris', 'hrms', 'workday', 'bamboohr', 'adp'],
  },
  {
    canonical: 'Onboarding & Training',
    normalized: 'onboarding & training',
    category: 'Human Resources',
    aliases: ['onboarding', 'employee onboarding', 'training and development', 'l&d'],
  },
  {
    canonical: 'Performance Management',
    normalized: 'performance management',
    category: 'Human Resources',
    aliases: ['performance management', 'performance appraisal', 'kpi tracking'],
  },
  {
    canonical: 'Payroll Administration',
    normalized: 'payroll administration',
    category: 'Human Resources',
    aliases: ['payroll', 'payroll processing', 'payroll administration'],
  },

  // --- Customer Service & Relations ---
  {
    canonical: 'Customer Service',
    normalized: 'customer service',
    category: 'Customer Service',
    aliases: ['customer service', 'customer support', 'client support', 'customer care'],
  },
  {
    canonical: 'Client Relationship Management',
    normalized: 'client relationship management',
    category: 'Customer Service',
    aliases: ['client relations', 'client relationship management', 'account management', 'client retention'],
  },
  {
    canonical: 'Help Desk / Ticketing',
    normalized: 'help desk / ticketing',
    category: 'Customer Service',
    aliases: ['help desk', 'zendesk', 'freshdesk', 'jira service desk'],
  },

  // --- Design & Creative ---
  {
    canonical: 'Graphic Design',
    normalized: 'graphic design',
    category: 'Design & Creative',
    aliases: ['graphic design', 'visual design', 'branding design'],
  },
  {
    canonical: 'UI/UX Design',
    normalized: 'ui/ux design',
    category: 'Design & Creative',
    aliases: ['ui/ux', 'ui/ux design', 'ux design', 'ui design', 'user experience', 'user interface'],
  },
  {
    canonical: 'Adobe Photoshop',
    normalized: 'adobe photoshop',
    category: 'Design & Creative',
    aliases: ['photoshop', 'adobe photoshop'],
  },
  {
    canonical: 'Adobe Illustrator',
    normalized: 'adobe illustrator',
    category: 'Design & Creative',
    aliases: ['illustrator', 'adobe illustrator'],
  },
  {
    canonical: 'Figma',
    normalized: 'figma',
    category: 'Design & Creative',
    aliases: ['figma', 'figma design'],
  },
  {
    canonical: 'Video Editing',
    normalized: 'video editing',
    category: 'Design & Creative',
    aliases: ['video editing', 'premiere pro', 'final cut pro', 'after effects'],
  },
  {
    canonical: 'Canva',
    normalized: 'canva',
    category: 'Design & Creative',
    aliases: ['canva'],
  },

  // --- Healthcare & Medical ---
  {
    canonical: 'Patient Care',
    normalized: 'patient care',
    category: 'Healthcare & Medical',
    aliases: ['patient care', 'direct patient care', 'nursing', 'clinical care'],
  },
  {
    canonical: 'EHR / EMR Systems',
    normalized: 'ehr / emr systems',
    category: 'Healthcare & Medical',
    aliases: ['ehr', 'emr', 'electronic health records', 'epic systems', 'cerner'],
  },
  {
    canonical: 'HIPAA Compliance',
    normalized: 'hipaa compliance',
    category: 'Healthcare & Medical',
    aliases: ['hipaa', 'hipaa compliance'],
  },
  {
    canonical: 'Clinical Research',
    normalized: 'clinical research',
    category: 'Healthcare & Medical',
    aliases: ['clinical research', 'clinical trials', 'good clinical practice'],
  },

  // --- Engineering & Operations ---
  {
    canonical: 'Supply Chain Management',
    normalized: 'supply chain management',
    category: 'Engineering & Operations',
    aliases: ['supply chain', 'supply chain management', 'logistics', 'procurement', 'inventory management'],
  },
  {
    canonical: 'Quality Assurance (QA)',
    normalized: 'quality assurance (qa)',
    category: 'Engineering & Operations',
    aliases: ['quality assurance', 'qa', 'quality control', 'qc', 'six sigma', 'lean manufacturing'],
  },
  {
    canonical: 'AutoCAD',
    normalized: 'autocad',
    category: 'Engineering & Operations',
    aliases: ['autocad', 'cad', 'solidworks'],
  },

  // --- Programming Languages ---
  {
    canonical: 'Python',
    normalized: 'python',
    category: 'Programming Languages',
    aliases: ['python', 'python3', 'python2', 'py'],
  },
  {
    canonical: 'Java',
    normalized: 'java',
    category: 'Programming Languages',
    aliases: ['java', 'core java', 'java 8', 'java 11', 'java 17', 'java 21', 'j2ee'],
    negativeLookahead: ['script'],
  },
  {
    canonical: 'JavaScript',
    normalized: 'javascript',
    category: 'Programming Languages',
    aliases: ['javascript', 'js', 'es6', 'es6+', 'ecmascript', 'vanilla js'],
    negativeLookbehind: ['react\\s*', 'node\\s*', 'vue\\s*', 'next\\s*', 'angular\\s*', 'express\\s*'],
  },
  {
    canonical: 'TypeScript',
    normalized: 'typescript',
    category: 'Programming Languages',
    aliases: ['typescript', 'ts'],
  },
  {
    canonical: 'C++',
    normalized: 'c++',
    category: 'Programming Languages',
    aliases: ['c++', 'cpp'],
  },
  {
    canonical: 'C#',
    normalized: 'c#',
    category: 'Programming Languages',
    aliases: ['c#', 'c-sharp', 'csharp'],
  },
  {
    canonical: 'C',
    normalized: 'c',
    category: 'Programming Languages',
    aliases: ['c programming', 'c language', 'ansi c'],
  },
  {
    canonical: 'Go',
    normalized: 'go',
    category: 'Programming Languages',
    aliases: ['golang', 'go lang', 'go language'],
  },
  {
    canonical: 'Rust',
    normalized: 'rust',
    category: 'Programming Languages',
    aliases: ['rust', 'rustlang'],
  },
  {
    canonical: 'PHP',
    normalized: 'php',
    category: 'Programming Languages',
    aliases: ['php', 'php7', 'php8'],
  },
  {
    canonical: 'Ruby',
    normalized: 'ruby',
    category: 'Programming Languages',
    aliases: ['ruby', 'ruby lang'],
  },
  {
    canonical: 'Swift',
    normalized: 'swift',
    category: 'Programming Languages',
    aliases: ['swift', 'swift5'],
  },
  {
    canonical: 'Kotlin',
    normalized: 'kotlin',
    category: 'Programming Languages',
    aliases: ['kotlin'],
  },
  {
    canonical: 'SQL',
    normalized: 'sql',
    category: 'Programming Languages',
    aliases: ['sql', 't-sql', 'pl/sql', 'plsql', 'ansi sql'],
  },
  {
    canonical: 'Shell Scripting',
    normalized: 'shell scripting',
    category: 'Programming Languages',
    aliases: ['shell', 'bash', 'sh', 'zsh', 'powershell', 'shell scripting', 'bash scripting'],
  },

  // --- Frontend ---
  {
    canonical: 'React',
    normalized: 'react',
    category: 'Frontend',
    aliases: ['react', 'react.js', 'reactjs', 'react js', 'react native'],
  },
  {
    canonical: 'Angular',
    normalized: 'angular',
    category: 'Frontend',
    aliases: ['angular', 'angular.js', 'angularjs', 'angular js', 'angular 2+'],
  },
  {
    canonical: 'Vue',
    normalized: 'vue',
    category: 'Frontend',
    aliases: ['vue', 'vue.js', 'vuejs', 'vue js', 'vue 3'],
  },
  {
    canonical: 'Next.js',
    normalized: 'next.js',
    category: 'Frontend',
    aliases: ['next.js', 'nextjs', 'next js', 'next'],
  },
  {
    canonical: 'HTML',
    normalized: 'html',
    category: 'Frontend',
    aliases: ['html', 'html5'],
  },
  {
    canonical: 'CSS',
    normalized: 'css',
    category: 'Frontend',
    aliases: ['css', 'css3'],
  },
  {
    canonical: 'Tailwind CSS',
    normalized: 'tailwind css',
    category: 'Frontend',
    aliases: ['tailwind', 'tailwind css', 'tailwindcss'],
  },
  {
    canonical: 'Bootstrap',
    normalized: 'bootstrap',
    category: 'Frontend',
    aliases: ['bootstrap', 'bootstrap 5', 'bootstrap 4'],
  },
  {
    canonical: 'Redux',
    normalized: 'redux',
    category: 'Frontend',
    aliases: ['redux', 'redux toolkit', 'rtk'],
  },

  // --- Backend ---
  {
    canonical: 'Node.js',
    normalized: 'node.js',
    category: 'Backend',
    aliases: ['node.js', 'nodejs', 'node js', 'node'],
  },
  {
    canonical: 'Express.js',
    normalized: 'express.js',
    category: 'Backend',
    aliases: ['express.js', 'expressjs', 'express js', 'express'],
  },
  {
    canonical: 'FastAPI',
    normalized: 'fastapi',
    category: 'Backend',
    aliases: ['fastapi', 'fast api'],
  },
  {
    canonical: 'Django',
    normalized: 'django',
    category: 'Backend',
    aliases: ['django', 'django rest framework', 'drf'],
  },
  {
    canonical: 'Spring Boot',
    normalized: 'spring boot',
    category: 'Backend',
    aliases: ['spring boot', 'springboot', 'spring framework'],
  },
  {
    canonical: 'ASP.NET',
    normalized: 'asp.net',
    category: 'Backend',
    aliases: ['asp.net', 'asp.net core', '.net', '.net core', 'dotnet'],
  },
  {
    canonical: 'GraphQL',
    normalized: 'graphql',
    category: 'Backend',
    aliases: ['graphql', 'apollo graphql'],
  },
  {
    canonical: 'REST API',
    normalized: 'rest api',
    category: 'Backend',
    aliases: ['rest api', 'rest apis', 'restful api', 'restful apis', 'rest web services'],
  },

  // --- Databases ---
  {
    canonical: 'PostgreSQL',
    normalized: 'postgresql',
    category: 'Databases',
    aliases: ['postgresql', 'postgres', 'postgres db', 'psql'],
  },
  {
    canonical: 'MySQL',
    normalized: 'mysql',
    category: 'Databases',
    aliases: ['mysql'],
  },
  {
    canonical: 'MongoDB',
    normalized: 'mongodb',
    category: 'Databases',
    aliases: ['mongodb', 'mongo', 'mongo db'],
  },
  {
    canonical: 'Redis',
    normalized: 'redis',
    category: 'Databases',
    aliases: ['redis'],
  },
  {
    canonical: 'Microsoft SQL Server',
    normalized: 'microsoft sql server',
    category: 'Databases',
    aliases: ['sql server', 'mssql', 'ms sql', 'microsoft sql server'],
  },
  {
    canonical: 'Oracle DB',
    normalized: 'oracle db',
    category: 'Databases',
    aliases: ['oracle database', 'oracle db', 'oracle sql'],
  },

  // --- Cloud & DevOps ---
  {
    canonical: 'AWS',
    normalized: 'aws',
    category: 'Cloud & DevOps',
    aliases: ['aws', 'amazon web services', 'amazon aws', 'ec2', 's3', 'aws lambda', 'aws rds'],
  },
  {
    canonical: 'Azure',
    normalized: 'azure',
    category: 'Cloud & DevOps',
    aliases: ['azure', 'microsoft azure'],
  },
  {
    canonical: 'Google Cloud',
    normalized: 'google cloud',
    category: 'Cloud & DevOps',
    aliases: ['google cloud', 'gcp', 'google cloud platform'],
  },
  {
    canonical: 'Docker',
    normalized: 'docker',
    category: 'Cloud & DevOps',
    aliases: ['docker', 'docker compose', 'docker container'],
  },
  {
    canonical: 'Kubernetes',
    normalized: 'kubernetes',
    category: 'Cloud & DevOps',
    aliases: ['kubernetes', 'k8s'],
  },
  {
    canonical: 'Jenkins',
    normalized: 'jenkins',
    category: 'Cloud & DevOps',
    aliases: ['jenkins', 'jenkins ci'],
  },
  {
    canonical: 'CI/CD',
    normalized: 'ci/cd',
    category: 'Cloud & DevOps',
    aliases: ['ci/cd', 'ci cd', 'continuous integration', 'continuous deployment'],
  },
  {
    canonical: 'Terraform',
    normalized: 'terraform',
    category: 'Cloud & DevOps',
    aliases: ['terraform'],
  },

  // --- Tools ---
  {
    canonical: 'Git',
    normalized: 'git',
    category: 'Tools',
    aliases: ['git', 'git version control'],
    negativeLookahead: ['hub', 'lab'],
  },
  {
    canonical: 'GitHub',
    normalized: 'github',
    category: 'Tools',
    aliases: ['github'],
  },
  {
    canonical: 'Jira',
    normalized: 'jira',
    category: 'Tools',
    aliases: ['jira', 'atlassian jira'],
  },
  {
    canonical: 'Postman',
    normalized: 'postman',
    category: 'Tools',
    aliases: ['postman'],
  },

  // --- Soft & Professional Skills ---
  {
    canonical: 'Communication',
    normalized: 'communication',
    category: 'Other',
    aliases: ['communication', 'communication skills', 'verbal communication', 'written communication'],
  },
  {
    canonical: 'Problem Solving',
    normalized: 'problem solving',
    category: 'Other',
    aliases: ['problem solving', 'problem-solving', 'analytical problem solving'],
  },
  {
    canonical: 'Critical Thinking',
    normalized: 'critical thinking',
    category: 'Other',
    aliases: ['critical thinking', 'analytical thinking'],
  },
  {
    canonical: 'Time Management',
    normalized: 'time management',
    category: 'Other',
    aliases: ['time management', 'prioritization', 'multitasking'],
  },
  {
    canonical: 'Leadership',
    normalized: 'leadership',
    category: 'Business & Management',
    aliases: ['leadership', 'leadership capabilities', 'strategic leadership'],
  },
];

// ==========================================
// 2. TEXT EXTRACTION FROM FILES
// ==========================================

/**
 * Extracts raw readable text from a resume file (PDF, DOCX, DOC, TXT)
 */
export async function extractTextFromResume(filePath, mimetype = '') {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Resume file not found at path: ${filePath}`);
  }

  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.pdf' || mimetype === 'application/pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfParseModule = await import('pdf-parse');
      if (pdfParseModule.PDFParse) {
        const parser = new pdfParseModule.PDFParse({ data: dataBuffer });
        await parser.load();
        const res = await parser.getText();
        return res?.text || (typeof res === 'string' ? res : '');
      } else if (typeof pdfParseModule.default === 'function') {
        const data = await pdfParseModule.default(dataBuffer);
        return data.text || '';
      } else if (typeof pdfParseModule === 'function') {
        const data = await pdfParseModule(dataBuffer);
        return data.text || '';
      }
    }

    if (
      ext === '.docx' ||
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value || '';
    }

    if (ext === '.doc' || mimetype === 'application/msword') {
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        if (result.value && result.value.trim().length > 20) {
          return result.value;
        }
      } catch (_) {}
      const buffer = fs.readFileSync(filePath);
      return buffer.toString('utf-8').replace(/[^\x20-\x7E\t\r\n]/g, ' ');
    }

    return fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`Error extracting text from ${filePath}:`, err);
    throw new Error(`Failed to extract text from resume: ${err.message}`);
  }
}

// ==========================================
// 3. SMART CATEGORY DETECTION
// ==========================================

export function detectSkillCategory(name) {
  if (!name || typeof name !== 'string') return 'Other';
  const lower = name.toLowerCase();

  if (
    /(marketing|sales|seo|sem|ppc|crm|campaign|advertis|brand|content|copywriting|lead\s*gen|cold\s*call|market\s*research|consumer|hubspot|salesforce|public\s*relations|outreach|social\s*media|merchandis)/i.test(
      lower
    )
  ) {
    return 'Sales & Marketing';
  }
  if (
    /(analy|data|bi|tableau|power\s*bi|google\s*analytics|statistic|metric|reporting|dashboard|insights|excel|modeling|quantitative)/i.test(
      lower
    )
  ) {
    return 'Data & Analytics';
  }
  if (
    /(negotiat|manage|leader|strateg|project|business\s*dev|operat|agile|scrum|budget|planning|mentor|stakeholder|problem\s*solving|change\s*manage|decision\s*making|coordination)/i.test(
      lower
    )
  ) {
    return 'Business & Management';
  }
  if (
    /(financ|account|audit|tax|bookkeep|quickbooks|gaap|ledger|payroll|invoic|banking|billing|cost)/i.test(
      lower
    )
  ) {
    return 'Finance & Accounting';
  }
  if (
    /(human\s*resource|hr|talent|recruit|onboard|employee\s*relat|hris|staffing|hiring|compensation|benefits|labor)/i.test(
      lower
    )
  ) {
    return 'Human Resources';
  }
  if (
    /(customer\s*service|customer\s*support|client\s*relat|client\s*success|help\s*desk|call\s*center|guest\s*services|customer\s*care)/i.test(
      lower
    )
  ) {
    return 'Customer Service';
  }
  if (
    /(design|photoshop|illustrat|figma|ui|ux|creative|video|art|graphic|canva|animation|premiere|after\s*effects|visual)/i.test(
      lower
    )
  ) {
    return 'Design & Creative';
  }
  if (
    /(patient|clinical|nurs|health|medical|doctor|hospital|hipaa|ehr|emr|treatment|pharma|biology)/i.test(
      lower
    )
  ) {
    return 'Healthcare & Medical';
  }
  if (
    /(supply\s*chain|logistic|procurement|quality\s*assurance|autocad|solidworks|manufactur|fabricat|mechanical|electrical|civil|safety)/i.test(
      lower
    )
  ) {
    return 'Engineering & Operations';
  }
  if (/(react|angular|vue|html|css|tailwind|bootstrap|next\.?js|frontend|redux|svelte|sass|scss|jquery)/i.test(lower)) {
    return 'Frontend';
  }
  if (/(node|express|fastapi|django|flask|spring|backend|api|graphql|rest|microservice|nest\.?js)/i.test(lower)) {
    return 'Backend';
  }
  if (/(sql|postgres|mysql|mongo|redis|database|db|oracle|dynamodb|cassandra|sqlite|mariadb)/i.test(lower)) {
    return 'Databases';
  }
  if (/(aws|azure|gcp|cloud|docker|kubernetes|devops|jenkins|ci\/cd|terraform|ansible|linux|nginx)/i.test(lower)) {
    return 'Cloud & DevOps';
  }
  if (/(git|github|jira|postman|vscode|slack|trello|confluence|bitbucket|npm|yarn)/i.test(lower)) {
    return 'Tools';
  }
  if (/(python|java|javascript|typescript|c\+\+|c\#|ruby|php|golang|swift|kotlin|rust|scala|dart|perl)/i.test(lower)) {
    return 'Programming Languages';
  }

  return 'Other';
}

function cleanSkillName(str) {
  return str
    .replace(/^[-•*·▪–—\s,;:]+|[-•*·▪–—\s,;:]+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function formatDisplaySkill(str) {
  const cleaned = cleanSkillName(str);
  if (!cleaned) return '';

  // Preserve known uppercase acronyms
  const acronyms = new Set([
    'CRM', 'SEO', 'SEM', 'PPC', 'SQL', 'AWS', 'GCP', 'API', 'REST', 'HTML', 'CSS',
    'HRIS', 'HRMS', 'EHR', 'EMR', 'GAAP', 'SAP', 'CAD', 'UI/UX', 'UI', 'UX', 'PR',
    'B2B', 'B2C', 'QA', 'QC', 'TDD', 'CI/CD', 'ERP', 'SaaS', 'ETL', 'K8s', 'GA4'
  ]);

  const words = cleaned.split(' ');
  const formatted = words.map((w) => {
    const upper = w.toUpperCase();
    if (acronyms.has(upper)) return upper;
    if (acronyms.has(w)) return w;
    // Standard capitalization
    if (w.length <= 1) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1);
  });

  return formatted.join(' ');
}

// ==========================================
// 4. SKILL EXTRACTION & NORMALIZATION ENGINE
// ==========================================

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchSkillAlias(text, alias, negativeLookaheads = [], negativeLookbehinds = []) {
  const isSymbolEnd = /[+#]$/.test(alias);
  const isSymbolStart = /^[.]/.test(alias);

  let prefix = isSymbolStart ? '(?:^|\\s)' : '(?:^|[^a-zA-Z0-9_#+])';
  let suffix = isSymbolEnd ? '(?:$|[^a-zA-Z0-9_#+])' : '(?:$|[^a-zA-Z0-9_])';

  let negLookahead = '';
  if (negativeLookaheads.length > 0) {
    negLookahead = `(?!${negativeLookaheads.map(escapeRegex).join('|')})`;
  }

  let negLookbehind = '';
  if (negativeLookbehinds.length > 0) {
    negLookbehind = `(?<!${negativeLookbehinds.map(escapeRegex).join('|')})`;
  }

  const escaped = escapeRegex(alias);
  const pattern = new RegExp(`${prefix}${negLookbehind}${escaped}${negLookahead}${suffix}`, 'i');
  return pattern.test(text);
}

/**
 * Extracts skills dynamically from explicit resume sections across all professions
 */
function extractSkillsFromDedicatedSection(cleanedText) {
  const skillsSectionRegex = /(?:^|\n)\s*(?:technical\s+skills|core\s+competencies|key\s+competencies|skills\s*(?:&|and)?\s*tools|skills\s*(?:&|and)?\s*abilities|skills\s*(?:&|and)?\s*expertise|skills|key\s+skills|core\s+skills|functional\s+skills|areas\s+of\s+expertise|proficiencies|technical\s+proficiencies|expertise|hard\s+skills|professional\s+skills|specializations|strengths\s*(?:&|and)?\s*skills)\s*[:\n]([\s\S]*?)(?=(?:\n\s*(?:experience|work\s+experience|professional\s+experience|employment\s+history|work\s+history|education|academic\s+background|certifications|certificates|projects|awards|achievements|key\s+achievements|languages|references|publications|summary|profile|objective)\b|\n\s*[A-Z\s]{4,}(?:\n|:)|www\.|powered\s+by|--\s*\d+\s*of\s*\d+\s*--|$))/i;
  const match = cleanedText.match(skillsSectionRegex);
  if (!match) return [];

  const rawBlock = match[1];
  const items = rawBlock
    .split(/[,•*·▪–—|;\n\t\r]+/)
    .map(cleanSkillName)
    .filter((s) => {
      if (s.length < 2 || s.length > 45) return false;
      if (/^(and|or|the|with|etc|www|http|powered|page|native|fluent|proficient|expert|advanced)$/i.test(s)) {
        return false;
      }
      if (/enhancv|resume|curriculum|vitae/i.test(s)) return false;
      // Skip common resume section headers that might be captured
      if (/^(experience|work experience|professional experience|employment history|work history|education|academic background|certifications|certificates|projects|key projects|awards|achievements|key achievements|languages|language proficiency|references|publications|summary|professional summary|executive summary|profile|objective|contact|personal details|interests|hobbies|activities|volunteer|volunteering)$/i.test(s)) {
        return false;
      }
      // Skip full sentences (more than 4 spaces)
      if ((s.match(/\s/g) || []).length > 4) return false;
      // Skip if looks like a date range
      if (/\d{4}\s*-\s*\d{4}/.test(s)) return false;
      return true;
    });

  return items.map((item) => {
    const displayName = formatDisplaySkill(item);
    return {
      name: displayName,
      normalizedName: displayName.toLowerCase(),
      category: detectSkillCategory(displayName),
      confidence: 0.98,
    };
  });
}

/**
 * Main skill extraction function for candidates from ANY field
 */
export function extractSkillsFromText(resumeText) {
  if (!resumeText || typeof resumeText !== 'string' || resumeText.trim().length === 0) {
    return [];
  }

  const cleanedText = resumeText.replace(/\r\n/g, '\n').replace(/\t/g, ' ');
  const matchedSkillsMap = new Map();

  // 1. DYNAMIC SECTION PARSING (Works for ALL fields, Sales, Marketing, HR, Finance, Medical, etc.)
  const sectionSkills = extractSkillsFromDedicatedSection(cleanedText);
  for (const skill of sectionSkills) {
    matchedSkillsMap.set(skill.normalizedName, skill);
  }

  // 2. COMPREHENSIVE MULTI-INDUSTRY DICTIONARY SCANNING
  for (const def of SKILL_DEFINITIONS) {
    // If already extracted from the dedicated section, ensure category/canonical formatting
    if (matchedSkillsMap.has(def.normalized)) {
      const existing = matchedSkillsMap.get(def.normalized);
      existing.name = def.canonical;
      existing.category = def.category;
      continue;
    }

    let isMatched = false;
    for (const alias of def.aliases) {
      if (
        matchSkillAlias(
          cleanedText,
          alias,
          def.negativeLookahead || [],
          def.negativeLookbehind || []
        )
      ) {
        isMatched = true;
        break;
      }
    }

    if (isMatched) {
      matchedSkillsMap.set(def.normalized, {
        name: def.canonical,
        normalizedName: def.normalized,
        category: def.category,
        confidence: 0.92,
      });
    }
  }

  return Array.from(matchedSkillsMap.values());
}

// ==========================================
// 5. DATABASE SYNC & PIPELINE
// ==========================================

export async function parseAndSaveCandidateSkills(candidateId, filePath, mimetype = '') {
  const candidate = await Candidate.findById(candidateId);
  if (!candidate) {
    throw new Error(`Candidate with ID ${candidateId} not found`);
  }

  candidate.resumeParsingStatus = 'PROCESSING';
  candidate.resumeParsingError = '';
  await candidate.save();

  try {
    const text = await extractTextFromResume(filePath, mimetype);
    if (!text || text.trim().length === 0) {
      throw new Error('Unable to extract text from resume. File may be empty or an unreadable scanned image.');
    }

    const extractedSkills = extractSkillsFromText(text);

    const skillDocMap = new Map();
    for (const item of extractedSkills) {
      let skillDoc = await Skill.findOne({ normalizedName: item.normalizedName });
      if (!skillDoc) {
        skillDoc = await Skill.create({
          name: item.name,
          normalizedName: item.normalizedName,
          category: item.category,
        });
      }
      skillDocMap.set(item.normalizedName, {
        skillDoc,
        confidence: item.confidence,
      });
    }

    // Remove existing resume-derived skills
    // PRESERVE manual skills! (source: 'manual' is NOT deleted)
    await CandidateSkill.deleteMany({
      candidate: candidateId,
      source: 'resume',
    });

    const existingManualSkills = await CandidateSkill.find({
      candidate: candidateId,
      source: 'manual',
    }).select('skill');
    const manualSkillIds = new Set(existingManualSkills.map((cs) => cs.skill.toString()));

    const newCandidateSkills = [];
    for (const [, { skillDoc, confidence }] of skillDocMap.entries()) {
      if (manualSkillIds.has(skillDoc._id.toString())) {
        continue;
      }

      newCandidateSkills.push({
        candidate: candidateId,
        skill: skillDoc._id,
        confidence,
        source: 'resume',
      });
    }

    if (newCandidateSkills.length > 0) {
      await CandidateSkill.insertMany(newCandidateSkills, { ordered: false }).catch((err) => {
        console.warn('Note on bulk insert candidate skills:', err.message);
      });
    }

    candidate.resumeParsingStatus = 'COMPLETED';
    candidate.resumeParsingError = '';
    candidate.resumeParsedAt = new Date();
    await candidate.save();

    const allSkills = await getCandidateSkillsStructured(candidateId);

    return {
      success: true,
      skills: allSkills.skills,
      count: allSkills.total,
    };
  } catch (error) {
    console.error(`Skill extraction failed for candidate ${candidateId}:`, error);
    candidate.resumeParsingStatus = 'FAILED';
    candidate.resumeParsingError = error.message || 'Unknown extraction error';
    await candidate.save();
    throw error;
  }
}

export async function getCandidateSkillsStructured(candidateId) {
  const candidate = await Candidate.findById(candidateId).select(
    'resumeParsingStatus resumeParsingError resumeParsedAt'
  );

  const candidateSkills = await CandidateSkill.find({ candidate: candidateId })
    .populate('skill', 'name normalizedName category')
    .sort({ createdAt: 1 })
    .lean();

  const formattedSkills = candidateSkills
    .filter((cs) => cs.skill)
    .map((cs) => ({
      id: cs.skill._id,
      candidateSkillId: cs._id,
      name: cs.skill.name,
      normalizedName: cs.skill.normalizedName,
      category: cs.skill.category || 'Other',
      source: cs.source || 'resume',
      confidence: cs.confidence ?? 1.0,
      createdAt: cs.createdAt,
    }));

  return {
    candidate_id: candidateId,
    parsingStatus: candidate?.resumeParsingStatus || 'PENDING',
    parsingError: candidate?.resumeParsingError || '',
    parsedAt: candidate?.resumeParsedAt || null,
    skills: formattedSkills,
    total: formattedSkills.length,
  };
}
