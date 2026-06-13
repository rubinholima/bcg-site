package com.bostoncitygroup.bcgtv

import android.util.Log
import android.view.Surface
import android.view.SurfaceHolder
import android.view.SurfaceView

/**
 * Receptor NDI — substitui Birddog. Requer libndi.so em jniLibs (ver scripts/setup-ndi-sdk.ps1).
 */
object NdiReceiverBridge {
    private const val TAG = "NdiReceiverBridge"

    val isAvailable: Boolean
        get() = try {
            NdiNative.isSdkAvailable()
        } catch (_: UnsatisfiedLinkError) {
            false
        }

    fun attachSurface(surfaceView: SurfaceView, onReady: () -> Unit) {
        surfaceView.holder.addCallback(object : SurfaceHolder.Callback {
            override fun surfaceCreated(holder: SurfaceHolder) {
                try {
                    NdiNative.setSurface(holder.surface)
                    onReady()
                } catch (e: Exception) {
                    Log.e(TAG, "surfaceCreated", e)
                }
            }

            override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) {
                try {
                    NdiNative.setSurface(holder.surface)
                } catch (e: Exception) {
                    Log.e(TAG, "surfaceChanged", e)
                }
            }

            override fun surfaceDestroyed(holder: SurfaceHolder) {
                try {
                    NdiNative.setSurface(null)
                } catch (e: Exception) {
                    Log.e(TAG, "surfaceDestroyed", e)
                }
            }
        })
    }

    fun connect(sourceName: String): Boolean {
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
        try {
            NdiNative.stopReceive()
        } catch (e: Exception) {
            Log.e(TAG, "disconnect", e)
        }
    }

    fun shutdown() {
        try {
            NdiNative.shutdown()
        } catch (e: Exception) {
            Log.e(TAG, "shutdown", e)
        }
    }

    fun status(): String = try {
        NdiNative.getStatus()
    } catch (_: Exception) {
        "NDI indisponível — instale libndi.so (setup-ndi-sdk.ps1)"
    }
}
