package com.bostoncitygroup.bcgtv

/**
 * Ponte para receptor NDI (SDK Vizrt) — fase 2.
 * Com SDK instalado em jniLibs, implementar receive(ndiSourceName) aqui.
 */
object NdiReceiverBridge {
    val isAvailable: Boolean = false

    fun connect(sourceName: String): Boolean {
        // TODO: integrar NDI Advanced SDK for Android (jniLibs + NsdManager)
        return false
    }

    fun disconnect() {
        /* noop until SDK wired */
    }
}
