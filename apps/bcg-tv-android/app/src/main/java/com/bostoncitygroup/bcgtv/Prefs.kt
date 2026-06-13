package com.bostoncitygroup.bcgtv

import android.content.Context

object Prefs {
    private const val NAME = "bcgtv_prefs"
    private const val KEY_SCREEN = "screen_num"
    private const val KEY_ENGINE = "player_engine"
    private const val KEY_HALL_SYNC = "hall_sync_mode"
    private const val KEY_PLAYLIST_ID = "playlist_id"
    private const val KEY_NDI_SOURCE_MODE = "ndi_source_mode"
    private const val KEY_NDI_SOURCE_NAME = "ndi_source_name"

    const val ENGINE_WEB = "web"
    /** ExoPlayer nativo — menor buffer que WebView (streams/vídeo). */
    const val ENGINE_NATIVE = "native"
    /** NDI via SDK (fase 2 — estilo Birddog). */
    const val ENGINE_NDI = "ndi"

    const val SYNC_FOLLOW_HALL = "follow_hall"
    const val SYNC_INDEPENDENT = "independent"

    const val NDI_SOURCE_PLAYLIST = "playlist"
    const val NDI_SOURCE_MANUAL = "manual"

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

    fun getHallSyncMode(context: Context): String =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .getString(KEY_HALL_SYNC, SYNC_FOLLOW_HALL) ?: SYNC_FOLLOW_HALL

    fun setHallSyncMode(context: Context, mode: String) {
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_HALL_SYNC, mode)
            .apply()
    }

    fun getPlaylistId(context: Context): String? =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .getString(KEY_PLAYLIST_ID, null)

    fun setPlaylistId(context: Context, id: String?) {
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PLAYLIST_ID, id)
            .apply()
    }

    fun getNdiSourceMode(context: Context): String =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .getString(KEY_NDI_SOURCE_MODE, NDI_SOURCE_PLAYLIST) ?: NDI_SOURCE_PLAYLIST

    fun setNdiSourceMode(context: Context, mode: String) {
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_NDI_SOURCE_MODE, mode)
            .apply()
    }

    fun getNdiSourceName(context: Context): String? =
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .getString(KEY_NDI_SOURCE_NAME, null)

    fun setNdiSourceName(context: Context, name: String?) {
        context.getSharedPreferences(NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_NDI_SOURCE_NAME, name)
            .apply()
    }
}
