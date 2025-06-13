const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

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

