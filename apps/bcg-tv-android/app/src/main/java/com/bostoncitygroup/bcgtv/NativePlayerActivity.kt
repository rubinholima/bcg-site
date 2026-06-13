package com.bostoncitygroup.bcgtv

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.net.nsd.NsdManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.SurfaceView
import android.view.View
import android.view.WindowManager
import android.webkit.WebView
import android.widget.ImageView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import coil.load
import java.util.concurrent.Executors

/**
 * Player nativo — ExoPlayer com buffer reduzido (menor latência que WebView).
 * Itens NDI: modo ENGINE_NDI + SDK (fase 2) ou placeholder.
 */
class NativePlayerActivity : AppCompatActivity() {
    private lateinit var playerView: PlayerView
    private lateinit var imageView: ImageView
    private lateinit var ndiSurfaceView: SurfaceView
    private lateinit var ndiPlaceholder: TextView
    private lateinit var statusText: TextView
    private lateinit var youtubeWebView: WebView

    private var exoPlayer: ExoPlayer? = null
    private val handler = Handler(Looper.getMainLooper())
    private val io = Executors.newSingleThreadExecutor()
    private var youtubePaused = false
    private var youtubePlayRetryRunnable: Runnable? = null

    private var screenNum = 0
    private var playerToken: String? = null
    private var payload: PlayerPayload? = null
    private var currentKey: String? = null
    private var currentNdiSource: String? = null
    private var ndiSurfaceReady = false
    /** Mantém NsdManager vivo enquanto o player NDI roda (exigência SDK Vizrt). */
    private var nsdManager: NsdManager? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        setContentView(R.layout.activity_native_player)

        screenNum = intent.getIntExtra(EXTRA_SCREEN_NUM, Prefs.getScreenNum(this))
        if (screenNum !in 1..21) {
            startActivity(Intent(this, SetupActivity::class.java))
            finish()
            return
        }

        playerView = findViewById(R.id.exoPlayerView)
        imageView = findViewById(R.id.imageView)
        ndiSurfaceView = findViewById(R.id.ndiSurfaceView)
        ndiPlaceholder = findViewById(R.id.ndiPlaceholder)
        statusText = findViewById(R.id.statusText)
        youtubeWebView = findViewById(R.id.youtubeWebView)
        YoutubeEmbedHelper.configureWebView(youtubeWebView)

        NdiAndroidBootstrap.ensure(this)
        nsdManager = getSystemService(Context.NSD_SERVICE) as NsdManager
        NdiReceiverBridge.attachSurface(ndiSurfaceView) {
            ndiSurfaceReady = true
            currentNdiSource?.let { tryConnectNdi(it) }
        }

        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(500, 2000, 500, 500)
            .build()
        exoPlayer = ExoPlayer.Builder(this)
            .setLoadControl(loadControl)
            .build()
            .also { player ->
                playerView.player = player
                player.playWhenReady = true
            }

