package com.lai

import android.graphics.BitmapFactory
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import com.google.mediapipe.tasks.genai.llminference.LlmInferenceSession
import com.google.mediapipe.tasks.genai.llminference.GraphOptions
import com.google.mediapipe.framework.image.BitmapImageBuilder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

class GemmaModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var model: LlmInference? = null
    private val scope = CoroutineScope(Dispatchers.Main)
    private var currentGenerationJob: kotlinx.coroutines.Job? = null
    private var currentSession: LlmInferenceSession? = null

    override fun getName(): String = "GemmaModule"

    @ReactMethod
    fun loadModel(modelPath: String, promise: Promise) {
        scope.launch {
            try {
                val modelFile = File(modelPath)

                if (!modelFile.exists()) {
                    promise.reject("LOAD_ERROR", "Model file not found at: $modelPath")
                    return@launch
                }

                if (modelFile.length() == 0L) {
                    promise.reject("LOAD_ERROR", "Model file is empty: $modelPath")
                    return@launch
                }

                android.util.Log.d("GemmaModule", "Loading model from: ${modelFile.absolutePath}")

                val options = LlmInference.LlmInferenceOptions.builder()
                    .setModelPath(modelFile.absolutePath)
                    .setMaxTokens(512)
                    .setMaxNumImages(10)
                    .build()

                model = withContext(Dispatchers.IO) {
                    LlmInference.createFromOptions(reactApplicationContext, options)
                }

                android.util.Log.d("GemmaModule", "Model loaded successfully")
                promise.resolve("Model loaded successfully")
            } catch (e: Exception) {
                android.util.Log.e("GemmaModule", "Failed to load model", e)
                promise.reject("LOAD_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun generate(prompt: String, promise: Promise) {
        if (model == null) {
            promise.reject("NO_MODEL", "Model not loaded")
            return
        }

        currentGenerationJob = scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    val graphOptions = GraphOptions.builder()
                        .setIncludeTokenCostCalculator(true)
                        .setEnableVisionModality(false)
                        .setEnableAudioModality(false)
                        .build()

                    val sessionOptions = LlmInferenceSession.LlmInferenceSessionOptions.builder()
                        .setTopK(40)
                        .setTemperature(0.8f)
                        .setGraphOptions(graphOptions)
                        .build()

                    val session = LlmInferenceSession.createFromOptions(model!!, sessionOptions)
                    currentSession = session

                    val latch = CountDownLatch(1)

                    session.use {
                        it.addQueryChunk(prompt)

                        // Stream response token by token
                        it.generateResponseAsync { partialResult: String, isFinal: Boolean ->
                            // Send each token chunk to React Native
                            sendEvent("onGenerateToken", partialResult)

                            // Signal completion when final token arrives
                            if (isFinal) {
                                latch.countDown()
                            }
                        }

                        // Wait for generation to complete (with 5 minute timeout)
                        latch.await(5, TimeUnit.MINUTES)
                    }
                }
                promise.resolve("Generation completed")
            } catch (e: kotlinx.coroutines.CancellationException) {
                android.util.Log.d("GemmaModule", "Generation cancelled")
                promise.reject("CANCELLED", "Generation was stopped by user")
            } catch (e: Exception) {
                android.util.Log.e("GemmaModule", "Generation failed", e)
                promise.reject("GENERATE_ERROR", e.message, e)
            } finally {
                currentSession = null
                currentGenerationJob = null
            }
        }
    }

    private fun sendEvent(eventName: String, data: String?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, data)
    }

    @ReactMethod
    fun generateWithImage(prompt: String, imagePath: String, promise: Promise) {
        if (model == null) {
            promise.reject("NO_MODEL", "Model not loaded")
            return
        }

        currentGenerationJob = scope.launch {
            try {
                val imageFile = File(imagePath)
                if (!imageFile.exists()) {
                    promise.reject("FILE_NOT_FOUND", "Image file does not exist at $imagePath")
                    return@launch
                }

                val bitmap = withContext(Dispatchers.IO) {
                    BitmapFactory.decodeFile(imagePath)
                }

                if (bitmap == null) {
                    promise.reject("INVALID_IMAGE", "Failed to decode image")
                    return@launch
                }

                val mpImage = BitmapImageBuilder(bitmap).build()

                withContext(Dispatchers.IO) {
                    val graphOptions = GraphOptions.builder()
                        .setIncludeTokenCostCalculator(true)
                        .setEnableVisionModality(true)
                        .setEnableAudioModality(false)
                        .build()

                    val sessionOptions = LlmInferenceSession.LlmInferenceSessionOptions.builder()
                        .setTopK(40)
                        .setTemperature(0.8f)
                        .setGraphOptions(graphOptions)
                        .build()

                    val session = LlmInferenceSession.createFromOptions(model!!, sessionOptions)
                    currentSession = session

                    val latch = CountDownLatch(1)

                    session.use {
                        it.addQueryChunk(prompt)
                        it.addImage(mpImage)

                        // Stream response token by token
                        it.generateResponseAsync { partialResult: String, isFinal: Boolean ->
                            sendEvent("onGenerateToken", partialResult)

                            // Signal completion when final token arrives
                            if (isFinal) {
                                latch.countDown()
                            }
                        }

                        // Wait for generation to complete (with 5 minute timeout)
                        latch.await(5, TimeUnit.MINUTES)
                    }
                }

                bitmap.recycle()
                promise.resolve("Generation completed")

            } catch (e: kotlinx.coroutines.CancellationException) {
                android.util.Log.d("GemmaModule", "Generation cancelled")
                promise.reject("CANCELLED", "Generation was stopped by user")
            } catch (e: Exception) {
                android.util.Log.e("GemmaModule", "Vision generation failed", e)
                promise.reject("GENERATE_ERROR", e.message, e)
            } finally {
                currentSession = null
                currentGenerationJob = null
            }
        }
    }

    @ReactMethod
    fun stopGeneration(promise: Promise) {
        scope.launch {
            try {
                if (currentSession != null) {
                    withContext(Dispatchers.IO) {
                        currentSession?.cancelGenerateResponseAsync()
                    }
                    android.util.Log.d("GemmaModule", "Generation stopped via session cancel")
                }

                if (currentGenerationJob != null && currentGenerationJob?.isActive == true) {
                    currentGenerationJob?.cancel()
                    android.util.Log.d("GemmaModule", "Generation job cancelled")
                }

                promise.resolve("Generation stopped")
            } catch (e: Exception) {
                android.util.Log.e("GemmaModule", "Failed to stop generation", e)
                promise.reject("STOP_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun unloadModel(promise: Promise) {
        scope.launch {
            try {
                // Cancel any ongoing generation first
                if (currentSession != null) {
                    withContext(Dispatchers.IO) {
                        currentSession?.cancelGenerateResponseAsync()
                    }
                }
                currentSession = null
                currentGenerationJob?.cancel()
                currentGenerationJob = null

                withContext(Dispatchers.IO) { model?.close() }
                model = null
                promise.resolve("Model unloaded")
            } catch (e: Exception) {
                promise.reject("UNLOAD_ERROR", e.message, e)
            }
        }
    }
}