import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Common Screens
import Timeline from '../screens/Common/Timeline/Timeline';
import NoticeBoard from '../screens/Common/NoticeBoard/NoticeBoard';
import ProfileScreen from '../screens/Common/Profile/ProfileScreen';

// Role-specific AdminDashboard 
import AdminDashboard from '../screens/Admin/AdminDashboard';
import { AddHomeStoreServiceScreen } from '../screens/Admin/AddHomeStore/AddHomeStoreServiceScreen';


// Role-specific ResidentDashboard
import ResidentDashboard from '../screens/Resident/ResidentDashboard';
import SecurityDashboard from '../screens/Security/SecurityDashboard';
import GatePassScreen from '../screens/Resident/GatePassScreen';
import GatePassHistoryScreen from '../screens/Resident/GatePassHistoryScreen';
import MaintenanceScreen from '../screens/Resident/MaintenanceScreen';
import PaymentHistoryScreen from '../screens/Resident/PaymentHistoryScreen';
import BookingScreen from '../screens/Resident/BookingScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Role-specific dashboard stacks
const AdminStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="AdminDashboard" component={AdminDashboard} options={{ headerShown: false }} />
    <Stack.Screen name="AddHomeStoreServiceScreen" component={AddHomeStoreServiceScreen} options={{ headerShown: false }} />
    <Stack.Screen name="ResidentDashboard" component={ResidentDashboard} options={{ headerShown: false }} />
    <Stack.Screen name="GatePassScreen" component={GatePassScreen} options={{ headerShown: false }} />
    <Stack.Screen name="GatePassHistoryScreen" component={GatePassHistoryScreen} options={{ headerShown: false }} />
    <Stack.Screen name="MaintenanceScreen" component={MaintenanceScreen} options={{ headerShown: false }} />
    <Stack.Screen name="PaymentHistoryScreen" component={PaymentHistoryScreen} options={{ headerShown: false }} />
    <Stack.Screen name="BookingScreen" component={BookingScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const ResidentStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="ResidentDashboard" component={ResidentDashboard} options={{ headerShown: false }} />
    <Stack.Screen name="GatePassScreen" component={GatePassScreen} options={{ headerShown: false }} />
    <Stack.Screen name="GatePassHistoryScreen" component={GatePassHistoryScreen} options={{ headerShown: false }} />
    <Stack.Screen name="MaintenanceScreen" component={MaintenanceScreen} options={{ headerShown: false }} />
    <Stack.Screen name="PaymentHistoryScreen" component={PaymentHistoryScreen} options={{ headerShown: false }} />
    <Stack.Screen name="BookingScreen" component={BookingScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const SecurityStack = () => (
  <Stack.Navigator>
    <Stack.Screen name="SecurityDashboard" component={SecurityDashboard} options={{ headerShown: false }} />
    {/* Add other security-specific screens here */}
  </Stack.Navigator>
);

const MainTabs = ({ role, userData, communityData, navigation }) => {
  const getRoleStack = () => {
    switch (role) {
      case 'Admin':
        return AdminStack;
      case 'Resident':
        return ResidentStack;
      case 'Security':
      case 'guard':
        return SecurityStack;
      default:
        return ResidentStack;
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color }) => {
          let iconName;

          switch (route.name) {
            case 'Home':
              iconName = role === 'Admin'
                ? 'view-dashboard-outline'
                : role === 'Security'
                  ? 'shield-home'
                  : 'home-analytics';
              break;
            case 'Feed':
              iconName = 'post-outline'; // or 'rss-box' or 'image-multiple'
              break;
            case 'Notices':
              iconName = 'bulletin-board';
              break;
            case 'Profile':
              iconName = 'account-circle';
              break;
            default:
              iconName = 'circle';
          }

          // Increase icon size when focused
          const iconSize = focused ? 26 : 24;

          return <Icon name={iconName} size={iconSize} color={color} />;
        },
        tabBarActiveTintColor: '#f7933b',
        tabBarInactiveTintColor: '#488a42',
        tabBarStyle: {
          bottom: 2, 
          elevation: 5,
          backgroundColor: '#fff',
          borderRadius: 20, 
          height: 60,
          shadowColor: '#000',
          shadowOpacity: 0.1,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 8,
          backgroundColor:'#ffffff'
        },
        tabBarLabelStyle: {
          paddingBottom: 4,
          fontSize: 12,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={getRoleStack()}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Feed"
        options={{ headerShown: false }}
      >
        {(props) => (<Timeline {...props} />)}
      </Tab.Screen>
      <Tab.Screen
        name="Notices"
        component={NoticeBoard}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>

  );
};

export default MainTabs;