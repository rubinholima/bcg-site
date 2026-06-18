package com.bostoncitygroup.bcgtv

import android.util.Log
import com.bostoncitygroup.bcgtv.BuildConfig
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

data class PlayerItem(
    val id: String,
    val contentType: String,
    val url: String,
    val durationSeconds: Int?,
    val channelName: String?,
)

data class HallSync(
    val serverNow: String,
    val paused: Boolean,
    val playlistVersion: Int,
    val itemIndex: Int,
    val offsetMs: Long,
)

data class PlayerPayload(
    val items: List<PlayerItem>,
    val hallSync: HallSync?,
)

data class HallChannelInfo(
    val configured: Boolean,
    val playlistId: String?,
    val playlistName: String?,
    val itemCount: Int,
)

data class PlaylistOption(
    val id: String,
    val name: String,
    val itemCount: Int,
) {
    fun display(): String = "$name ($itemCount itens)"
}

data class HallPlaylistsResponse(
    val hallChannel: HallChannelInfo,
    val playlists: List<PlaylistOption>,
)

object PlayerApi {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val base = BuildConfig.API_BASE_URL.trimEnd('/')
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    /** Identifica o APK nativo — API preserva ndi_stream (sem fallback HLS). */
    private fun apiGet(url: String): Request =
        Request.Builder()
            .url(url)
            .header("User-Agent", "BcgTvPlayer/${BuildConfig.VERSION_NAME} (Android)")
            .header("X-BcgTv-Client", "native")
            .header("Cache-Control", "no-store")
            .get()
            .build()

    private fun apiPost(url: String, body: String): Request =
        Request.Builder()
            .url(url)
            .header("User-Agent", "BcgTvPlayer/${BuildConfig.VERSION_NAME} (Android)")
            .header("X-BcgTv-Client", "native")
            .post(body.toRequestBody(jsonType))
            .build()

    fun fetchPlayerToken(screenNum: Int): String? {
        val url = "$base/hall/$screenNum/player-token"
        return try {
            val res = client.newCall(apiGet(url)).execute()
            if (!res.isSuccessful) return null
            val json = JSONObject(res.body?.string() ?: return null)
            json.optString("playerToken").ifBlank { null }
        } catch (e: Exception) {
            Log.e("PlayerApi", "token", e)
            null
        }
    }

    fun fetchHallPlaylists(): HallPlaylistsResponse? {
        val url = "$base/hall/playlists"
        return try {
            val res = client.newCall(apiGet(url)).execute()
            if (!res.isSuccessful) return null
            parseHallPlaylists(JSONObject(res.body?.string() ?: return null))
        } catch (e: Exception) {
            Log.e("PlayerApi", "playlists", e)
            null
        }
    }

    fun bindScreenPlaylist(
        screenNum: Int,
        hallSyncMode: String,
        playlistId: String?,
    ): Boolean {
        val url = "$base/hall/$screenNum/playlist"
        val body = JSONObject().apply {
            put("hallSyncMode", hallSyncMode)
            if (!playlistId.isNullOrBlank()) put("playlistId", playlistId)
        }
        return try {
            val res = client.newCall(apiPost(url, body.toString())).execute()
            res.isSuccessful
        } catch (e: Exception) {
            Log.e("PlayerApi", "bind", e)
            false
        }
    }

    fun fetchPayload(token: String): PlayerPayload? {
        val url = "$base/play/${java.net.URLEncoder.encode(token, "UTF-8")}"
        return try {
            val res = client.newCall(apiGet(url)).execute()
            if (!res.isSuccessful) return null
            parsePayload(JSONObject(res.body?.string() ?: return null))
        } catch (e: Exception) {
            Log.e("PlayerApi", "payload", e)
            null
        }
    }

    private fun parseHallPlaylists(json: JSONObject): HallPlaylistsResponse {
        val hallObj = json.optJSONObject("hallChannel")
        val hall = if (hallObj?.optBoolean("configured") == true) {
            HallChannelInfo(
                configured = true,
                playlistId = hallObj.optString("playlistId").ifBlank { null },
                playlistName = hallObj.optString("playlistName").ifBlank { null },
                itemCount = hallObj.optInt("itemCount"),
            )
        } else {
            HallChannelInfo(configured = false, null, null, 0)
        }

        val arr = json.optJSONArray("playlists")
        val playlists = if (arr == null) {
            emptyList()
        } else {
            (0 until arr.length()).mapNotNull { i ->
                val o = arr.optJSONObject(i) ?: return@mapNotNull null
                PlaylistOption(
                    id = o.optString("id"),
                    name = o.optString("name"),
                    itemCount = o.optInt("itemCount"),
                )
            }
        }
        return HallPlaylistsResponse(hall, playlists)
    }

    private fun parsePayload(json: JSONObject): PlayerPayload {
        val itemsArr = json.optJSONArray("items") ?: return PlayerPayload(emptyList(), null)
        val items = (0 until itemsArr.length()).mapNotNull { i ->
            val o = itemsArr.optJSONObject(i) ?: return@mapNotNull null
            PlayerItem(
                id = o.optString("id"),
                contentType = o.optString("contentType"),
                url = o.optString("url"),
                durationSeconds = if (o.has("durationSeconds") && !o.isNull("durationSeconds")) {
                    o.optInt("durationSeconds")
                } else null,
                channelName = o.optString("channelName").ifBlank { null },
            )
        }
        val hall = json.optJSONObject("hallSync")?.let { h ->
            HallSync(
                serverNow = h.optString("serverNow"),
                paused = h.optBoolean("paused"),
                playlistVersion = h.optInt("playlistVersion"),
                itemIndex = h.optInt("itemIndex"),
                offsetMs = h.optLong("offsetMs"),
            )
        }
        return PlayerPayload(items, hall)
    }
}
