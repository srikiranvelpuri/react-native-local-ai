# Local AI (LAI)

A React Native mobile application for running the Gemma 3N model locally on your device.

## Features

- Local Gemma 3N model execution
- Image selection and processing
- Model download and management

## Preview

![](https://github.com/srikiranvelpuri/react-native-gemma/blob/main/assets/appScreenShot.png)

## Prerequisites

- Node.js >= 20
- React Native development environment ([Setup Guide](https://reactnative.dev/docs/set-up-your-environment))
- For Android: Android Studio and JDK 17

## Installation

1. Clone the repository
2. Install dependencies:

```bash
yarn install
```

## Running the App

### iOS

1. Install pods:

```bash
cd ios && pod install && cd ..
```

2. Run the app:

```bash
npx react-native run-ios
```

### Android

```bash
npx react-native run-android
```

## Project Structure

- `/android` - Android native code
- `/ios` - iOS native code
- `/src` - Application source code

## Tech Stack

- React Native 0.82
- React 19
- TypeScript
- React Native FS (File system)
- React Native Image Picker
- AsyncStorage
- MediaPipe Tasks GenAI (iOS & Android) - For on-device LLM inference

## Native Modules

### GemmaModule

The app includes a custom native module (`GemmaModule`) that interfaces with MediaPipe's LLM Inference API for both iOS and Android platforms.

**Methods:**

- `loadModel(modelPath)` - Loads a Gemma model from the specified file path
- `generate(prompt)` - Generates text response from a prompt (with streaming)
- `generateWithImage(prompt, imagePath)` - Generates text response with image context (multimodal)
- `stopGeneration()` - Stops the current generation
- `unloadModel()` - Unloads the model from memory

**Events:**

- `onGenerateToken` - Emitted for each token during streaming generation
