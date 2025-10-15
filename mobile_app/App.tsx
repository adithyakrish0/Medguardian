import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider, useSelector } from 'react-redux';
import { store } from './src/store/store';
import { RootState } from './src/store/store';
import * as Notifications from 'expo-notifications';

// Import Screens
import LoginScreen from './src/screens/Auth/LoginScreen';
import RegisterScreen from './src/screens/Auth/RegisterScreen';
import DashboardScreen from './src/screens/Dashboard/DashboardScreen';
import MedicationsScreen from './src/screens/Medications/MedicationsScreen';
import AddMedicationScreen from './src/screens/Medications/AddMedicationScreen';
import EditMedicationScreen from './src/screens/Medications/EditMedicationScreen';
import InteractionCheckerScreen from './src/screens/InteractionChecker/InteractionCheckerScreen';
import ProfileScreen from './src/screens/Profile/ProfileScreen';
import SettingsScreen from './src/screens/Settings/SettingsScreen';
import CaregiverDashboardScreen from './src/screens/Caregiver/CaregiverDashboardScreen';

// Import Navigation
import TabNavigator from './src/navigation/TabNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();

const AppContent = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    // Request notification permissions
    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions denied');
      }
    };

    requestPermissions();

    // Load stored notifications
    const loadNotifications = async () => {
      const initialNotifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('Initial notifications:', initialNotifications);
    };

    loadNotifications();

    // Handle notifications when app is open
    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Handle notification responses
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap - navigate to appropriate screen
      const data = response.notification.request.content.data;
      if (data.screen === 'medications') {
        // Navigate to medications screen
      }
    });

    return () => {
      subscription.remove();
      responseSubscription.remove();
    };
  }, []);

  // Function to schedule medication reminder
  const scheduleReminder = async (medication: any, scheduledTime: Date) => {
    try {
      const identifier = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Medication Reminder',
          body: `Time to take ${medication.name}`,
          data: {
            medicationId: medication.id,
            screen: 'medications'
          }
        },
        trigger: {
          date: scheduledTime,
          repeats: true
        }
      });
      
      console.log('Reminder scheduled:', identifier);
      return identifier;
    } catch (error) {
      console.error('Error scheduling reminder:', error);
      return null;
    }
  };

  // Function to cancel reminder
  const cancelReminder = async (identifier: string) => {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      console.log('Reminder cancelled:', identifier);
    } catch (error) {
      console.error('Error cancelling reminder:', error);
    }
  };

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Group>
            <Stack.Screen name="Auth" component={AuthNavigator} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="Medications" component={MedicationsScreen} />
            <Stack.Screen name="AddMedication" component={AddMedicationScreen} />
            <Stack.Screen name="EditMedication" component={EditMedicationScreen} />
            <Stack.Screen name="InteractionChecker" component={InteractionCheckerScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            {user?.role === 'caregiver' && (
              <Stack.Screen name="CaregiverDashboard" component={CaregiverDashboardScreen} />
            )}
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <StatusBar style="auto" />
      <AppContent />
    </Provider>
  );
}
