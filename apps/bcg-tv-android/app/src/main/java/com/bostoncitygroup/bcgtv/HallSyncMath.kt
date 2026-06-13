package com.bostoncitygroup.bcgtv

data class HallSyncItem(
    val contentType: String,
    val durationSeconds: Int?,
)

object HallSyncMath {
    fun effectiveDurationMs(item: HallSyncItem): Long {
        return when (item.contentType) {
            "image_url" -> (maxOf(5, item.durationSeconds ?: 10) * 1000L)
            "youtube_video" -> (maxOf(30, item.durationSeconds ?: 480) * 1000L)
            "video_url" -> (maxOf(30, item.durationSeconds ?: 120) * 1000L)
            "iptv_stream", "vmix_stream", "ndi_stream" -> {
                val d = item.durationSeconds
                if (d != null && d < 3600) 3600L * 1000L else ((d ?: 86400) * 1000L)
            }
            else -> 10_000L
        }
    }

    fun extrapolate(
        sync: HallSync,
        items: List<HallSyncItem>,
        nowMs: Long,
    ): Pair<Int, Long> {
        if (items.isEmpty()) return 0 to 0L
        if (sync.paused) return sync.itemIndex to sync.offsetMs

        val serverNow = try {
            java.time.Instant.parse(sync.serverNow).toEpochMilli()
        } catch (_: Exception) {
            nowMs
        }
        val drift = maxOf(0L, nowMs - serverNow)
        var elapsed = sync.offsetMs + drift
        var idx = sync.itemIndex % items.size

        repeat(items.size) {
            val dur = effectiveDurationMs(items[idx])
            if (elapsed < dur) return idx to elapsed
            elapsed -= dur
            idx = (idx + 1) % items.size
        }
        return sync.itemIndex to sync.offsetMs
    }
}
