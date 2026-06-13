package com.bostoncitygroup.bcgtv

import android.content.Context
import android.net.nsd.NsdManager
import android.net.wifi.WifiManager
import android.os.Build
import android.util.Log

/**
 * Android 12+ (API 31): NsdManager precisa chamar discoverServices("_ndi._tcp/_udp")
 * ou o NDI nunca descobre fontes — Birddog/hardware NDI não tem essa limitação.
 * Ref: KlakNDI AndroidHelper, docs Vizrt Platform Considerations.
 */
object NdiAndroidBootstrap {
    private const val TAG = "NdiBootstrap"

    @Volatile
    private var nsdManager: NsdManager? = null

    @Volatile
    private var multicastLock: WifiManager.MulticastLock? = null

    @Volatile
    private var ndiTcpListener: NsdManager.DiscoveryListener? = null

    @Volatile
    private var ndiUdpListener: NsdManager.DiscoveryListener? = null

    fun ensure(context: Context) {
        val app = context.applicationContext
        if (nsdManager == null) {
            nsdManager = app.getSystemService(Context.NSD_SERVICE) as NsdManager
        }
        if (multicastLock == null) {
            val wifi = app.getSystemService(Context.WIFI_SERVICE) as WifiManager
            multicastLock = wifi.createMulticastLock("bcgtv-ndi").apply {
                setReferenceCounted(true)
            }
        }
        multicastLock?.let { lock ->
            if (!lock.isHeld) lock.acquire()
        }
        startNdiServiceDiscovery()
    }

    private fun startNdiServiceDiscovery() {
        val nsd = nsdManager ?: return
        if (ndiTcpListener != null) return

        ndiTcpListener = emptyDiscoveryListener()
        ndiUdpListener = emptyDiscoveryListener()

        try {
            nsd.discoverServices("_ndi._tcp", NsdManager.PROTOCOL_DNS_SD, ndiTcpListener!!)
            nsd.discoverServices("_ndi._udp", NsdManager.PROTOCOL_DNS_SD, ndiUdpListener!!)
            Log.i(TAG, "NDI mDNS discovery started (_ndi._tcp / _ndi._udp)")
        } catch (e: Exception) {
            Log.e(TAG, "discoverServices failed", e)
        }
    }

    private fun emptyDiscoveryListener() = object : NsdManager.DiscoveryListener {
        override fun onStartDiscoveryFailed(serviceType: String, errorCode: Int) {
            Log.w(TAG, "onStartDiscoveryFailed $serviceType code=$errorCode")
        }

        override fun onStopDiscoveryFailed(serviceType: String, errorCode: Int) {
            Log.w(TAG, "onStopDiscoveryFailed $serviceType code=$errorCode")
        }

        override fun onDiscoveryStarted(serviceType: String) {
            Log.d(TAG, "onDiscoveryStarted $serviceType")
        }

        override fun onDiscoveryStopped(serviceType: String) {
            Log.d(TAG, "onDiscoveryStopped $serviceType")
        }

        override fun onServiceFound(serviceInfo: android.net.nsd.NsdServiceInfo) {
            Log.d(TAG, "onServiceFound ${serviceInfo.serviceName}")
        }

        override fun onServiceLost(serviceInfo: android.net.nsd.NsdServiceInfo) {
            Log.d(TAG, "onServiceLost ${serviceInfo.serviceName}")
        }
    }

    fun release() {
        val nsd = nsdManager
        ndiTcpListener?.let { listener ->
            try {
                nsd?.stopServiceDiscovery(listener)
            } catch (_: Exception) {
            }
        }
        ndiUdpListener?.let { listener ->
            try {
                nsd?.stopServiceDiscovery(listener)
            } catch (_: Exception) {
            }
        }
        ndiTcpListener = null
        ndiUdpListener = null

        multicastLock?.let { lock ->
            if (lock.isHeld) lock.release()
        }
    }
}
