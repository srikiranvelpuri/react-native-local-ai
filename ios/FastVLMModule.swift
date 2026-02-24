import Foundation
import CoreImage
import MLX
import React
import MLXLMCommon
import MLXRandom
import MLXVLM

@objc(FastVLMModule)
class FastVLMModule: RCTEventEmitter {

    private var modelContainer: ModelContainer?
    private var isGenerating = false
    private var currentTask: Task<Void, Never>?

    private let modelConfiguration = FastVLM.modelConfiguration
    private let generateParameters = GenerateParameters(temperature: 0.0)
    private let maxTokens = 240

    override init() {
        super.init()
        FastVLM.register(modelFactory: VLMModelFactory.shared)
    }

    @objc
    override static func requiresMainQueueSetup() -> Bool {
        return false
    }

    // Required for NativeEventEmitter
    override func supportedEvents() -> [String]! {
        return ["onGenerateToken"]
    }

    override func startObserving() {}
    override func stopObserving() {}

    // MARK: Load Model

    @objc(loadModel:rejecter:)
    func loadModel(_ resolve: @escaping RCTPromiseResolveBlock,
                   rejecter reject: @escaping RCTPromiseRejectBlock) {

        Task {
            do {

                if self.modelContainer == nil {

                    MLX.GPU.set(cacheLimit: 20 * 1024 * 1024)

                    self.modelContainer = try await VLMModelFactory.shared.loadContainer(
                        configuration: self.modelConfiguration
                    )
                }

                resolve("Model loaded successfully")

            } catch {

                reject("LOAD_ERROR",
                       "Failed to load FastVLM model: \(error.localizedDescription)",
                       error)
            }
        }
    }

    // MARK: Generate

    @objc(generate:resolver:rejecter:)
    func generate(_ prompt: String,
                 resolver resolve: @escaping RCTPromiseResolveBlock,
                 rejecter reject: @escaping RCTPromiseRejectBlock) {

        generateWithImage(prompt, imagePath: nil, resolver: resolve, rejecter: reject)
    }

    @objc(generateWithImage:imagePath:resolver:rejecter:)
    func generateWithImage(_ prompt: String,
                          imagePath: String?,
                          resolver resolve: @escaping RCTPromiseResolveBlock,
                          rejecter reject: @escaping RCTPromiseRejectBlock) {

        guard let container = modelContainer else {
            reject("MODEL_ERROR", "Model not loaded. Call loadModel() first.", nil)
            return
        }

        guard !isGenerating else {
            reject("BUSY_ERROR", "Generation already in progress", nil)
            return
        }

        isGenerating = true
        currentTask?.cancel()

        currentTask = Task {

            do {

                var userInput: UserInput

                if let imagePath = imagePath, !imagePath.isEmpty {

                    let imageURL = URL(fileURLWithPath: imagePath)

                    guard let ciImage = CIImage(contentsOf: imageURL) else {
                        throw NSError(domain: "FastVLM",
                                      code: -1,
                                      userInfo: [NSLocalizedDescriptionKey: "Failed to load image"])
                    }

                    userInput = UserInput(
                        prompt: .text(prompt),
                        images: [.ciImage(ciImage)]
                    )

                } else {

                    userInput = UserInput(
                        prompt: .text(prompt),
                        images: []
                    )
                }

                MLXRandom.seed(UInt64(Date.timeIntervalSinceReferenceDate * 1000))

                let result = try await container.perform { context in

                    let input = try await context.processor.prepare(input: userInput)

                    var lastTokenCount = 0

                    let result = try MLXLMCommon.generate(
                        input: input,
                        parameters: self.generateParameters,
                        context: context
                    ) { tokens in

                        if Task.isCancelled { return .stop }

                        // Only decode and send new tokens (not all tokens from the start)
                        let newTokens = Array(tokens.suffix(from: lastTokenCount))
                        lastTokenCount = tokens.count

                        if !newTokens.isEmpty {
                            let text = context.tokenizer.decode(tokens: newTokens)

                            DispatchQueue.main.async {
                                self.sendEvent(withName: "onGenerateToken", body: text)
                            }
                        }

                        if tokens.count >= self.maxTokens {
                            return .stop
                        }

                        return .more
                    }

                    return result
                }

                self.isGenerating = false
                resolve(result.output)

            } catch {

                self.isGenerating = false

                if !Task.isCancelled {
                    reject("GENERATION_ERROR",
                           "Failed to generate: \(error.localizedDescription)",
                           error)
                }
            }
        }
    }

    // MARK: Stop

    @objc(stopGeneration:rejecter:)
    func stopGeneration(_ resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {

        currentTask?.cancel()
        currentTask = nil
        isGenerating = false

        resolve("Generation stopped")
    }

    // MARK: Unload

    @objc(unloadModel:rejecter:)
    func unloadModel(_ resolve: @escaping RCTPromiseResolveBlock,
                    rejecter reject: @escaping RCTPromiseRejectBlock) {

        currentTask?.cancel()
        currentTask = nil
        modelContainer = nil
        isGenerating = false

        resolve("Model unloaded successfully")
    }
}