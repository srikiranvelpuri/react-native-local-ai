# React Native Local AI (LAI)

A cross-platform React Native mobile application for running Vision Language Models (VLMs) locally on your device.

- **iOS**: Uses FastVLM (Apple's on-device VLM)
- **Android**: Uses Gemma (Google's on-device LLM with vision support)

## Features

- Cross-platform local AI inference (iOS & Android)
- On-device Vision Language Model execution
- Image+text prompts (image required on iOS, optional on Android)
- Real-time streaming token generation
- Privacy-focused (all processing happens locally)
- Image selection and processing with react-native-image-picker
- Automatic model download and management (Android)
- Dark theme UI with chat interface
- Message persistence with AsyncStorage

## Preview

<p align="center">
  <img src="https://github.com/srikiranvelpuri/react-native-local-ai/blob/main/assets/android.png" height="500" width="45%"/>
  <img src="https://github.com/srikiranvelpuri/react-native-local-ai/blob/main/assets/iOS.jpeg" height="500" />
</p>

## Prerequisites

- Node.js >= 20
- React Native development environment ([Setup Guide](https://reactnative.dev/docs/set-up-your-environment))
- **For Android**: Android Studio and JDK 17
- **For iOS**: Xcode 15+, iOS 18.2+ deployment target, MLX Swift packages

## Installation

1. Clone the repository
2. Install dependencies:

```bash
yarn install
```

### iOS Setup

1. Install CocoaPods dependencies:

```bash
cd ios && pod install && cd ..
```

2. Download the FastVLM model using the provided script:

```bash
cd ios/LAI
./get_pretrained_mlx_model.sh --model 0.5b --dest ./FastVLM
cd ../..
```

**Available model sizes:**

- `0.5b` - 0.5B parameter model (FP16) - Fastest, smaller size
- `1.5b` - 1.5B parameter model (INT8) - Balanced
- `7b` - 7B parameter model (INT4) - Most capable, larger size

### Android Setup

The Gemma model will be automatically downloaded on first launch.

## Running the App

### iOS

```bash
npx react-native run-ios
```

### Android

```bash
npx react-native run-android
```

## Project Structure

```
LAI/
├── android/              # Android native code (Gemma)
├── ios/                  # iOS native code (FastVLM)
│   └── LAI/
│       ├── FastVLM/      # FastVLM Swift implementation
│       ├── FastVLMModule.swift  # React Native bridge
│       └── FastVLMModule.m     # Obj-C bridge header
├── src/
│   ├── components/       # React components
│   ├── inference/        # VLM inference APIs
│   │   ├── VLMInference.ts      # Cross-platform interface
│   │   ├── FastVLMInference.ts  # iOS implementation
│   │   └── GemmaInference.ts    # Android implementation
│   └── utils/            # Utility functions
└── App.tsx               # Main app component
```

## Usage

1. **Launch the app** on your device or simulator
2. **For iOS**: Tap the camera icon to select an image (required)
3. **For Android**: Optionally select an image with the camera icon
4. **Enter your prompt** in the text input
5. **Tap Send** to generate a response
6. Watch the AI response stream in real-time

### Clear Chat

Tap the "Clear" button in the header to delete all messages.

### Stop Generation

Tap the "Stop" button to cancel an ongoing generation.

## Tech Stack

- React Native 0.82
- React 19
- TypeScript
- React Native FS (File system)
- React Native Image Picker
- AsyncStorage
- **iOS**: FastVLM (MLX Swift, CoreML)
- **Android**: Gemma (MediaPipe, TensorFlow Lite)
