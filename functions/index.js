const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();

exports.sendToUserDevices = functions.https.onCall(async (data, context) => {
  try {
    const { communityId, userId, title, body, extraData = {} } = data?.data;

    console.log('Received data:', { communityId, userId, title, body, extraData});

    console.log('data:', data?.data);

    // Validate required parameters
    if (!communityId || !userId || !title || !body) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Missing required parameters: communityId, userId, title, body'
      );
    }

    const userRef = admin
      .firestore()
      .collection('communities')
      .doc(communityId)
      .collection('users')
      .doc(userId);

    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      console.error('User document not found');
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    // Fixed: Check for both 'tokens' and 'fcmTokens' field names
    const userData = userDoc.data();
    const fcmTokens = userData.tokens || userData.fcmTokens || [];

    if (!fcmTokens.length) {
      console.warn('No FCM tokens found for user');
      return { success: false, message: 'No tokens found' };
    }

    // Convert extraData object values to strings (FCM requirement)
    const stringifiedData = {};
    Object.keys(extraData).forEach(key => {
      stringifiedData[key] = String(extraData[key]);
    });

    const message = {
      tokens: fcmTokens,
      notification: { 
        title, 
        body 
      },
      data: stringifiedData, 
      // Add platform-specific configurations
      android: {
        notification: {
          sound: 'default',
          priority: 'high'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    const invalidTokens = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code;
        console.error('Error sending to token:', fcmTokens[idx], code);
        
        // Check for invalid token error codes
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-argument'
        ) {
          invalidTokens.push(fcmTokens[idx]);
        }
      }
    });

    // Clean up invalid tokens - use consistent field name
    if (invalidTokens.length > 0) {
      const fieldToUpdate = userData.tokens ? 'tokens' : 'fcmTokens';
      await userRef.update({
        [fieldToUpdate]: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
      });
      console.log(`Removed ${invalidTokens.length} invalid tokens`);
    }

    return {
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
      cleaned: invalidTokens.length,
      totalTokens: fcmTokens.length
    };

  } catch (error) {
    console.error('Error in sendToUserDevices:', error);
    
    // Re-throw HttpsError as-is, wrap others
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal', 
      'Failed to send notification',
      error.message
    );
  }
});


