package com.bostoncitygroup.bcgtv

import android.app.Application
import android.util.Log

class BcgTvApp : Application() {
    override fun onCreate() {
        super.onCreate()
        val default = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, error ->
            Log.e(TAG, "Uncaught on ${thread.name}", error)
            default?.uncaughtException(thread, error)
        }
    }

    companion object {
        private const val TAG = "BcgTvApp"
    }
}
