# Local AI (LAI)

A React Native mobile application for running the Gemma 3N model locally on your device.

## Features

- Local Gemma 3N model execution
- Image selection and processing
- Model download and management

## Prerequisites

- Node.js >= 20
- React Native development environment ([Setup Guide](https://reactnative.dev/docs/set-up-your-environment))
- For iOS: Xcode and CocoaPods
- For Android: Android Studio and JDK 17

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

## Running the App

### Android

```bash
npm run android
```

## Development

Start the Metro bundler:

```bash
npm start
```

## Project Structure

- `/android` - Android native code
- `/ios` - iOS native code
- `/src` - Application source code (if applicable)

## Tech Stack

- React Native 0.82
- React 19
- TypeScript
- React Native FS (File system)
- React Native Image Picker
- AsyncStorage