exports.sendNotificationToSecurity = functions.https.onCall(async (data, context) => {
  try {
    const { communityId, passId, title, body, extraData = {} } = data?.data;

    console.log('Received data:', { communityId, passId, title, body, extraData });

    // Validate required parameters
    if (!communityId || !passId || !title || !body) {
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Missing required parameters: communityId, passId, title, body'
      );
    }

    // Get all users in the community
    const usersRef = admin
      .firestore()
      .collection('communities')
      .doc(communityId)
      .collection('users');

    // Query for users with role "Security"
    const securityUsersQuery = await usersRef.where('role', '==', 'Security').get();

    if (securityUsersQuery.empty) {
      console.warn('No security personnel found in community');
      return { 
        success: false, 
        message: 'No security personnel found in community',
        securityCount: 0
      };
    }

    // Collect all FCM tokens from security users
    const allSecurityTokens = [];
    const securityUserDetails = [];

    securityUsersQuery.docs.forEach(doc => {
      const userData = doc.data();
      const userTokens = userData.tokens || userData.fcmTokens || [];
      
      if (userTokens.length > 0) {
        allSecurityTokens.push(...userTokens);
        securityUserDetails.push({
          userId: doc.id,
          name: userData.name,
          tokenCount: userTokens.length
        });
      }
    });

    if (allSecurityTokens.length === 0) {
      console.warn('No FCM tokens found for security personnel');
      return { 
        success: false, 
        message: 'No FCM tokens found for security personnel',
        securityCount: securityUsersQuery.size
      };
    }

    // Add passId to extraData for reference
    const stringifiedData = {
      passId: String(passId),
      communityId: String(communityId),
    };

    // Convert other extraData object values to strings (FCM requirement)
    Object.keys(extraData).forEach(key => {
      stringifiedData[key] = String(extraData[key]);
    });

    const message = {
      tokens: allSecurityTokens,
      notification: { 
        title, 
        body 
      },
      data: stringifiedData,
      // Add platform-specific configurations
      android: {
        notification: {
          sound: 'default',
          priority: 'high',
          channelId: 'security_alerts'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            category: 'SECURITY_ALERT'
          }
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Handle invalid tokens and clean them up
    const invalidTokens = [];
    const tokenToUserMap = new Map();
    
    // Create a map to track which user each token belongs to
    let tokenIndex = 0;
    securityUsersQuery.docs.forEach(doc => {
      const userData = doc.data();
      const userTokens = userData.tokens || userData.fcmTokens || [];
      userTokens.forEach(token => {
        tokenToUserMap.set(tokenIndex, {
          userId: doc.id,
          token: token,
          fieldName: userData.tokens ? 'tokens' : 'fcmTokens'
        });
        tokenIndex++;
      });
    });

    // Process response and identify invalid tokens
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code;
        console.error('Error sending to token:', allSecurityTokens[idx], code);
        
        // Check for invalid token error codes
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-argument'
        ) {
          const tokenInfo = tokenToUserMap.get(idx);
          if (tokenInfo) {
            invalidTokens.push(tokenInfo);
          }
        }
      }
    });

    // Clean up invalid tokens from respective users
    if (invalidTokens.length > 0) {
      const cleanupPromises = [];
      const tokensByUser = new Map();
      
      // Group invalid tokens by user
      invalidTokens.forEach(tokenInfo => {
        if (!tokensByUser.has(tokenInfo.userId)) {
          tokensByUser.set(tokenInfo.userId, {
            tokens: [],
            fieldName: tokenInfo.fieldName
          });
        }
        tokensByUser.get(tokenInfo.userId).tokens.push(tokenInfo.token);
      });

      // Create cleanup promises for each user
      tokensByUser.forEach((data, userId) => {
        const userRef = usersRef.doc(userId);
        cleanupPromises.push(
          userRef.update({
            [data.fieldName]: admin.firestore.FieldValue.arrayRemove(...data.tokens),
          })
        );
      });

      await Promise.all(cleanupPromises);
      console.log(`Removed ${invalidTokens.length} invalid tokens from ${tokensByUser.size} security users`);
    }

    return {
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
      cleaned: invalidTokens.length,
      totalTokens: allSecurityTokens.length,
      securityCount: securityUsersQuery.size,
      securityWithTokens: securityUserDetails.length,
      passId: passId,
      securityDetails: securityUserDetails
    };

  } catch (error) {
    console.error('Error in sendNotificationToSecurity:', error);
    
    // Re-throw HttpsError as-is, wrap others
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    
    throw new functions.https.HttpsError(
      'internal', 
      'Failed to send notification to security personnel',
      error.message
    );
  }
});


exports.generateMonthlyMaintenance = functions.scheduler.onSchedule({
  schedule: '1 0 1 * *', // Cron expression: minute hour day month dayOfWeek
  timeZone: 'Asia/Kolkata', // Set your timezone
}, async (context) => {
  try {
    console.log('Starting monthly maintenance generation...');
    
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 10); // Due on 10th of current month
    
    // Get all communities
    const communitiesSnapshot = await db.collection('communities').get();
    
    for (const communityDoc of communitiesSnapshot.docs) {
      const communityId = communityDoc.id;
      const communityData = communityDoc.data();
      
      console.log(`Processing community: ${communityData.name}`);
      
      // Get all approved users in this community (Residents and Admins)
      const usersSnapshot = await db
        .collection('communities')
        .doc(communityId)
        .collection('users')
        .where('approved', '==', true)
        .where('role', 'in', ['Resident', 'Admin']) // Include both Residents and Admins
        .get();
      
      const batch = db.batch();
      let generatedCount = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Check if maintenance already exists for this month
        const existingDueQuery = await db
          .collection('communities')
          .doc(communityId)
          .collection('maintenanceDues')
          .where('userId', '==', userId)
          .where('month', '==', currentMonth)
          .get();
        
        if (existingDueQuery.empty) {
          // Generate maintenance due
          const dueId = db
            .collection('communities')
            .doc(communityId)
            .collection('maintenanceDues')
            .doc().id;
          
          const maintenanceDue = {
            apartmentId: userData.apartmentId,
            userId: userId,
            userName: userData.name,
            month: currentMonth,
            amount: getMaintenanceAmount(userData.apartmentId, communityData), // You can customize this
            dueDate: admin.firestore.Timestamp.fromDate(dueDate),
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            paymentId: null,
            lateFee: 0,
            notes: `Monthly maintenance for apartment ${userData.apartmentId} - ${currentMonth}`
          };
          
          const dueRef = db
            .collection('communities')
            .doc(communityId)
            .collection('maintenanceDues')
            .doc(dueId);
          
          batch.set(dueRef, maintenanceDue);
          generatedCount++;
        }
      }
      
      // Commit the batch
      if (generatedCount > 0) {
        await batch.commit();
        console.log(`Generated ${generatedCount} maintenance dues for community ${communityData.name}`);
      } else {
        console.log(`No new maintenance dues needed for community ${communityData.name}`);
      }
    }
    
    console.log('Monthly maintenance generation completed successfully');
    return null;
    
  } catch (error) {
    console.error('Error generating monthly maintenance:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate monthly maintenance');
  }
});

