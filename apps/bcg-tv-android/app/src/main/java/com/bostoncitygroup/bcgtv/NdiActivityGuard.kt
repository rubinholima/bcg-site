package com.bostoncitygroup.bcgtv

import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.net.nsd.NsdManager
import android.os.Build
import android.util.Log
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

/**
 * Mantém NsdManager vivo na Activity (exigência NDI Android) e permissões de rede.
 * Birddog e apps NDI oficiais fazem o equivalente antes de qualquer finder/receiver.
 */
object NdiActivityGuard {
    private const val TAG = "NdiActivityGuard"
    const val REQUEST_NEARBY_WIFI = 9101

    @Volatile
    private var nsdManager: NsdManager? = null

    fun bind(activity: Activity) {
        if (nsdManager == null) {
            nsdManager = activity.getSystemService(Context.NSD_SERVICE) as NsdManager
            Log.i(TAG, "NsdManager vinculado à activity")
        }
        NdiAndroidBootstrap.ensure(activity)
        if (!NdiNative.ensureInitializedOnMainThread()) {
            Log.w(TAG, "NDI SDK não inicializou")
        }
    }

    fun hasNetworkPermissions(context: Context): Boolean {
        if (Build.VERSION.SDK_INT >= 33) {
            val nearby = ContextCompat.checkSelfPermission(
                context,
                android.Manifest.permission.NEARBY_WIFI_DEVICES,
            )
            if (nearby != PackageManager.PERMISSION_GRANTED) return false
        }
        return true
    }

    fun requestNetworkPermissions(activity: Activity) {
        if (Build.VERSION.SDK_INT < 33) return
        val missing = mutableListOf<String>()
        if (ContextCompat.checkSelfPermission(
                activity,
                android.Manifest.permission.NEARBY_WIFI_DEVICES,
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            missing.add(android.Manifest.permission.NEARBY_WIFI_DEVICES)
        }
        if (missing.isNotEmpty()) {
            ActivityCompat.requestPermissions(activity, missing.toTypedArray(), REQUEST_NEARBY_WIFI)
        }
    }
}
