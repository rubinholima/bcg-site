package com.bostoncitygroup.bcgtv

object NdiNative {
    private var loaded = false
    private var loadFailed = false

    private fun ensureLoaded(): Boolean {
        if (loaded) return true
        if (loadFailed) return false
        return try {
            System.loadLibrary("bcg_ndi")
            loaded = true
            true
        } catch (e: UnsatisfiedLinkError) {
            loadFailed = true
            android.util.Log.e("NdiNative", "bcg_ndi load failed", e)
            false
        }
    }

    fun isSdkAvailable(): Boolean {
        if (!ensureLoaded()) return false
        return try {
            isSdkAvailable0()
        } catch (e: Exception) {
            android.util.Log.e("NdiNative", "isSdkAvailable", e)
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

    fun setSurface(surface: android.view.Surface?) {
        if (!ensureLoaded()) return
        try {
            setSurface0(surface)
        } catch (e: Exception) {
            android.util.Log.e("NdiNative", "setSurface", e)
        }
    }

    fun startReceive(sourceName: String): Boolean {
        if (!ensureLoaded()) return false
        return try {
            startReceive0(sourceName)
        } catch (e: Exception) {
            android.util.Log.e("NdiNative", "startReceive", e)
            false
        }
    }

    fun stopReceive() {
        if (!loaded) return
        try {
            stopReceive0()
        } catch (e: Exception) {
            android.util.Log.e("NdiNative", "stopReceive", e)
        }
    }

    fun shutdown() {
        if (!loaded) return
        try {
            shutdown0()
        } catch (e: Exception) {
            android.util.Log.e("NdiNative", "shutdown", e)
        }
    }

    /** Varre a rede por fontes NDI (bloqueia até waitMs). Retorna JSON array de nomes. */
    fun discoverSources(waitMs: Int = 10_000): String {
        if (!ensureLoaded()) return "[]"
        return try {
            discoverSources0(waitMs)
        } catch (e: Exception) {
            android.util.Log.e("NdiNative", "discoverSources", e)
            "[]"
        }
    }

    @JvmStatic
    private external fun isSdkAvailable0(): Boolean

    @JvmStatic
    private external fun getStatus0(): String

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
