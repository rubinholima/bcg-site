package com.bostoncitygroup.bcgtv

import android.content.Context
import android.graphics.SurfaceTexture
import android.util.Log
import android.view.Surface
import android.view.TextureView
import org.json.JSONArray
import java.util.concurrent.Executors

/**
 * Receptor NDI — requer libndi.so em jniLibs (ver scripts/setup-ndi-sdk.ps1).
 * Frames renderizados na thread principal via NdiFrameDelivery (TextureView).
 */
object NdiReceiverBridge {
    private const val TAG = "NdiReceiverBridge"
    private val io = Executors.newSingleThreadExecutor()

    val isAvailable: Boolean
        get() = try {
            NdiNative.isSdkAvailable()
        } catch (_: UnsatisfiedLinkError) {
            false
        } catch (e: Exception) {
            Log.e(TAG, "isAvailable", e)
            false
        }

    /** Descobre fontes NDI na rede (precisa NdiAndroidBootstrap antes). */
    fun discoverSources(context: Context, waitMs: Int = 10_000): List<String> {
        NdiAndroidBootstrap.ensure(context)
        if (!isAvailable) return emptyList()
        return try {
            val json = NdiNative.discoverSources(waitMs)
            val arr = JSONArray(json)
            (0 until arr.length()).mapNotNull { i ->
                arr.optString(i).trim().ifBlank { null }
            }
        } catch (e: Exception) {
            Log.e(TAG, "discoverSources", e)
            emptyList()
        }
    }

    private var renderSurface: Surface? = null

    private fun bindSurface(texture: SurfaceTexture) {
        try {
            renderSurface?.release()
            val s = Surface(texture)
            renderSurface = s
            NdiNative.setSurface(s)
        } catch (e: Exception) {
            Log.e(TAG, "bindSurface", e)
        }
    }

    private fun unbindSurface() {
        try {
            NdiNative.setSurface(null)
            renderSurface?.release()
            renderSurface = null
        } catch (e: Exception) {
            Log.e(TAG, "unbindSurface", e)
        }
    }

    fun attachTexture(textureView: TextureView, onReady: () -> Unit) {
        val existing = textureView.surfaceTexture
        if (textureView.isAvailable && existing != null) {
            bindSurface(existing)
            onReady()
            return
        }
        textureView.surfaceTextureListener = object : TextureView.SurfaceTextureListener {
            override fun onSurfaceTextureAvailable(surface: SurfaceTexture, width: Int, height: Int) {
                bindSurface(surface)
                onReady()
            }

            override fun onSurfaceTextureSizeChanged(surface: SurfaceTexture, width: Int, height: Int) = Unit

            override fun onSurfaceTextureDestroyed(surface: SurfaceTexture): Boolean {
                disconnectSync()
                unbindSurface()
                return true
            }

            override fun onSurfaceTextureUpdated(surface: SurfaceTexture) = Unit
        }
    }

    fun connect(sourceName: String, context: Context, onDone: ((Boolean) -> Unit)? = null) {
        io.execute {
            val ok = connectSync(context, sourceName)
            onDone?.invoke(ok)
        }
    }

    fun connectSync(context: Context, sourceName: String): Boolean {
        NdiAndroidBootstrap.ensure(context)
        if (!isAvailable) {
            Log.w(TAG, "NDI SDK unavailable: ${status()}")
            return false
        }
        return try {
            val ok = NdiNative.startReceive(sourceName.trim())
            if (!ok) Log.w(TAG, "startReceive failed: ${status()}")
            ok
        } catch (e: Exception) {
            Log.e(TAG, "connect", e)
            false
        }
    }

    fun disconnect() {
        io.execute {
            try {
                NdiNative.stopReceive()
            } catch (e: Exception) {
                Log.e(TAG, "disconnect", e)
            }
        }
    }

    fun disconnectSync() {
        try {
            NdiNative.stopReceive()
        } catch (e: Exception) {
            Log.e(TAG, "disconnectSync", e)
        }
    }

    fun shutdown() {
        io.execute {
            try {
                NdiNative.shutdown()
            } catch (e: Exception) {
                Log.e(TAG, "shutdown", e)
            }
        }
    }

    fun status(): String = try {
        NdiNative.getStatus()
    } catch (_: Exception) {
        "NDI indisponível — instale libndi.so (setup-ndi-sdk.ps1)"
    }
}
