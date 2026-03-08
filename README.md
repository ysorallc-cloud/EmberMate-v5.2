# EmberMate - Your Personal Health Companion

<p align="center">
  <img src="./assets/icon.png" alt="EmberMate Logo" width="120" height="120">
</p>

<p align="center">
  <strong>Secure medication tracking, appointment management, and family care coordination</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#privacy--security">Privacy</a> •
  <a href="#installation">Installation</a> •
  <a href="#development">Development</a> •
  <a href="#license">License</a>
</p>

---

## Overview

EmberMate is a privacy-first personal health companion designed to help you manage medications, track appointments, monitor symptoms, and coordinate care for yourself and loved ones—all while keeping your sensitive health information completely private on your device.

**🔐 Your data never leaves your device. No external servers. No cloud storage. Complete privacy.**

---

## Features

### 💊 **Medication Management**
- Track all medications with dosage and schedules
- Smart medication reminders
- Visual identification with photos
- Refill tracking and days supply
- Medication adherence monitoring
- Drug interaction warnings
- Complete medication history

### 📅 **Appointment Tracking**
- Calendar view of medical appointments
- Track doctors, specialists, and therapists
- Appointment reminders
- Location and contact details
- Preparation notes and visit history

### 👨‍👩‍👧‍👦 **Family & Caregiver Features**
- Manage health for multiple family members
- Perfect for elderly care coordination
- Share care summaries securely
- Activity logging and care team coordination
- Patient profiles with medical history

### 📊 **Health Monitoring**
- Vital signs tracking (BP, temp, weight, heart rate)
- Symptom logging with timestamps
- Photo documentation
- Trend analysis
- Export reports for healthcare providers

### 🔒 **Advanced Security**
- Military-grade AES-256 encryption
- Biometric authentication (Face ID/Touch ID/Fingerprint)
- PIN code protection
- Auto-lock feature
- Encrypted backups
- All data stays on-device with strong local encryption

### 🏥 **Care Summaries**
- Generate comprehensive health reports
- Current medications list
- Appointment history
- Symptoms and concerns
- Emergency contacts
- Export as PDF for doctors

---

## Privacy & Security

**EmberMate is built privacy-first:**

✅ **All data stored locally** - Your health information stays on YOUR device only
✅ **No external servers** - We don't collect, store, or share your data
✅ **Military-grade encryption** - AES-256 encryption at rest
✅ **Biometric security** - Face ID, Touch ID, or fingerprint protection
✅ **No tracking or analytics** - Zero third-party SDKs or tracking
✅ **Strong local encryption** - Your data never leaves your device
✅ **Offline-first** - No internet required for core features

[Read our Privacy Policy](./PRIVACY_POLICY.md) | [Read our Security Policy](./SECURITY.md)

---

## Tech Stack

- **Framework**: [Expo](https://expo.dev) ~52.0.0
- **Runtime**: React Native 0.76.9
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) ~4.0.11
- **Language**: TypeScript ~5.3.3
- **Storage**: Expo SecureStore (encrypted local storage)
- **Authentication**: Expo Local Authentication (biometrics)
- **Notifications**: Expo Notifications
- **UI**: React Native with custom components

---

## Installation

### Prerequisites

