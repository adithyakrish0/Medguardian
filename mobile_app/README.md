# MedGuardian Mobile App

A cross-platform mobile companion app for MedGuardian medication management system.

## Features

### 🏥 Core Features
- **Medication Reminders**: Push notifications for medication times
- **Medication Tracking**: Mark medications as taken/skipped
- **Interaction Checker**: Real-time medication interaction alerts
- **Health Profile**: Complete medication history and compliance tracking
- **Caregiver Access**: Family members can monitor loved ones' medication adherence

### 📱 Mobile Features
- **Offline Support**: Access medication data without internet
- **Push Notifications**: Real-time reminders and alerts
- **Camera Integration**: Scan medication barcodes/labels
- **Voice Commands**: Hands-free medication management
- **Health Dashboard**: Visual compliance tracking and trends

## Technology Stack

### Recommended Options:

#### Option 1: React Native (Recommended)
```bash
# Tech Stack
- React Native (JavaScript/TypeScript)
- Expo (Development Platform)
- Redux Toolkit (State Management)
- React Navigation (Navigation)
- Firebase (Push Notifications)
- SQLite (Local Database)
- React Native Camera (Barcode Scanning)
```

#### Option 2: Flutter
```bash
# Tech Stack
- Flutter (Dart)
- Provider/Bloc (State Management)
- Go Router (Navigation)
- Firebase (Push Notifications)
- Hive (Local Database)
- Camera Plugin (Barcode Scanning)
```

## Setup Instructions

### Prerequisites
- Node.js v18+ (for React Native) or Dart SDK (for Flutter)
- Android Studio / Xcode
- Expo CLI (if using React Native)
- Firebase Account

### React Native Setup
```bash
# 1. Install Expo CLI
npm install -g @expo/cli

# 2. Create new React Native project
npx create-expo-app medguardian-mobile

# 3. Navigate to project directory
cd medguardian-mobile

# 4. Install dependencies
npm install @react-navigation/native @react-navigation/native-stack redux react-redux redux-thunk @react-native-firebase/app @react-native-firebase/messaging @react-native-community/netinfo @react-native-camera-roll/camera-roll react-native-vision-camera

# 5. Install development dependencies
npm install --save-dev jest @testing-library/react-native detox

# 6. Configure Firebase
# - Create Firebase project
# - Add Android/iOS apps
# - Download google-services.json/GoogleService-Info.plist
```

### Flutter Setup
```bash
# 1. Create new Flutter project
flutter create medguardian-mobile

# 2. Navigate to project directory
cd medguardian-mobile

# 3. Install dependencies
flutter pub add provider flutter_bloc firebase_messaging hive path_provider

# 4. Install development dependencies
flutter pub add test flutter_driver

# 5. Configure Firebase
# - Follow similar steps as React Native
```

## Project Structure

### React Native Structure
```
medguardian-mobile/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── MedicationCard/
│   │   ├── ReminderItem/
│   │   └── InteractionAlert/
│   ├── screens/             # Screen components
│   │   ├── Dashboard/
│   │   ├── Medications/
│   │   ├── Reminders/
│   │   └── Profile/
│   ├── navigation/         # Navigation setup
│   ├── services/           # API services
│   ├── store/             # Redux store
│   ├── utils/             # Utility functions
│   └── types/             # TypeScript types
├── assets/                 # Images, fonts, etc.
├── ios/                   # iOS specific files
├── android/               # Android specific files
└── package.json
```

### Flutter Structure
```
medguardian-mobile/
├── lib/
│   ├── models/            # Data models
│   ├── screens/           # Screen widgets
│   ├── widgets/           # Reusable widgets
│   ├── services/          # Services
│   ├── providers/         # State management
│   ├── utils/             # Utility functions
│   └── routes/            # Navigation routes
├── assets/                # Assets
├── android/               # Android configuration
├── ios/                   # iOS configuration
└── pubspec.yaml
```

## API Integration

### Endpoints to Implement
```typescript
// Medication Management
GET /api/medications          // Get user's medications
POST /api/medications        // Add new medication
PUT /api/medications/:id     // Update medication
DELETE /api/medications/:id  // Delete medication

// Reminders
POST /api/reminders/schedule // Schedule reminder
PUT /api/reminders/:id      // Update reminder
DELETE /api/reminders/:id   // Delete reminder

// Interaction Checker
POST /api/interaction/check  // Check medication interactions
GET /api/interaction/history // Get interaction history

// Compliance Tracking
POST /api/compliance/log     // Log medication taken
GET /api/compliance/stats   // Get compliance statistics

// Caregiver Features
GET /api/caregiver/seniors  // Get managed seniors
GET /api/caregiver/stats    // Get overview stats
```