// Helper function to determine maintenance amount based on apartment and community settings
function getMaintenanceAmount(apartmentId, communityData) {
  // Use the monthlyMaintenanceAmount from community document
  return communityData.monthlyMaintenanceAmount || 2000; // Default to 2000 if not set
}

// Optional: Manual trigger function for testing
exports.generateMaintenanceManual = functions.https.onCall(async (data, context) => {
  try {
    console.log('Starting manual maintenance generation...');
    
    const currentDate = new Date();
    const currentMonth = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 10);
    
    // Get all communities
    const communitiesSnapshot = await db.collection('communities').get();
    let totalGenerated = 0;
    
    for (const communityDoc of communitiesSnapshot.docs) {
      const communityId = communityDoc.id;
      const communityData = communityDoc.data();
      
      console.log(`Processing community: ${communityData.name}`);
      
      // Get all approved users in this community (Residents and Admins)
      const usersSnapshot = await db
        .collection('communities')
        .doc(communityId)
        .collection('users')
        .where('approved', '==', true)
        .where('role', 'in', ['Resident', 'Admin'])
        .get();
      
      const batch = db.batch();
      let generatedCount = 0;
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Check if maintenance already exists for this month
        const existingDueQuery = await db
          .collection('communities')
          .doc(communityId)
          .collection('maintenanceDues')
          .where('userId', '==', userId)
          .where('month', '==', currentMonth)
          .get();
        
        if (existingDueQuery.empty) {
          const dueId = db
            .collection('communities')
            .doc(communityId)
            .collection('maintenanceDues')
            .doc().id;
          
          const maintenanceDue = {
            apartmentId: userData.apartmentId,
            userId: userId,
            userName: userData.name,
            month: currentMonth,
            amount: getMaintenanceAmount(userData.apartmentId, communityData),
            dueDate: admin.firestore.Timestamp.fromDate(dueDate),
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            paymentId: null,
            lateFee: 0,
            notes: `Monthly maintenance for apartment ${userData.apartmentId} - ${currentMonth}`
          };
          
          const dueRef = db
            .collection('communities')
            .doc(communityId)
            .collection('maintenanceDues')
            .doc(dueId);
          
          batch.set(dueRef, maintenanceDue);
          generatedCount++;
        }
      }
      
      if (generatedCount > 0) {
        await batch.commit();
        totalGenerated += generatedCount;
        console.log(`Generated ${generatedCount} maintenance dues for community ${communityData.name}`);
      }
    }
    
    return {
      success: true,
      message: `Manual generation completed. Generated ${totalGenerated} maintenance dues.`,
      totalGenerated: totalGenerated
    };
    
  } catch (error) {
    console.error('Error in manual maintenance generation:', error);
    throw new functions.https.HttpsError('internal', 'Failed to generate maintenance manually');
  }
});

// Function to mark overdue maintenance
exports.markOverdueMaintenance = functions.scheduler.onSchedule({
  schedule: '0 2 * * *', // Run daily at 2 AM
  timeZone: 'Asia/Kolkata'
}, async (context) => {
  try {
    console.log('Checking for overdue maintenance...');
    
    const currentDate = new Date();
    
    // Get all communities
    const communitiesSnapshot = await db.collection('communities').get();
    
    for (const communityDoc of communitiesSnapshot.docs) {
      const communityId = communityDoc.id;
      
      // Get pending maintenance dues that are past due date
      const overdueQuery = await db
        .collection('communities')
        .doc(communityId)
        .collection('maintenanceDues')
        .where('status', '==', 'pending')
        .where('dueDate', '<', admin.firestore.Timestamp.fromDate(currentDate))
        .get();
      
      const batch = db.batch();
      let overdueCount = 0;
      
      overdueQuery.forEach((doc) => {
        batch.update(doc.ref, {
          status: 'overdue',
          lateFee: 500, // Add late fee
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        overdueCount++;
      });
      
      if (overdueCount > 0) {
        await batch.commit();
        console.log(`Marked ${overdueCount} maintenance dues as overdue in community ${communityId}`);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error marking overdue maintenance:', error);
    return null; // Don't throw error to prevent function retries
  }
});