- Node.js 18+ and npm
- iOS: Xcode 14+ (for iOS development)
- Android: Android Studio (for Android development)
- [Expo CLI](https://docs.expo.dev/get-started/installation/)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/embermate-v5.git
   cd embermate-v5
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Run on your device**
   - **iOS**: Press `i` to open iOS Simulator
   - **Android**: Press `a` to open Android Emulator
   - **Physical Device**: Scan QR code with Expo Go app

---

## Development

### Project Structure

```
embermate-v5/
├── app/                    # Expo Router app directory
│   ├── (tabs)/            # Tab-based navigation screens
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Entry point
├── components/            # Reusable React components
├── assets/               # Images, icons, fonts
├── utils/                # Utility functions
├── legal/                # Privacy Policy, Terms of Service
├── app.json              # Expo configuration
├── package.json          # Dependencies
└── tsconfig.json         # TypeScript configuration
```

### Development Commands

```bash
# Start development server
npm start
# or
npx expo start

# Start with cleared cache
npx expo start --clear

# Run on specific platform
npx expo start --android
npx expo start --ios
npx expo start --web

# Type checking
npx tsc --noEmit

# Check for configuration issues
npx expo-doctor
```

### Building for Production

#### Android (AAB for Google Play)
```bash
# Build Android App Bundle
eas build --platform android --profile production

# Download the build
eas build:download --platform android --profile production
```

#### iOS (IPA for App Store)
```bash
# Build iOS app
eas build --platform ios --profile production

# Download the build
eas build:download --platform ios --profile production
```

### Environment Variables

Create a `.env.local` file (not committed to git):
```bash
# Add any environment variables here
# Currently, EmberMate doesn't require external API keys
```

---

## Configuration

### Key Files

- **`app.json`** - Expo app configuration
- **`eas.json`** - EAS Build configuration
- **`babel.config.js`** - Babel configuration (includes React Native Reanimated)
- **`tsconfig.json`** - TypeScript configuration

### Important App Settings

```json
{
  "android": {
    "package": "com.embermate.app",
    "compileSdkVersion": 35,
    "targetSdkVersion": 35
  },
  "ios": {
    "bundleIdentifier": "com.embermate.app"
  }
}
```

---

## Testing

### Manual Testing Checklist

- [ ] Medication tracking and reminders
- [ ] Appointment calendar and notifications
- [ ] Biometric authentication (Face ID/Touch ID/Fingerprint)
- [ ] Data encryption and secure storage
- [ ] Family member profile management
- [ ] Vitals and symptom logging
- [ ] Care summary generation and export
- [ ] Photo documentation upload
- [ ] Data backup and restore
- [ ] Offline functionality

See [APP_STORE_SUBMISSION_CHECKLIST.md](./APP_STORE_SUBMISSION_CHECKLIST.md) for complete testing guide.

---

## Deployment

### Google Play Store (Android)

1. Build production AAB (see [Building for Production](#building-for-production))
2. Upload to Google Play Console
3. Complete store listing with screenshots and descriptions
4. Submit for review

[View Google Play Store Listing](https://play.google.com/store/apps/details?id=com.embermate.app)

### App Store (iOS)

1. Build production IPA
2. Upload to App Store Connect
3. Complete app metadata
4. Submit for review

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow existing code formatting (tabs/spaces)
- Add comments for complex logic
- Test on both iOS and Android

---

## Security

**Found a security vulnerability?** Please DO NOT open a public issue.

Email: support@embermate.com (or your preferred contact method)

See [SECURITY.md](./SECURITY.md) for our security policy and reporting guidelines.

---

## License

Copyright © 2026 EmberMate

All rights reserved. This software is proprietary and confidential.

**Note:** If you plan to make this open source, add an appropriate license:
- MIT License (permissive)
- Apache 2.0 (permissive with patent grants)
- GPL v3 (copyleft)

---

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/embermate-v5/issues)
- **Email**: support@embermate.com
- **Privacy Policy**: [View Policy](./PRIVACY_POLICY.md)
- **Terms of Service**: [View Terms](./TERMS_OF_SERVICE.md)

---

## Acknowledgments

Built with:
- [Expo](https://expo.dev) - React Native framework
- [React Navigation](https://reactnavigation.org) via Expo Router
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) - Animations
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) - Encrypted storage

---

## Roadmap

- [ ] Apple Health integration (iOS)
- [ ] Google Fit integration (Android)
- [ ] Medication interaction database
- [ ] Multi-language support
- [ ] Apple Watch companion app
- [ ] Wear OS companion app

---

<p align="center">
  Made with ❤️ for better health management
</p>

<p align="center">
  <sub>EmberMate - Your data, your device, your privacy.</sub>
</p>
