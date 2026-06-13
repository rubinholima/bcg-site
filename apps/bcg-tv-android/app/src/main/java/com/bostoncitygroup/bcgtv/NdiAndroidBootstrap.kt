package com.bostoncitygroup.bcgtv

import android.content.Context
import android.net.nsd.NsdManager
import android.view.SurfaceView

/** NsdManager obrigatório para descoberta NDI no Android (docs Vizrt). */
object NdiAndroidBootstrap {
    @Volatile
    private var nsdManager: NsdManager? = null

    fun ensure(context: Context) {
        if (nsdManager == null) {
            nsdManager = context.applicationContext.getSystemService(Context.NSD_SERVICE) as NsdManager
        }
    }
}
