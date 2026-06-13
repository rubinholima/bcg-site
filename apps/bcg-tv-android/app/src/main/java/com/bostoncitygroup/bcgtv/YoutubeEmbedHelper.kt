package com.bostoncitygroup.bcgtv

import android.annotation.SuppressLint
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView

object YoutubeEmbedHelper {
    private val VIDEO_ID_PATTERNS = listOf(
        Regex("[?&]v=([^&]+)"),
        Regex("youtu\\.be/([^?&]+)"),
        Regex("youtube\\.com/embed/([^?&]+)"),
        Regex("youtube\\.com/shorts/([^?&]+)"),
    )

    fun extractVideoId(url: String): String? {
        val u = url.trim()
        for (pattern in VIDEO_ID_PATTERNS) {
            val match = pattern.find(u)?.groupValues?.getOrNull(1)
            if (!match.isNullOrBlank()) return match
        }
        return null
    }

    fun embedUrl(videoId: String, startSeconds: Int): String {
        val start = startSeconds.coerceAtLeast(0)
        return buildString {
            append("https://www.youtube.com/embed/")
            append(videoId)
            append("?autoplay=1&mute=1&rel=0&controls=0&modestbranding=1")
            append("&playsinline=1&enablejsapi=1&fs=1&iv_load_policy=3")
            if (start > 0) append("&start=$start")
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    fun configureWebView(webView: WebView) {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            mediaPlaybackRequiresUserGesture = false
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            userAgentString =
                "Mozilla/5.0 (Linux; Android 10; Android TV) AppleWebKit/537.36 " +
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 BcgTvPlayer/${BuildConfig.VERSION_NAME}"
        }
        webView.webChromeClient = WebChromeClient()
        webView.setBackgroundColor(0xFF000000.toInt())
    }

    fun playCommandJs(): String =
        """
        (function(){
          try {
            window.postMessage(JSON.stringify({event:'command',func:'playVideo',args:[]}),'*');
          } catch(e) {}
        })();
        """.trimIndent()

    fun pauseCommandJs(): String =
        """
        (function(){
          try {
            window.postMessage(JSON.stringify({event:'command',func:'pauseVideo',args:[]}),'*');
          } catch(e) {}
        })();
        """.trimIndent()
}
