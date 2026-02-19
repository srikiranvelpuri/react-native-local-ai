import Foundation
import MediaPipeTasksGenAI

@objc(GemmaModule)
class GemmaModule: RCTEventEmitter {

    private var llmInference: LlmInference?
    private var generationQueue = DispatchQueue(label: "com.lai.gemma.generation", qos: .userInitiated)
    private var isGenerating = false

    override static func requiresMainQueueSetup() -> Bool {
        return false
    }

    override func supportedEvents() -> [String]! {
        return ["onGenerateToken"]
    }

    @objc
    func loadModel(_ modelPath: String,
                   resolver resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {
        generationQueue.async { [weak self] in
            guard let self = self else { return }

            do {
                let fileURL = URL(fileURLWithPath: modelPath)

                // Check if file exists
                guard FileManager.default.fileExists(atPath: modelPath) else {
                    reject("LOAD_ERROR", "Model file not found at: \(modelPath)", nil)
                    return
                }

                // Check file size
                let attributes = try FileManager.default.attributesOfItem(atPath: modelPath)
                let fileSize = attributes[.size] as? Int64 ?? 0

                if fileSize == 0 {
                    reject("LOAD_ERROR", "Model file is empty: \(modelPath)", nil)
                    return
                }

                print("GemmaModule: Loading model from: \(fileURL.path)")

                let options = LlmInference.Options(modelPath: fileURL.path)
                options.maxTokens = 512
                options.topK = 40
                options.temperature = 0.8

                self.llmInference = try LlmInference(options: options)

                print("GemmaModule: Model loaded successfully")
                resolve("Model loaded successfully")

            } catch {
                print("GemmaModule: Failed to load model - \(error.localizedDescription)")
                reject("LOAD_ERROR", error.localizedDescription, error)
            }
        }
    }

    @objc
    func generate(_ prompt: String,
                  resolver resolve: @escaping RCTPromiseResolveBlock,
                  rejecter reject: @escaping RCTPromiseRejectBlock) {

        guard let llmInference = self.llmInference else {
            reject("NO_MODEL", "Model not loaded", nil)
            return
        }

        generationQueue.async { [weak self] in
            guard let self = self else { return }

            self.isGenerating = true

            do {
                // Generate response with streaming
                try llmInference.generateResponse(inputText: prompt) { partialResult, error in
                    if let error = error {
                        print("GemmaModule: Generation error - \(error.localizedDescription)")
                        self.isGenerating = false
                        reject("GENERATE_ERROR", error.localizedDescription, error)
                        return
                    }

                    if let result = partialResult {
                        // Send each token chunk to React Native
                        self.sendEvent(withName: "onGenerateToken", body: result)
                    }
                }

                self.isGenerating = false
                resolve("Generation completed")

            } catch {
                self.isGenerating = false
                print("GemmaModule: Generation failed - \(error.localizedDescription)")
                reject("GENERATE_ERROR", error.localizedDescription, error)
            }
        }
    }

    @objc
    func generateWithImage(_ prompt: String,
                          imagePath: String,
                          resolver resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {

        guard let llmInference = self.llmInference else {
            reject("NO_MODEL", "Model not loaded", nil)
            return
        }

        generationQueue.async { [weak self] in
            guard let self = self else { return }

            self.isGenerating = true

            do {
                // Load image
                guard FileManager.default.fileExists(atPath: imagePath) else {
                    self.isGenerating = false
                    reject("FILE_NOT_FOUND", "Image file does not exist at \(imagePath)", nil)
                    return
                }

                guard let uiImage = UIImage(contentsOfFile: imagePath) else {
                    self.isGenerating = false
                    reject("INVALID_IMAGE", "Failed to decode image", nil)
                    return
                }

                // Convert UIImage to CGImage
                guard let cgImage = uiImage.cgImage else {
                    self.isGenerating = false
                    reject("INVALID_IMAGE", "Failed to convert image to CGImage format", nil)
                    return
                }

                // Generate response with image and streaming
                try llmInference.generateResponse(
                    inputText: prompt,
                    image: cgImage
                ) { partialResult, error in
                    if let error = error {
                        print("GemmaModule: Vision generation error - \(error.localizedDescription)")
                        self.isGenerating = false
                        reject("GENERATE_ERROR", error.localizedDescription, error)
                        return
                    }

                    if let result = partialResult {
                        // Send each token chunk to React Native
                        self.sendEvent(withName: "onGenerateToken", body: result)
                    }
                }

                self.isGenerating = false
                resolve("Generation completed")

            } catch {
                self.isGenerating = false
                print("GemmaModule: Vision generation failed - \(error.localizedDescription)")
                reject("GENERATE_ERROR", error.localizedDescription, error)
            }
        }
    }

    @objc
    func stopGeneration(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
        generationQueue.async { [weak self] in
            guard let self = self else { return }

            do {
                // Note: MediaPipe iOS doesn't have explicit cancel API like Android
                // The generation will complete but we can mark it as stopped
                self.isGenerating = false

                print("GemmaModule: Generation stop requested")
                resolve("Generation stopped")

            } catch {
                print("GemmaModule: Failed to stop generation - \(error.localizedDescription)")
                reject("STOP_ERROR", error.localizedDescription, error)
            }
        }
    }

    @objc
    func unloadModel(_ resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {
        generationQueue.async { [weak self] in
            guard let self = self else { return }

            do {
                // Mark as not generating
                self.isGenerating = false

                // Unload model
                self.llmInference = nil

                print("GemmaModule: Model unloaded")
                resolve("Model unloaded")

            } catch {
                reject("UNLOAD_ERROR", error.localizedDescription, error)
            }
        }
    }
}
