/**
 * Script to compress existing player photos in Firebase Storage
 *
 * This script:
 * 1. Fetches all players from Firestore
 * 2. For each player with a photo but no compressed versions
 * 3. Downloads the original photo
 * 4. Creates 3 compressed versions (thumbnail, medium, original)
 * 5. Uploads them to Firebase Storage
 * 6. Updates the player document with the new URLs
 *
 * Usage: node scripts/compress-existing-photos.js
 */

import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import sharp from 'sharp';
import fetch from 'node-fetch';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(new URL('../serviceAccountKey.json', import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'kivee-f4c53.firebasestorage.app'
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

/**
 * Download image from URL as a Buffer
 */
async function downloadImage(url) {
  const response = await fetch(url);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Compress and upload a single image using sharp
 */
async function compressAndUpload(imageBuffer, path, maxSize, quality) {
  // Use sharp to resize and compress
  const compressedBuffer = await sharp(imageBuffer)
    .resize(maxSize, maxSize, {
      fit: 'inside', // Maintain aspect ratio
      withoutEnlargement: true // Don't upscale smaller images
    })
    .jpeg({
      quality: Math.round(quality * 100), // sharp uses 1-100, we use 0-1
      mozjpeg: true // Use mozjpeg for better compression
    })
    .toBuffer();

  const fileRef = bucket.file(path);
  await fileRef.save(compressedBuffer, {
    metadata: {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000', // Cache for 1 year
    }
  });

  await fileRef.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${path}`;
}

/**
 * Process a single player's photo
 */
async function processPlayerPhoto(academyId, playerId, playerData) {
  // Skip if already has compressed versions
  if (playerData.photoThumbnailURL && playerData.photoMediumURL) {
    console.log(`✓ Player ${playerId} already has compressed photos, skipping...`);
    return { skipped: true };
  }

  // Skip if no photo
  if (!playerData.photoURL) {
    console.log(`- Player ${playerId} has no photo, skipping...`);
    return { skipped: true };
  }

  try {
    console.log(`Processing player ${playerId} (${playerData.name} ${playerData.lastName})...`);

    // Download original image
    console.log('  Downloading original image...');
    const imageBuffer = await downloadImage(playerData.photoURL);

    // Extract base filename
    const pathParts = playerData.photoPath?.split('/') || [];
    const filename = pathParts[pathParts.length - 1] || 'photo.jpg';
    const baseFilename = filename.replace(/\.[^/.]+$/, '');
    const timestamp = Date.now();
    const basePath = `academies/${academyId}/player_photos`;

    // Compress and upload thumbnail (72x72)
    console.log('  Creating thumbnail (72x72)...');
    const thumbnailPath = `${basePath}/${timestamp}_${baseFilename}_thumb.jpg`;
    const thumbnailURL = await compressAndUpload(imageBuffer, thumbnailPath, 72, 0.8);

    // Compress and upload medium (200x200)
    console.log('  Creating medium (200x200)...');
    const mediumPath = `${basePath}/${timestamp}_${baseFilename}_medium.jpg`;
    const mediumURL = await compressAndUpload(imageBuffer, mediumPath, 200, 0.85);

    // Compress and upload optimized original (800x800)
    console.log('  Creating optimized original (800x800)...');
    const originalPath = `${basePath}/${timestamp}_${baseFilename}.jpg`;
    const originalURL = await compressAndUpload(imageBuffer, originalPath, 800, 0.9);

    // Update Firestore document
    console.log('  Updating Firestore...');
    await db.collection('academies').doc(academyId).collection('players').doc(playerId).update({
      photoURL: originalURL,
      photoThumbnailURL: thumbnailURL,
      photoMediumURL: mediumURL,
      photoPath: originalPath,
      photoThumbnailPath: thumbnailPath,
      photoMediumPath: mediumPath,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Delete old photo if it exists and is different
    if (playerData.photoPath && playerData.photoPath !== originalPath) {
      try {
        console.log('  Deleting old photo...');
        await bucket.file(playerData.photoPath).delete();
      } catch (err) {
        console.warn(`  Warning: Could not delete old photo: ${err.message}`);
      }
    }

    console.log(`✓ Successfully processed player ${playerId}`);
    return {
      success: true,
      thumbnailURL,
      mediumURL,
      originalURL
    };

  } catch (error) {
    console.error(`✗ Error processing player ${playerId}:`, error.message);
    return { error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('Starting photo compression script...\n');

  try {
    // Get all academies
    const academiesSnapshot = await db.collection('academies').get();
    console.log(`Found ${academiesSnapshot.size} academies\n`);

    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const academyDoc of academiesSnapshot.docs) {
      const academyId = academyDoc.id;
      const academyData = academyDoc.data();
      console.log(`\n--- Processing Academy: ${academyData.name || academyId} ---`);

      // Get all players for this academy
      const playersSnapshot = await db
        .collection('academies')
        .doc(academyId)
        .collection('players')
        .get();

      console.log(`Found ${playersSnapshot.size} players\n`);

      for (const playerDoc of playersSnapshot.docs) {
        const playerId = playerDoc.id;
        const playerData = playerDoc.data();

        const result = await processPlayerPhoto(academyId, playerId, playerData);

        if (result.skipped) {
          totalSkipped++;
        } else if (result.error) {
          totalErrors++;
        } else if (result.success) {
          totalProcessed++;
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n\n=== SUMMARY ===');
    console.log(`Total processed: ${totalProcessed}`);
    console.log(`Total skipped: ${totalSkipped}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log('\nScript completed!');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
main();
