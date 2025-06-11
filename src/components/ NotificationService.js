import notifee, { EventType, AndroidImportance } from '@notifee/react-native';
import { el } from 'date-fns/locale';
import { PermissionsAndroid, Platform } from 'react-native';
import { navigationRef } from './NavigationService'; 
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';

class NotificationService {

  async requestUserPermission() {
    try {
      // Check if the device is Android
      if (Platform.OS === 'android') {
        // Android 13 (API level 33) and above requires explicit permission
        if (Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'App needs notification permission to show notifications.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );

          // Check the permission result
          switch (granted) {
            case PermissionsAndroid.RESULTS.GRANTED:
              console.log('Notification permission granted');
              const authStatus = await messaging().requestPermission();
              const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

              if (enabled) {
                console.log(' firebase Notification permission granted.');
              } else {
                console.log('Notification permission denied.');
              }
              return true;
            case PermissionsAndroid.RESULTS.DENIED:
              console.log('Notification permission denied');
              return false;
            case PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN:
              console.log('Notification permission denied and never ask again');
              // You might want to direct user to settings
              return false;
          }
        } else {
          // For Android 12 (API level 32) and below
          // No runtime permission needed, return true
          console.log('Android version < 13, no runtime permission needed');
          return true;
        }
      } else {
        // iOS permission handling
        const settings = await notifee.requestPermission({
          alert: true,
          badge: true,
          sound: true,
        });
        
        return settings.authorizationStatus >= 1;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  // Helper method to check if permissions are already granted
  async checkNotificationPermission() {
    try {
      if (Platform.OS === 'android') {
        if (Platform.Version >= 33) {
          const result = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          return result;
        }
        return true; // Android < 13 always returns true
      } else {
        const settings = await notifee.getNotificationSettings();
        return settings.authorizationStatus >= 1;
      }
    } catch (error) {
      console.error('Error checking notification permission:', error);
      return false;
    }
  }

  // Create a notification channel (Android)
  async createChannel() {
    const channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
    return channelId;
  }

  // Display a local notification
  async displayNotification(title, body, data = {}) {
    // Create channel for Android
    const channelId = await this.createChannel();

    // Display notification
    await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
      },
      ios: {
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
      },
    });
  }

  async onNotificationEvent() {
    return notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('User pressed notification', detail);
        if (detail.notification?.data?.screen) {
          navigationRef.navigate(detail.notification.data.screen);
        }
      }
    });
  }
  
  async onBackgroundEvent() {
    return notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('User pressed notification from background', detail);
        if (detail.notification?.data?.screen) {
          navigationRef.navigate(detail.notification.data.screen); 
        }
      }
    });
  }
  
  // Method to open app settings if permission is permanently denied
  async openSettings() {
    if (Platform.OS === 'android') {
      try {
        await notifee.openNotificationSettings();
      } catch (error) {
        console.error('Error opening settings:', error);
      }
    }
  }
  async getFCMToken(userId, communityId) {
    try {
      const token = await messaging().getToken();
      console.log('FCM Token:', token);
      
      if (userId && communityId) {
        await this.updateUserToken(userId, communityId, token);
      }
      
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      throw error;
    }
  }

  async updateUserToken(userId, communityId, token) {
    try {
      const userRef = firestore()
        .collection('communities')
        .doc(communityId)
        .collection('users')
        .doc(userId);

      // Get the current user document
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        console.log('User document does not exist');
        return;
      }

      // Get current tokens array or initialize if it doesn't exist
      const currentTokens = userDoc.data().tokens || [];
      
      // Check if token already exists
      if (!currentTokens.includes(token)) {
        // Update the tokens array with the new token
        await userRef.update({
          tokens: firestore.FieldValue.arrayUnion(token)
        });
        console.log('FCM token added to user document');
      } else {
        console.log('FCM token already exists in user document');
      }
    } catch (error) {
      console.error('Error updating user token:', error);
      throw error;
    }
  }

  handleForegroundNotifications() {
    messaging().onMessage(async (remoteMessage) => {
      console.log('Foreground Notification:', remoteMessage);
      await this.displayNotification(
        remoteMessage.notification.title,
        remoteMessage.notification.body,
        remoteMessage.data
      );
    });
  }

  handleBackgroundNotifications() {
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('Background Notification:', remoteMessage);
      await this.displayNotification(
        remoteMessage.notification.title,
        remoteMessage.notification.body,
        remoteMessage.data
      );
    });
  }

  handleKilledStateNotifications() {
    messaging().getInitialNotification().then((remoteMessage) => {
        if (remoteMessage) {
          console.log('Killed State Notification:', remoteMessage);
          // Handle deep linking or navigation
        }
      });
  }
}

export default new NotificationService();