        statusText.visibility = View.VISIBLE
        statusText.text = "BCG TV nativo · tela $screenNum"
        bootstrap()
    }

    private fun bootstrap() {
        io.execute {
            val token = PlayerApi.fetchPlayerToken(screenNum)
            handler.post {
                if (token == null) {
                    statusText.text = "Erro ao obter token. Tentando…"
                    handler.postDelayed({ bootstrap() }, 8000)
                    return@post
                }
                playerToken = token
                startLoops()
            }
        }
    }

    private fun startLoops() {
        handler.post(refreshRunnable)
        handler.post(tickRunnable)
    }

    private val refreshRunnable = object : Runnable {
        override fun run() {
            val token = playerToken ?: return
            io.execute {
                val next = PlayerApi.fetchPayload(token)
                handler.post {
                    payload = next
                    renderCurrent()
                    handler.postDelayed(this, 5000)
                }
            }
        }
    }

    private val tickRunnable = object : Runnable {
        override fun run() {
            renderCurrent()
            handler.postDelayed(this, 400)
        }
    }

    private fun renderCurrent() {
        val data = payload
        if (data == null || data.items.isEmpty()) {
            statusText.text = "Aguardando playlist…"
            return
        }

        val items = data.items
        val hall = data.hallSync
        val (idx, offsetMs) = if (hall != null) {
            val syncItems = items.map { HallSyncItem(it.contentType, it.durationSeconds) }
            HallSyncMath.extrapolate(hall, syncItems, System.currentTimeMillis())
        } else {
            0 to 0L
        }

        val item = items[idx % items.size]
        val key = "${item.id}-${hall?.playlistVersion ?: 0}-$idx"
        if (key == currentKey) {
            if (item.contentType == "video_url" && hall != null && !hall.paused) {
                seekIfNeeded(offsetMs)
            }
            if (item.contentType == "youtube_video") {
                val paused = hall?.paused == true
                if (youtubePaused != paused) {
                    youtubePaused = paused
                    applyYoutubePlaybackState()
                }
            }
            return
        }
        currentKey = key
        showItem(item, offsetMs, hall?.paused == true)
    }

    private fun showItem(item: PlayerItem, offsetMs: Long, paused: Boolean) {
        hideAll()
        when (item.contentType) {
            "image_url" -> {
                imageView.visibility = View.VISIBLE
                imageView.load(item.url)
            }
            "video_url" -> playStream(item.url, offsetMs, paused)
            "iptv_stream", "vmix_stream" -> playStream(resolveStreamUrl(item.url), 0, paused)
            "ndi_stream" -> showNdi(item)
            "youtube_video" -> showYoutube(item, offsetMs, paused)
            else -> {
                statusText.text = "Tipo não suportado: ${item.contentType}"
                statusText.visibility = View.VISIBLE
            }
        }
    }

    private fun showYoutube(item: PlayerItem, offsetMs: Long, paused: Boolean) {
        val videoId = YoutubeEmbedHelper.extractVideoId(item.url)
        if (videoId == null) {
            statusText.text = "URL do YouTube inválida"
            statusText.visibility = View.VISIBLE
            return
        }
        youtubePaused = paused
        youtubeWebView.visibility = View.VISIBLE
        statusText.visibility = View.GONE
        val startSec = (offsetMs / 1000).toInt()
        youtubeWebView.loadUrl(YoutubeEmbedHelper.embedUrl(videoId, startSec))
        applyYoutubePlaybackState()
    }

    private fun applyYoutubePlaybackState() {
        youtubePlayRetryRunnable?.let { handler.removeCallbacks(it) }
        if (youtubeWebView.visibility != View.VISIBLE) return

        if (youtubePaused) {
            handler.postDelayed({
                youtubeWebView.evaluateJavascript(YoutubeEmbedHelper.pauseCommandJs(), null)
            }, 400)
            return
        }

        val retry = object : Runnable {
            private var attempts = 0
            override fun run() {
                if (youtubeWebView.visibility != View.VISIBLE || youtubePaused) return
                youtubeWebView.onResume()
                youtubeWebView.evaluateJavascript(YoutubeEmbedHelper.playCommandJs(), null)
                attempts += 1
                if (attempts < 10) {
                    handler.postDelayed(this, 1500)
                }
            }
        }
        youtubePlayRetryRunnable = retry
        handler.postDelayed(retry, 700)
    }

    private fun showNdi(item: PlayerItem) {
        val sourceName = item.url.trim()
        if (sourceName.isEmpty()) {
            ndiPlaceholder.text = "Fonte NDI sem nome configurado."
            ndiPlaceholder.visibility = View.VISIBLE
            return
        }

        ndiSurfaceView.visibility = View.VISIBLE
        ndiPlaceholder.visibility = View.GONE
        currentNdiSource = sourceName

        if (ndiSurfaceReady) {
            tryConnectNdi(sourceName)
        } else {
            ndiPlaceholder.text = "Iniciando receptor NDI…"
            ndiPlaceholder.visibility = View.VISIBLE
        }

        handler.postDelayed(ndiStatusRunnable, 1500)
    }

    private fun tryConnectNdi(sourceName: String) {
        io.execute {
            val ok = NdiReceiverBridge.connect(sourceName)
            handler.post {
                if (ok) {
                    ndiPlaceholder.visibility = View.GONE
                    statusText.text = "NDI · ${itemLabel(sourceName)}"
                } else {
                    ndiPlaceholder.text =
                        "NDI: ${NdiReceiverBridge.status()}\n\n" +
                            "Fonte: $sourceName\n\n" +
                            "Confira: vMix NDI ligado, mesma rede, libndi.so no APK (setup-ndi-sdk.ps1)."
                    ndiPlaceholder.visibility = View.VISIBLE
                }
            }
        }
    }

    private val ndiStatusRunnable = object : Runnable {
        override fun run() {
            if (currentNdiSource != null && ndiSurfaceView.visibility == View.VISIBLE) {
                statusText.text = NdiReceiverBridge.status()
                handler.postDelayed(this, 3000)
            }
        }
    }

    private fun itemLabel(sourceName: String) = sourceName

    private fun playStream(url: String, offsetMs: Long, paused: Boolean) {
        playerView.visibility = View.VISIBLE
        val player = exoPlayer ?: return
        player.setMediaItem(MediaItem.fromUri(Uri.parse(url)))
        player.prepare()
        player.playWhenReady = !paused
        if (offsetMs > 0) {
            handler.postDelayed({ player.seekTo(offsetMs) }, 300)
        }
    }

    private fun seekIfNeeded(offsetMs: Long) {
        val player = exoPlayer ?: return
        if (kotlin.math.abs(player.currentPosition - offsetMs) > 900) {
            player.seekTo(offsetMs)
        }
    }

    private fun resolveStreamUrl(relativeOrAbsolute: String): String {
        val u = relativeOrAbsolute.trim()
        if (u.startsWith("http://") || u.startsWith("https://")) return u
        val origin = BuildConfig.STREAM_ORIGIN.trimEnd('/')
        val path = if (u.startsWith("/")) u else "/$u"
        return "$origin$path"
    }

    private fun hideAll() {
        handler.removeCallbacks(ndiStatusRunnable)
        if (currentNdiSource != null) {
            NdiReceiverBridge.disconnect()
            currentNdiSource = null
        }
        playerView.visibility = View.GONE
        imageView.visibility = View.GONE
        ndiSurfaceView.visibility = View.GONE
        ndiPlaceholder.visibility = View.GONE
        youtubeWebView.visibility = View.GONE
        youtubePlayRetryRunnable?.let { handler.removeCallbacks(it) }
        exoPlayer?.stop()
    }

    override fun onResume() {
        super.onResume()
        if (youtubeWebView.visibility == View.VISIBLE) {
            youtubeWebView.onResume()
            if (!youtubePaused) applyYoutubePlaybackState()
        }
    }

    override fun onPause() {
        youtubePlayRetryRunnable?.let { handler.removeCallbacks(it) }
        if (::youtubeWebView.isInitialized) {
            youtubeWebView.onPause()
        }
        super.onPause()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        youtubePlayRetryRunnable = null
        if (::youtubeWebView.isInitialized) {
            youtubeWebView.destroy()
        }
        io.shutdownNow()
        NdiReceiverBridge.shutdown()
        NdiAndroidBootstrap.release()
        exoPlayer?.release()
        exoPlayer = null
        super.onDestroy()
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_MENU) {
            startActivity(
                Intent(this, SetupActivity::class.java).apply {
                    putExtra(SetupActivity.EXTRA_FORCE_SETUP, true)
                },
            )
            return true
        }
        return super.onKeyDown(keyCode, event)
    }

    companion object {
        const val EXTRA_SCREEN_NUM = "screen_num"
    }
}
