package com.bostoncitygroup.bcgtv

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
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
    private lateinit var ndiPlaceholder: TextView
    private lateinit var statusText: TextView

    private var exoPlayer: ExoPlayer? = null
    private val handler = Handler(Looper.getMainLooper())
    private val io = Executors.newSingleThreadExecutor()

    private var screenNum = 0
    private var playerToken: String? = null
    private var payload: PlayerPayload? = null
    private var currentKey: String? = null

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
        ndiPlaceholder = findViewById(R.id.ndiPlaceholder)
        statusText = findViewById(R.id.statusText)

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
            "youtube_video" -> {
                // YouTube: fallback WebView player
                startActivity(
                    Intent(this, PlayerActivity::class.java).apply {
                        putExtra(PlayerActivity.EXTRA_SCREEN_NUM, screenNum)
                    },
                )
                finish()
            }
            else -> {
                statusText.text = "Tipo não suportado: ${item.contentType}"
                statusText.visibility = View.VISIBLE
            }
        }
    }

    private fun showNdi(item: PlayerItem) {
        val engine = Prefs.getPlayerEngine(this)
        if (engine == Prefs.ENGINE_NDI && NdiReceiverBridge.connect(item.url)) {
            ndiPlaceholder.text = "NDI: ${item.channelName ?: item.url}"
            ndiPlaceholder.visibility = View.VISIBLE
            return
        }
        ndiPlaceholder.text =
            "Fonte NDI\n${item.channelName ?: item.url}\n\n" +
                "Ative modo NDI no app e integre o SDK, ou use Birddog no HDMI.\n" +
                "vMix → NDI → esta fonte na rede."
        ndiPlaceholder.visibility = View.VISIBLE
    }

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
        playerView.visibility = View.GONE
        imageView.visibility = View.GONE
        ndiPlaceholder.visibility = View.GONE
        exoPlayer?.stop()
    }

    override fun onDestroy() {
        handler.removeCallbacksAndMessages(null)
        io.shutdownNow()
        NdiReceiverBridge.disconnect()
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
