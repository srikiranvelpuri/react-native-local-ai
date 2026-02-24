import { BaseInference } from './BaseInference';

/**
 * FastVLM Inference for iOS
 * Uses Apple's on-device FastVLM model with MLX
 */
export class FastVLMInference extends BaseInference {
  static async initialize(): Promise<void> {
    // Initialize the native module
    this.initializeModule({
      moduleName: 'FastVLMModule',
      requiresModelPath: false,
    });

    if (!this.nativeModule || !this.nativeModule.loadModel) {
      throw new Error('FastVLMModule is not available');
    }

    try {
      await this.nativeModule.loadModel();
      this.isInitialized = true;
    } catch (error) {
      this.isInitialized = false;
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize FastVLM model: ${message}`);
    }
  }
}