### Data Models
```typescript
interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
  custom_reminder_times: string[];
  start_date: string;
  end_date?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface Interaction {
  id: number;
  medication1_name: string;
  medication2_name: string;
  severity: 'critical' | 'major' | 'moderate' | 'minor';
  description: string;
  recommendation: string;
  source: string;
  risk_factors: string[];
}

interface ComplianceStats {
  total_doses: number;
  taken_doses: number;
  missed_doses: number;
  compliance_rate: number;
}
```

## Push Notifications

### Firebase Cloud Messaging Setup

1. **Create Firebase Project**
   - Go to Firebase Console
   - Create new project
   - Enable Cloud Messaging

2. **Configure App**
   - Add Android/iOS app to Firebase project
   - Download configuration files
   - Add to project

3. **Notification Permissions**
```typescript
// Request notification permission
const { status } = await messaging().requestPermission();

if (status === 'granted') {
  const token = await messaging().getToken();
  console.log('FCM Token:', token);
}
```

4. **Background Handlers**
```typescript
// Handle background notifications
messaging().setBackgroundMessageHandler(async remoteMessage => {
  // Handle background notification
});
```

## Offline Support

### Local Database Setup

#### React Native with SQLite
```bash
npm install @react-native-async-storage/async-storage @react-native-community/sqlite-storage
```

#### Flutter with Hive
```bash
flutter pub add hive flutter_hive
```

### Sync Strategy
```typescript
class OfflineManager {
  async syncWithServer() {
    try {
      // Get local changes
      const localChanges = await this.getLocalChanges();
      
      // Sync with server
      const response = await fetch('/api/sync', {
        method: 'POST',
        body: JSON.stringify(localChanges)
      });
      
      // Update local database
      await this.updateLocalDatabase(response.data);
      
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
  
  async getLocalChanges() {
    // Fetch unsynced changes from local DB
  }
}
```

## Barcode Scanning

### React Native
```typescript
import { Camera, useCameraDevices } from 'react-native-vision-camera';

function BarcodeScanner({ onScan }) {
  const devices = useCameraDevices();
  const device = devices.back;

  return (
    <Camera
      device={device}
      isActive={true}
      onBarcodeDetect={(barcode) => {
        onScan(barcode.data);
      }}
    />
  );
}
```

### Flutter
```dart
import 'package:camera/camera.dart';
import 'package:google_ml_kit/google_ml_kit.dart';

class BarcodeScanner {
  Future<void> scanCamera(CameraController controller) async {
    final image = await controller.takePicture();
    final inputImage = InputImage.fromFilePath(image.path);
    
    final barcodeScanner = GoogleMlKit.vision.barcodeScanner();
    final barcodes = await barcodeScanner.processImage(inputImage);
    
    for (var barcode in barcodes) {
      // Handle barcode data
    }
  }
}
```

## Testing

### Unit Tests
```javascript
// Jest example
test('Medication calculates next dose correctly', () => {
  const medication = new Medication({
    name: 'Aspirin',
    morning: true,
    afternoon: false
  });
  
  const nextDose = medication.getNextDose(new Date('2023-01-01T12:00:00'));
  expect(nextDose.period).toBe('Evening');
});
```

### Integration Tests
```javascript
// Detox example
describe('Medication Reminder', () => {
  before(async () => {
    await device.launchApp();
  });

  it('should show reminder at scheduled time', async () => {
    await element(by.id('medication-card')).tap();
    await expect(element(by.text('Take Aspirin'))).toBeVisible();
  });
});
```

## Deployment

### App Store Submission
1. **Prepare App**
   - Generate release builds
   - Update app icons and splash screens
   - Prepare screenshots and descriptions

2. **App Store Connect**
   - Create App Store listing
   - Upload build
   - Submit for review

3. **Google Play Store**
   - Generate signed APK/AAB
   - Prepare listing materials
   - Submit for review

### Continuous Integration
```yaml
# GitHub Actions example
name: Mobile CI/CD
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Build app
        run: npm run build
```

## Future Enhancements

### Phase 2 Features
- **Wearable Integration**: Apple Watch, Android Wear
- **Voice Assistant**: Alexa, Google Home integration
- **AI Medication Recognition**: Advanced pill identification
- **Health Data Sync**: Apple Health, Google Fit integration
- **Smart Home Integration**: Smart pill dispensers

### Phase 3 Features
- **Telemedicine**: Virtual doctor consultations
- **Pharmacy Integration**: Direct prescription refills
- **Insurance Integration**: Coverage verification
- **AI Health Insights**: Personalized health recommendations
- **Social Support**: Community forums and support groups

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## Support

For issues and questions:
- GitHub Issues: [Project Repository]
- Email: support@medguardian.com
- Documentation: [Project Wiki]

---

This mobile app will provide a seamless extension of the MedGuardian web platform, ensuring users can manage their medications effectively from anywhere, anytime.
