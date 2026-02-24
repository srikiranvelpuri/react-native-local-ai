import { Platform } from 'react-native';
import { GemmaInference } from './GemmaInference';
import { FastVLMInference } from './FastVLMInference';

/**
 * Generic VLM (Vision Language Model) Inference Interface
 *
 * This interface automatically uses the appropriate model based on the platform:
 * - iOS: FastVLM (Apple's on-device VLM)
 * - Android: Gemma (Google's on-device LLM with vision support)
 */

export interface VLMConfig {
  /** Model path (required for Android/Gemma, optional for iOS/FastVLM) */
  modelPath?: string;
}

export class VLMInference {
  private static platform: 'ios' | 'android' = Platform.OS as 'ios' | 'android';
  private static isInitialized: boolean = false;

  /**
   * Initialize the VLM model
   * @param config Configuration object with optional modelPath for Android
   */
  static async initialize(config?: VLMConfig): Promise<void> {
    // Force detection and throw error if going to wrong platform
    const detectedPlatform = Platform.OS;

    console.log('==============================================');
    console.log('🔍 VLMInference PLATFORM DETECTION');
    console.log('Platform.OS:', detectedPlatform);
    console.log('this.platform:', this.platform);
    console.log('==============================================');

    try {
      if (this.platform === 'ios') {
        console.log('✅ ROUTING TO FASTVLM (iOS)');
        await FastVLMInference.initialize();
      } else if (this.platform === 'android') {
        console.log('⚠️ ROUTING TO GEMMA (Android)');
        if (!config?.modelPath) {
          throw new Error(
            'modelPath is required for Android/Gemma initialization',
          );
        }
        await GemmaInference.initialize(config.modelPath);
      } else {
        throw new Error(`Unsupported platform: ${this.platform}`);
      }

      this.isInitialized = true;
    } catch (error) {
      this.isInitialized = false;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize VLM: ${message}`);
    }
  }

  /**
   * Generate text with optional image input (streaming)
   * @param prompt Text prompt for the model
   * @param onToken Callback function called for each generated token
   * @param imagePath Optional path to image file
   */
  static async generateStreaming(
    prompt: string,
    onToken: (token: string) => void,
    imagePath?: string | null,
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('VLM not initialized. Call initialize() first.');
    }

    console.log(
      '🚀 VLMInference: generateStreaming called for platform:',
      this.platform,
    );

    if (this.platform === 'ios') {
      console.log('📱 VLMInference: Routing to FastVLM');
      await FastVLMInference.generateStreaming(prompt, onToken, imagePath);
    } else if (this.platform === 'android') {
      console.log('🤖 VLMInference: Routing to Gemma');
      await GemmaInference.generateStreaming(prompt, onToken, imagePath);
    } else {
      throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  /**
   * Stop the current generation
   */
  static async stopGeneration(): Promise<void> {
    if (this.platform === 'ios') {
      await FastVLMInference.stopGeneration();
    } else if (this.platform === 'android') {
      await GemmaInference.stopGeneration();
    }
  }

  /**
   * Unload the model from memory
   */
  static async unload(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    if (this.platform === 'ios') {
      await FastVLMInference.unload();
    } else if (this.platform === 'android') {
      await GemmaInference.unload();
    }

    this.isInitialized = false;
  }

  /**
   * Check if the model is loaded
   */
  static isModelLoaded(): boolean {
    return this.isInitialized;
  }

  /**
   * Get the current platform
   */
  static getPlatform(): string {
    return this.platform;
  }

  /**
   * Get the model name based on platform
   */
  static getModelName(): string {
    return this.platform === 'ios' ? 'FastVLM' : 'Gemma';
  }

  /**
   * Get model-specific information
   */
  static getModelInfo(): {
    platform: string;
    modelName: string;
    isLoaded: boolean;
  } {
    return {
      platform: this.platform,
      modelName: this.getModelName(),
      isLoaded: this.isModelLoaded(),
    };
  }
}

// Export platform-specific implementations for advanced usage
export { FastVLMInference, GemmaInference };
