package com.bostoncitygroup.bcgtv

import android.util.Log
import com.bostoncitygroup.bcgtv.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.Request
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

object PlayerApi {
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    private val base = BuildConfig.API_BASE_URL.trimEnd('/')

    fun fetchPlayerToken(screenNum: Int): String? {
        val url = "$base/hall/$screenNum/player-token"
        return try {
            val res = client.newCall(Request.Builder().url(url).get().build()).execute()
            if (!res.isSuccessful) return null
            val json = JSONObject(res.body?.string() ?: return null)
            json.optString("playerToken").ifBlank { null }
        } catch (e: Exception) {
            Log.e("PlayerApi", "token", e)
            null
        }
    }

    fun fetchPayload(token: String): PlayerPayload? {
        val url = "$base/play/${java.net.URLEncoder.encode(token, "UTF-8")}"
        return try {
            val res = client.newCall(
                Request.Builder().url(url).header("Cache-Control", "no-store").get().build(),
            ).execute()
            if (!res.isSuccessful) return null
            parsePayload(JSONObject(res.body?.string() ?: return null))
        } catch (e: Exception) {
            Log.e("PlayerApi", "payload", e)
            null
        }
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
