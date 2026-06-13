package com.bostoncitygroup.bcgtv

object NdiNative {
    init {
        try {
            System.loadLibrary("bcg_ndi")
        } catch (e: UnsatisfiedLinkError) {
            android.util.Log.e("NdiNative", "bcg_ndi load failed", e)
        }
    }

    external fun isSdkAvailable(): Boolean
    external fun getStatus(): String
    external fun setSurface(surface: android.view.Surface?)
    external fun startReceive(sourceName: String): Boolean
    external fun stopReceive()
    external fun shutdown()
}
