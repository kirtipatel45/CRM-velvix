import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB, { closeDB } from './config/db.js';
import User from './models/User.js';
import LeadGeneration from './models/LeadGeneration.js';
import Sales from './models/Sales.js';
import Candidate from './models/Candidate.js';
import Marketing from './models/Marketing.js';
import Notification from './models/Notification.js';
import AuditLog from './models/AuditLog.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function wipeDatabase() {
  try {
    console.log('Connecting to database...');
    await connectDB();

    console.log('--- Wiping all collections except Admin users ---');

    const leadGenRes = await LeadGeneration.deleteMany({});
    console.log(`Deleted ${leadGenRes.deletedCount} Lead Generation records.`);

    const salesRes = await Sales.deleteMany({});
    console.log(`Deleted ${salesRes.deletedCount} Sales / Assigned Lead records.`);

    const candidateRes = await Candidate.deleteMany({});
    console.log(`Deleted ${candidateRes.deletedCount} Candidate records.`);

    const marketingRes = await Marketing.deleteMany({});
    console.log(`Deleted ${marketingRes.deletedCount} Marketing records.`);

    const notifRes = await Notification.deleteMany({});
    console.log(`Deleted ${notifRes.deletedCount} Notification records.`);

    const auditRes = await AuditLog.deleteMany({});
    console.log(`Deleted ${auditRes.deletedCount} Audit Log records.`);

    // Remove all non-admin users
    const userRes = await User.deleteMany({ role: { $ne: 'admin' } });
    console.log(`Deleted ${userRes.deletedCount} non-admin Employee accounts.`);

    // Verify or create Admin user
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      admin = await User.create({
        name: 'Admin User',
        email: 'admin@velvix.com',
        password: 'admin123',
        role: 'admin',
        allowedModules: ['lead_generation', 'leads', 'candidates', 'marketing'],
        designation: 'System Administrator',
        isActive: true,
      });
      console.log('Created fresh Admin user: admin@velvix.com / admin123');
    } else {
      admin.allowedModules = ['lead_generation', 'leads', 'candidates', 'marketing'];
      admin.designation = admin.designation || 'System Administrator';
      admin.isActive = true;
      await admin.save();
      console.log(`Preserved existing Admin user: ${admin.email}`);
    }

    // Clean up uploaded files in uploads directory (keep .gitkeep / folder structure)
    const uploadsDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      for (const file of files) {
        if (file !== '.gitkeep') {
          const filePath = path.join(uploadsDir, file);
          try {
            if (fs.statSync(filePath).isFile()) {
              fs.unlinkSync(filePath);
            }
          } catch (e) {
            console.warn(`Could not delete file ${file}:`, e.message);
          }
        }
      }
      console.log('Cleaned uploads directory.');
    }

    console.log('==============================================');
    console.log('DATABASE WIPED CLEAN SUCCESSFULLY!');
    console.log('Remaining User:');
    console.log(`- Email: ${admin.email}`);
    console.log(`- Role: ${admin.role}`);
    console.log(`- Allowed Modules: ${admin.allowedModules.join(', ')}`);
    console.log('==============================================');

    await closeDB();
    process.exit(0);
  } catch (error) {
    console.error('Error wiping database:', error);
    process.exit(1);
  }
}

wipeDatabase();
