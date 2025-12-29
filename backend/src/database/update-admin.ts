import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

// Database connection for updating admin
const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://automation:automation_secret@localhost:5432/automation_hub',
  synchronize: false,
  logging: true,
});

async function updateAdmin() {
  console.log('🔄 Updating admin account...');

  await AppDataSource.initialize();
  console.log('📦 Database connected');

  const queryRunner = AppDataSource.createQueryRunner();

  try {
    // Hash new password
    const newPasswordHash = await bcrypt.hash('03106902002M@@z', 12);
    const oldEmail = 'admin@automation.hub';
    const newEmail = 'syedmaazsaeed@gmail.com';

    // First, check if new email already exists
    const existingUser = await queryRunner.query(`
      SELECT id, email, role FROM users WHERE email = $1
    `, [newEmail]);

    if (existingUser.length > 0) {
      // Update existing user to be admin
      await queryRunner.query(`
        UPDATE users 
        SET 
          password_hash = $1,
          role = $2,
          email_verified = true,
          is_approved = true,
          verification_code = NULL,
          verification_code_expiry = NULL
        WHERE email = $3
      `, [newPasswordHash, 'ADMIN', newEmail]);
      console.log(`✅ Existing account updated to admin!`);
    } else {
      // Update old admin account to new credentials
      const updateResult = await queryRunner.query(`
        UPDATE users 
        SET 
          email = $1,
          password_hash = $2,
          email_verified = true,
          is_approved = true,
          verification_code = NULL,
          verification_code_expiry = NULL
        WHERE email = $3
      `, [newEmail, newPasswordHash, oldEmail]);

      if (updateResult.rowCount === 0) {
        // If no existing admin, create one
        const adminId = require('uuid').v4();
        await queryRunner.query(`
          INSERT INTO users (id, name, email, password_hash, role, email_verified, is_approved)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [adminId, 'Admin User', newEmail, newPasswordHash, 'ADMIN', true, true]);
        console.log(`✅ Admin account created successfully!`);
      } else {
        console.log(`✅ Admin account updated successfully!`);
      }
    }

    // Update old admin account email if it exists (transfer ownership)
    const oldAdmin = await queryRunner.query(`
      SELECT id FROM users WHERE email = $1
    `, [oldEmail]);

    if (oldAdmin.length > 0) {
      // Get the new admin's ID
      const newAdmin = await queryRunner.query(`
        SELECT id FROM users WHERE email = $1
      `, [newEmail]);
      
      if (newAdmin.length > 0) {
        // Update all projects created_by to point to new admin
        await queryRunner.query(`
          UPDATE projects SET created_by = $1 WHERE created_by = $2
        `, [newAdmin[0].id, oldAdmin[0].id]);
        
        // Update old admin email to a disabled state (add _old suffix)
        await queryRunner.query(`
          UPDATE users SET email = $1 WHERE email = $2
        `, [`${oldEmail}_old_disabled`, oldEmail]);
        console.log(`✅ Old admin account disabled (kept for data integrity)`);
      }
    }

    console.log('\n🎉 Admin update completed!');
    console.log('\n📝 New login credentials:');
    console.log('   Email: syedmaazsaeed@gmail.com');
    console.log('   Password: 03106902002M@@z');

  } catch (error) {
    console.error('❌ Update failed:', error);
    throw error;
  } finally {
    await AppDataSource.destroy();
  }
}

updateAdmin().catch(console.error);

