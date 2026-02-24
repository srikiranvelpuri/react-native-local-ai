import {
  NativeModules,
  NativeEventEmitter,
  type NativeModule,
} from 'react-native';

export interface InferenceModuleInterface extends NativeModule {
  loadModel?: (modelPath?: string) => Promise<string>;
  generate: (prompt: string) => Promise<string>;
  generateWithImage: (prompt: string, imagePath: string) => Promise<string>;
  stopGeneration: () => Promise<string>;
  unloadModel: () => Promise<string>;
}

export interface BaseInferenceConfig {
  moduleName: string;
  requiresModelPath?: boolean;
  filterTokens?: string[];
}

/**
 * Base class for VLM inference implementations
 * Eliminates code duplication between FastVLM and Gemma
 */
export abstract class BaseInference {
  protected static isInitialized: boolean = false;
  protected static currentSubscription: any = null;
  protected static eventEmitter: NativeEventEmitter | null = null;
  protected static nativeModule: InferenceModuleInterface | null = null;
  protected static config: BaseInferenceConfig;

  protected static initializeModule(config: BaseInferenceConfig): void {
    this.config = config;
    this.nativeModule = NativeModules[config.moduleName] as InferenceModuleInterface;

    if (!this.nativeModule) {
      throw new Error(`${config.moduleName} is not available`);
    }

    this.eventEmitter = new NativeEventEmitter(this.nativeModule);
  }

  protected static filterSpecialTokens(text: string): string {
    let filtered = text;

    // Default tokens to filter
    const defaultTokens = [
      '<end_of_turn>',
      '</s>',
      '<eos>',
      '<|endoftext|>',
      '<start_of_turn>',
      '<|im_start|>',
      '<|im_end|>',
    ];

    const tokensToFilter = this.config?.filterTokens || defaultTokens;

    tokensToFilter.forEach(token => {
      filtered = filtered.replace(new RegExp(token, 'g'), '');
    });

    return filtered;
  }

  protected static removeTokenListener(): void {
    if (this.currentSubscription) {
      this.currentSubscription.remove();
      this.currentSubscription = null;
    }
  }

  protected static normalizePath(path: string): string {
    return path.startsWith('file:///') ? path.substring(7) : path;
  }

  static async generateStreaming(
    prompt: string,
    onToken: (token: string) => void,
    imagePath?: string | null,
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    if (!this.nativeModule) {
      throw new Error('Native module not initialized');
    }

    if (!prompt?.trim()) {
      throw new Error('Prompt cannot be empty');
    }

    this.removeTokenListener();

    try {
      if (!this.eventEmitter) {
        throw new Error('Event emitter not initialized');
      }

      this.currentSubscription = this.eventEmitter.addListener(
        'onGenerateToken',
        (token: string) => {
          if (token) {
            const filteredToken = this.filterSpecialTokens(token);
            if (filteredToken) {
              onToken(filteredToken);
            }
          }
        },
      );

      if (imagePath?.trim()) {
        const cleanPath = this.normalizePath(imagePath);
        await this.nativeModule.generateWithImage(prompt, cleanPath);
      } else {
        await this.nativeModule.generate(prompt);
      }

      this.removeTokenListener();
    } catch (error) {
      this.removeTokenListener();
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Generation failed: ${message}`);
    }
  }

  static async stopGeneration(): Promise<void> {
    if (!this.nativeModule) {
      throw new Error('Native module not initialized');
    }

    await this.nativeModule.stopGeneration();
    this.removeTokenListener();
  }

  static async unload(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    if (!this.nativeModule) {
      throw new Error('Native module not initialized');
    }

    await this.nativeModule.unloadModel();
    this.isInitialized = false;
  }

  static isModelLoaded(): boolean {
    return this.isInitialized;
  }
}
