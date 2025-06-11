import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './AuthStack';
import MainNavigator from './MainNavigator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import { setUserData, setCommunityData } from '../store/Slices/userSlice';
import { StatusBar, ActivityIndicator, View } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import initializeFirebase from '../services/firebase';
import { navigationRef } from '../components/NavigationService';

// Initialize Firebase before Entering into the Application
initializeFirebase();

export default function AppNavigator() {
  const dispatch = useDispatch();
  
  const { userData, communityData } = useSelector(state => state.user);

  const [isAppLoading, setIsAppLoading] = useState(true); 

  useEffect(() => {
    getStoredData();
  }, []);

  const getStoredData = async () => {
    try {
      const userId = await AsyncStorage.getItem('@userDataId');
      const communityId = await AsyncStorage.getItem('@communityDataId');
      console.log("Stored data:", userId, communityId);

      if (userId && communityId) {
        
        // Fetch fresh community data
        const communityDoc = await firestore()
          .collection('communities')
          .doc(communityId)
          .get();

        if (communityDoc.exists) {
          const freshCommunityData = {
            id: communityDoc.id,
            ...communityDoc.data(),
          };
          
          // Convert Firestore timestamps to string
          if (freshCommunityData.createdAt?.toDate) {
            freshCommunityData.createdAt = freshCommunityData.createdAt.toDate().toISOString();
          }
          if (freshCommunityData.updatedAt?.toDate) {
            freshCommunityData.updatedAt = freshCommunityData.updatedAt.toDate().toISOString();
          }

          // Fetch fresh user data from the subcollection
          const userDoc = await firestore()
            .collection('communities')
            .doc(communityId)
            .collection('users')
            .doc(userId)
            .get();

          if (userDoc.exists) {
            const freshUserData = {
              id: userDoc.id,
              ...userDoc.data(),
            };
            
            if (freshUserData.createdAt?.toDate) {
              freshUserData.createdAt = freshUserData.createdAt.toDate().toISOString();
            }
            if (freshUserData.updatedAt?.toDate) {
              freshUserData.updatedAt = freshUserData.updatedAt.toDate().toISOString();
            }

            // Dispatch fresh data to Redux
            dispatch(setUserData(freshUserData));
            dispatch(setCommunityData(freshCommunityData));
            console.log("User and community fetched and dispatched to redux");
          } else {
            console.log("User document doesn't exist in Firestore!");
          }
        } else {
          console.log("Community document doesn't exist in Firestore!");
        }
      } else {
        console.log("No userData or communityData found in storage");
      }
    } catch (err) {
      console.error('Failed to fetch data from Firestore:', err);
    } finally {
      setIsAppLoading(false); 
    }
  };

  if (isAppLoading) {
    // show loading screen while fetching async storage data
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#366732" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <StatusBar backgroundColor="#366732" barStyle="light-content" />
      {userData && communityData ? (
         <MainNavigator role={userData.role} userData={userData} communityData={communityData} />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
