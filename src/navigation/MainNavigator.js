import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainTabs from './MainTabs';
import ChatList from '../screens/Common/Chat/ChatList';

import MaintenanceDetailsScreen from '../screens/Admin/MaintanceDetails/MaintenanceDetailsScreen';
import AddEmergencyContactScreen from '../screens/Admin/AddEmgergencyContact/AddEmergencyContactScreen';
import EditEmergencyContactScreen from '../screens/Admin/AddEmgergencyContact/EditEmergencyContactScreen';
import { AddBookingCategoryScreen } from '../screens/Admin/AddBookingCategory/AddBookingCategoryScreen';
import { BookingCategoryDetailsScreen } from '../screens/Admin/AddBookingCategory/BookingCategoryDetailsScreen';
import { ServiceDetailsScreen } from '../screens/Admin/AddHomeStore/ServiceDetailsScreen';

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
      <Stack.Screen name="MaintenanceDetailsScreen" component={MaintenanceDetailsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddEmergencyContactScreen" component={AddEmergencyContactScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditEmergencyContactScreen" component={EditEmergencyContactScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddBookingCategoryScreen" component={AddBookingCategoryScreen} options={{ headerShown: false }} />
      <Stack.Screen name="BookingCategoryDetailsScreen" component={BookingCategoryDetailsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="ServiceDetailsScreen" component={ServiceDetailsScreen} options={{ headerShown: false }} />
      {/* Add other full-screen screens here */}
    </Stack.Navigator>
  );
}