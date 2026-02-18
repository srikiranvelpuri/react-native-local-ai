import { NativeModules, NativeEventEmitter, type NativeModule } from 'react-native';
import RNFS from 'react-native-fs';

interface GemmaModuleInterface extends NativeModule {
  loadModel(modelPath: string): Promise<string>;
  generate(prompt: string): Promise<string>;
  generateWithImage(prompt: string, imagePath: string): Promise<string>;
  stopGeneration(): Promise<string>;
  unloadModel(): Promise<string>;
}

const { GemmaModule } = NativeModules as { GemmaModule: GemmaModuleInterface };
const gemmaEmitter = new NativeEventEmitter(GemmaModule);

export class GemmaInference {
  private static modelPath: string = '';
  private static isInitialized: boolean = false;
  private static currentSubscription: any = null;

  static async initialize(modelPath: string): Promise<void> {
    try {
      const fileExists = await RNFS.exists(modelPath);
      if (!fileExists) {
        throw new Error(`Model file not found at: ${modelPath}`);
      }

      this.modelPath = modelPath;
      console.log('Loading model from:', modelPath);

      await GemmaModule.loadModel(modelPath);
      this.isInitialized = true;
      console.log('Model loaded successfully');
    } catch (error) {
      this.isInitialized = false;
      const message = error instanceof Error ? error.message : String(error);
      console.error('Model initialization failed:', message);
      throw new Error(`Failed to initialize Gemma model: ${message}`);
    }
  }

  static async generateStreaming(
    prompt: string,
    onToken: (token: string) => void,
    imagePath?: string | null,
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    if (!prompt?.trim()) {
      throw new Error('Prompt cannot be empty');
    }

    // Remove previous subscription if exists
    this.removeTokenListener();

    try {
      console.log(
        'Generating response for:',
        prompt.substring(0, 50) + '...',
      );

      // Set up streaming listener
      this.currentSubscription = gemmaEmitter.addListener(
        'onGenerateToken',
        (token: string) => {
          if (token) {
            onToken(token);
          }
        }
      );

      if (imagePath?.trim()) {
        const imageExists = await RNFS.exists(imagePath);
        if (!imageExists) {
          throw new Error(`Image not found at: ${imagePath}`);
        }

        const cleanPath = this.normalizePath(imagePath);
        await GemmaModule.generateWithImage(prompt, cleanPath);
      } else {
        await GemmaModule.generate(prompt);
      }

      // Clean up listener after generation completes
      this.removeTokenListener();
    } catch (error) {
      this.removeTokenListener();
      const message = error instanceof Error ? error.message : String(error);
      console.error('Generation failed:', message);
      throw new Error(`Generation failed: ${message}`);
    }
  }

  static removeTokenListener(): void {
    if (this.currentSubscription) {
      this.currentSubscription.remove();
      this.currentSubscription = null;
    }
  }

  static async stopGeneration(): Promise<void> {
    try {
      await GemmaModule.stopGeneration();
      this.removeTokenListener();
      console.log('Generation stopped successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to stop generation:', message);
      throw error;
    }
  }

  static async unload(): Promise<void> {
    if (!this.isInitialized) {
      console.log('Model was not loaded');
      return;
    }

    try {
      await GemmaModule.unloadModel();
      this.isInitialized = false;
      console.log('Model unloaded successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Failed to unload model:', message);
      throw error;
    }
  }

  static isModelLoaded(): boolean {
    return this.isInitialized;
  }

  static getModelPath(): string {
    return this.modelPath;
  }

  private static normalizePath(path: string): string {
    return path.startsWith('file:///') ? path.substring(7) : path;
  }
}
