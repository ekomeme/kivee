/**
 * Migration Script: Sync Group Members (Using Admin SDK)
 *
 * This script migrates existing player-group relationships to the groups/{groupId}/members subcollection.
 *
 * Problem: Students with groupId assigned don't appear in their group's Students tab because
 * the members subcollection was never populated.
 *
 * Solution: For each player with a groupId, create a corresponding entry in
 * groups/{groupId}/members/{playerId}
 *
 * Setup:
 *   1. Download service account key from Firebase Console:
 *      Project Settings > Service Accounts > Generate New Private Key
 *   2. Save as 'serviceAccountKey.json' in project root (already in .gitignore)
 *   3. Run: node scripts/migrateGroupMembers.admin.js [staging|production]
 *
 * Usage:
 *   node scripts/migrateGroupMembers.admin.js staging
 *   node scripts/migrateGroupMembers.admin.js production
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Get environment from command line argument
const environment = process.argv[2] || 'staging';

if (!['staging', 'production'].includes(environment)) {
  console.error('❌ Invalid environment. Use: node scripts/migrateGroupMembers.admin.js [staging|production]');
  process.exit(1);
}

console.log(`🔧 Environment: ${environment.toUpperCase()}\n`);

// Load service account key
let serviceAccount;
const keyPath = environment === 'production'
  ? './serviceAccountKey.production.json'
  : './serviceAccountKey.staging.json';

try {
  serviceAccount = JSON.parse(readFileSync(keyPath, 'utf8'));
} catch (error) {
  console.error(`❌ Error: Could not find service account key at ${keyPath}`);
  console.error('\nTo fix this:');
  console.error('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.error('2. Click "Generate New Private Key"');
  console.error(`3. Save the file as ${keyPath} in your project root`);
  console.error('\nNote: This file is already in .gitignore and won\'t be committed.\n');
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateGroupMembers() {
  console.log('🚀 Starting group members migration...\n');
  console.log(`📦 Project: ${serviceAccount.project_id}\n`);

  try {
    // Get all academies
    const academiesSnapshot = await db.collection('academies').get();

    console.log(`Found ${academiesSnapshot.size} academies\n`);

    let totalPlayers = 0;
    let totalPlayersWithGroups = 0;
    let totalMembersCreated = 0;
    let totalErrors = 0;

    // Process each academy
    for (const academyDoc of academiesSnapshot.docs) {
      const academyId = academyDoc.id;
      const academyData = academyDoc.data();
      console.log(`\n📚 Processing academy: ${academyData.name || academyId}`);

      // Get all players in this academy
      const playersSnapshot = await db
        .collection('academies')
        .doc(academyId)
        .collection('players')
        .get();

      totalPlayers += playersSnapshot.size;
      console.log(`  Found ${playersSnapshot.size} players`);

      // Track groups in this academy
      const groupMembersMap = {}; // { groupId: [playerIds] }

      // Process each player
      for (const playerDoc of playersSnapshot.docs) {
        const playerId = playerDoc.id;
        const playerData = playerDoc.data();

        // Check if player has a groupId
        if (playerData.groupId) {
          totalPlayersWithGroups++;

          const groupId = playerData.groupId;

          // Track for summary
          if (!groupMembersMap[groupId]) {
            groupMembersMap[groupId] = [];
          }
          groupMembersMap[groupId].push(playerId);

          try {
            // Create member entry in group's members subcollection
            await db
              .collection('academies')
              .doc(academyId)
              .collection('groups')
              .doc(groupId)
              .collection('members')
              .doc(playerId)
              .set({ playerId }, { merge: true });

            totalMembersCreated++;
            console.log(`  ✅ Added ${playerData.name || playerId} to group ${groupId}`);
          } catch (error) {
            totalErrors++;
            console.error(`  ❌ Error adding ${playerId} to group ${groupId}:`, error.message);
          }
        }
      }

      // Summary for this academy
      if (Object.keys(groupMembersMap).length > 0) {
        console.log(`\n  📊 Summary for ${academyData.name || academyId}:`);
        for (const [groupId, playerIds] of Object.entries(groupMembersMap)) {
          console.log(`    Group ${groupId}: ${playerIds.length} members added`);
        }
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('✨ Migration Complete!\n');
    console.log(`📊 Statistics:`);
    console.log(`  Total academies processed: ${academiesSnapshot.size}`);
    console.log(`  Total players found: ${totalPlayers}`);
    console.log(`  Players with groups: ${totalPlayersWithGroups}`);
    console.log(`  Member entries created: ${totalMembersCreated}`);
    console.log(`  Errors: ${totalErrors}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateGroupMembers()
  .then(() => {
    console.log('\n✅ Migration script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
