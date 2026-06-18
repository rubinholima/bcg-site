package com.bostoncitygroup.bcgtv

import android.os.Looper
import android.util.Log

object NdiNative {
    private var loaded = false
    private var loadFailed = false
    private var ndiPreloaded = false

    /**
     * libndi.so precisa ser carregada via System.loadLibrary ANTES do dlopen no JNI.
     * Sem isso o bridge Android do NDI (NsdManager interno) não inicia → crash ao inicializar.
     */
    private fun ensureLoaded(): Boolean {
        if (loaded) return true
        if (loadFailed) return false
        return try {
            if (!ndiPreloaded) {
                System.loadLibrary("ndi")
                ndiPreloaded = true
                Log.i("NdiNative", "libndi.so carregada (System.loadLibrary)")
            }
            System.loadLibrary("bcg_ndi")
            loaded = true
            true
        } catch (e: UnsatisfiedLinkError) {
            loadFailed = true
            Log.e("NdiNative", "falha ao carregar NDI", e)
            false
        }
    }

    /** Deve rodar na main thread — NDIlib_initialize usa JNI Android internamente. */
    fun ensureInitializedOnMainThread(): Boolean {
        if (Looper.myLooper() != Looper.getMainLooper()) {
            Log.e("NdiNative", "ensureInitializedOnMainThread fora da main thread")
            return false
        }
        if (!ensureLoaded()) return false
        return try {
            isSdkAvailable0()
        } catch (e: Exception) {
            Log.e("NdiNative", "ensureInitializedOnMainThread", e)
            false
        }
    }

    fun isSdkAvailable(): Boolean {
        if (!ensureLoaded()) return false
        return try {
            isSdkAvailable0()
        } catch (e: Exception) {
            Log.e("NdiNative", "isSdkAvailable", e)
            false
        }
    }

    fun getStatus(): String {
        if (!ensureLoaded()) return "NDI indisponível — libndi.so ausente no APK"
        return try {
            getStatus0()
        } catch (e: Exception) {
            "NDI erro: ${e.message}"
        }
    }

    fun getDiag(): String {
        if (!loaded) return ""
        return try {
            getDiag0()
        } catch (_: Exception) {
            ""
        }
    }

    fun setSurface(surface: android.view.Surface?) {
        if (!ensureLoaded()) return
        try {
            setSurface0(surface)
        } catch (e: Exception) {
            Log.e("NdiNative", "setSurface", e)
        }
    }

    fun startReceive(sourceName: String): Boolean {
        if (!ensureLoaded()) return false
        return try {
            startReceive0(sourceName)
        } catch (e: Exception) {
            Log.e("NdiNative", "startReceive", e)
            false
        }
    }

    fun stopReceive() {
        if (!loaded) return
        try {
            stopReceive0()
        } catch (e: Exception) {
            Log.e("NdiNative", "stopReceive", e)
        }
    }

    fun shutdown() {
        if (!loaded) return
        try {
            shutdown0()
        } catch (e: Exception) {
            Log.e("NdiNative", "shutdown", e)
        }
    }

    fun discoverSources(waitMs: Int = 10_000): String {
        if (!ensureLoaded()) return "[]"
        return try {
            discoverSources0(waitMs)
        } catch (e: Exception) {
            Log.e("NdiNative", "discoverSources", e)
            "[]"
        }
    }

    @JvmStatic
    private external fun isSdkAvailable0(): Boolean

    @JvmStatic
    private external fun getStatus0(): String

    @JvmStatic
    private external fun getDiag0(): String

    @JvmStatic
    private external fun setSurface0(surface: android.view.Surface?)

    @JvmStatic
    private external fun startReceive0(sourceName: String): Boolean

    @JvmStatic
    private external fun stopReceive0()

    @JvmStatic
    private external fun shutdown0()

    @JvmStatic
    private external fun discoverSources0(waitMs: Int): String
}
