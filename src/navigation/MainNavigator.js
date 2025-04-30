import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainTabs from './MainTabs';
import ChatList from '../screens/Common/Chat/ChatList';
// Import any other screens that should appear as full-screen

const Stack = createStackNavigator();

export default function MainNavigator({ role, userData, communityData }) {
  return (
    <Stack.Navigator>
      {/* Main tabs as the base screen */}
      <Stack.Screen  name="MainTabs" options={{ headerShown: false }}>
        {(props) => (
          <MainTabs 
            {...props} 
            role={role} 
            userData={userData} 
            communityData={communityData} 
          />
        )}
      </Stack.Screen>
      
      {/* Full-screen routes that will appear outside the tab bar */}
      <Stack.Screen name="ChatList" component={ChatList} options={{ headerShown: false }} />
      {/* Add other full-screen screens here */}
    </Stack.Navigator>
  );
}