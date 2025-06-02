import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import MainTabs from './MainTabs';
import ChatList from '../screens/Common/Chat/ChatList';

//Maintenance
import MaintenanceDetailsScreen from '../screens/Admin/MaintanceDetails/MaintenanceDetailsScreen';

//Emergrency
import AddEmergencyContactScreen from '../screens/Admin/AddEmgergencyContact/AddEmergencyContactScreen';
import EditEmergencyContactScreen from '../screens/Admin/AddEmgergencyContact/EditEmergencyContactScreen';

//Bookings
import { AddBookingCategoryScreen } from '../screens/Admin/AddBookingCategory/AddBookingCategoryScreen';
import { BookingCategoryDetailsScreen } from '../screens/Admin/AddBookingCategory/BookingCategoryDetailsScreen';
import { EditBookingCategoryScreen } from '../screens/Admin/AddBookingCategory/EditBookingCategoryScreen';

//HomeStore
import { ServiceDetailsScreen } from '../screens/Admin/AddHomeStore/ServiceDetailsScreen';
import { AddVendorScreen } from '../screens/Admin/AddHomeStore/AddVendorScreen';
import EditVendorScreen from '../screens/Admin/AddHomeStore/EditVendorScreen';

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
      <Stack.Screen name="EditBookingCategoryScreen" component={EditBookingCategoryScreen} options={{ headerShown: false }} />

      <Stack.Screen name="ServiceDetailsScreen" component={ServiceDetailsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddVendorScreen" component={AddVendorScreen} options={{ headerShown: false }} />
      <Stack.Screen name="EditVendorScreen" component={EditVendorScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};