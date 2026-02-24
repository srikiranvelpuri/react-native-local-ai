import RNFS from 'react-native-fs';
import { BaseInference } from './BaseInference';

/**
 * Gemma Inference for Android
 * Uses Google's Gemma model with MediaPipe LiteRT
 */
export class GemmaInference extends BaseInference {
  private static modelPath: string = '';

  static async initialize(modelPath: string): Promise<void> {
    // Verify model file exists
    const fileExists = await RNFS.exists(modelPath);
    if (!fileExists) {
      throw new Error(`Model file not found at: ${modelPath}`);
    }

    this.modelPath = modelPath;

    // Initialize the native module
    this.initializeModule({
      moduleName: 'GemmaModule',
      requiresModelPath: true,
    });

    if (!this.nativeModule || !this.nativeModule.loadModel) {
      throw new Error('GemmaModule is not available');
    }

    try {
      console.log('Loading Gemma model from:', modelPath);
      await this.nativeModule.loadModel(modelPath);
      this.isInitialized = true;
      console.log('Gemma model loaded successfully');
    } catch (error) {
      this.isInitialized = false;
      const message = error instanceof Error ? error.message : String(error);
      console.error('Gemma model initialization failed:', message);
      throw new Error(`Failed to initialize Gemma model: ${message}`);
    }
  }

  static getModelPath(): string {
    return this.modelPath;
  }
}
