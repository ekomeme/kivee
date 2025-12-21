/**
 * Migration script: invites → invitations
 *
 * This script migrates all existing invitation data from the old 'invites'
 * subcollection to the new 'invitations' subcollection across all academies.
 *
 * Run once with: node migrate-invites.js
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch
} from 'firebase/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: join(__dirname, '.env.local') });

// Firebase configuration from .env file
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Validate configuration
if (!firebaseConfig.projectId) {
  console.error('❌ Error: Firebase configuration not found in .env file');
  process.exit(1);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateInvites() {
  console.log('🚀 Starting migration: invites → invitations');
  console.log('━'.repeat(50));

  try {
    // Get all academies
    const academiesRef = collection(db, 'academies');
    const academiesSnap = await getDocs(academiesRef);

    if (academiesSnap.empty) {
      console.log('⚠️  No academies found');
      return;
    }

    console.log(`📚 Found ${academiesSnap.size} academies`);
    console.log('━'.repeat(50));

    let totalMigrated = 0;
    let totalErrors = 0;

    // Process each academy
    for (const academyDoc of academiesSnap.docs) {
      const academyId = academyDoc.id;
      const academyName = academyDoc.data().name || 'Unknown';

      console.log(`\n🏫 Processing: ${academyName} (${academyId})`);

      try {
        // Get old 'invites' collection
        const oldInvitesRef = collection(db, `academies/${academyId}/invites`);
        const oldInvitesSnap = await getDocs(oldInvitesRef);

        if (oldInvitesSnap.empty) {
          console.log('   ℹ️  No invites to migrate');
          continue;
        }

        console.log(`   📧 Found ${oldInvitesSnap.size} invites to migrate`);

        // Use batch for atomic operations
        const batch = writeBatch(db);
        let batchCount = 0;

        for (const inviteDoc of oldInvitesSnap.docs) {
          const inviteId = inviteDoc.id;
          const inviteData = inviteDoc.data();

          // Create new document in 'invitations' collection
          const newInviteRef = doc(db, `academies/${academyId}/invitations`, inviteId);
          batch.set(newInviteRef, inviteData);

          // Delete old document
          const oldInviteRef = doc(db, `academies/${academyId}/invites`, inviteId);
          batch.delete(oldInviteRef);

          batchCount++;
          totalMigrated++;

          console.log(`   ✓ Queued: ${inviteData.email || inviteId}`);

          // Commit batch every 500 operations (Firestore limit is 500)
          if (batchCount >= 500) {
            await batch.commit();
            console.log(`   💾 Batch committed (${batchCount} operations)`);
            batchCount = 0;
          }
        }

        // Commit remaining operations
        if (batchCount > 0) {
          await batch.commit();
          console.log(`   ✅ Migration completed for ${academyName}`);
          console.log(`   💾 Final batch committed (${batchCount} operations)`);
        }

      } catch (error) {
        console.error(`   ❌ Error migrating academy ${academyId}:`, error);
        totalErrors++;
      }
    }

    console.log('\n' + '━'.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   ✅ Total invites migrated: ${totalMigrated}`);
    console.log(`   ❌ Errors encountered: ${totalErrors}`);
    console.log('━'.repeat(50));

    if (totalErrors === 0) {
      console.log('\n🎉 Migration completed successfully!');
      console.log('\n⚠️  IMPORTANT NEXT STEPS:');
      console.log('   1. Deploy updated Firestore rules: firebase deploy --only firestore:rules');
      console.log('   2. Test invitation functionality in your app');
      console.log('   3. Verify data in Firebase Console');
    } else {
      console.log('\n⚠️  Migration completed with errors. Please review the logs above.');
    }

  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
    process.exit(1);
  }
}

// Run migration
console.log('\n⚠️  WARNING: This will migrate all invitation data!');
console.log('Make sure you have a backup before proceeding.\n');

// Run the migration
migrateInvites().then(() => process.exit(0));
