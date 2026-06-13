package com.bostoncitygroup.bcgtv

import android.content.Context

object Prefs {
    private const val NAME = "bcgtv_prefs"
    private const val KEY_SCREEN = "screen_num"
    private const val KEY_ENGINE = "player_engine"

    const val ENGINE_WEB = "web"
    /** ExoPlayer nativo — menor buffer que WebView (streams/vídeo). */
    const val ENGINE_NATIVE = "native"
    /** NDI via SDK (fase 2 — estilo Birddog). */
    const val ENGINE_NDI = "ndi"

    fun getScreenNum(context: Context): Int =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE).getInt(KEY_SCREEN, 0)

    fun setScreenNum(context: Context, num: Int) {
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .edit()
            .putInt(KEY_SCREEN, num)
            .apply()
    }

    fun getPlayerEngine(context: Context): String =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .getString(KEY_ENGINE, ENGINE_NATIVE) ?: ENGINE_NATIVE

    fun setPlayerEngine(context: Context, engine: String) {
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_ENGINE, engine)
            .apply()
    }
}
