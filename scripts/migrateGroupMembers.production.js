/**
 * Migration Script: Sync Group Members (PRODUCTION)
 *
 * This script migrates existing player-group relationships to the groups/{groupId}/members subcollection.
 *
 * Problem: Students with groupId assigned don't appear in their group's Students tab because
 * the members subcollection was never populated.
 *
 * Solution: For each player with a groupId, create a corresponding entry in
 * groups/{groupId}/members/{playerId}
 *
 * Usage:
 *   node scripts/migrateGroupMembers.production.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, query } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables from .env.production
dotenv.config({ path: '.env.production' });

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateGroupMembers() {
  console.log('🚀 Starting group members migration...\n');
  console.log(`📦 Project: ${firebaseConfig.projectId}\n`);

  try {
    // Get all academies
    const academiesRef = collection(db, 'academies');
    const academiesSnap = await getDocs(academiesRef);

    console.log(`Found ${academiesSnap.size} academies\n`);

    let totalPlayers = 0;
    let totalPlayersWithGroups = 0;
    let totalMembersCreated = 0;
    let totalErrors = 0;

    // Process each academy
    for (const academyDoc of academiesSnap.docs) {
      const academyId = academyDoc.id;
      const academyData = academyDoc.data();
      console.log(`\n📚 Processing academy: ${academyData.name || academyId}`);

      // Get all players in this academy
      const playersRef = collection(db, `academies/${academyId}/players`);
      const playersSnap = await getDocs(playersRef);

      totalPlayers += playersSnap.size;
      console.log(`  Found ${playersSnap.size} players`);

      // Track groups in this academy
      const groupMembersMap = {}; // { groupId: [playerIds] }

      // Process each player
      for (const playerDoc of playersSnap.docs) {
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
            const memberRef = doc(db, `academies/${academyId}/groups/${groupId}/members`, playerId);
            await setDoc(memberRef, { playerId }, { merge: true });

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
    console.log(`  Total academies processed: ${academiesSnap.size}`);
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
