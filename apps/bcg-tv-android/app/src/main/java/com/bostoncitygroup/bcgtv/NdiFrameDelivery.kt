package com.bostoncitygroup.bcgtv

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.TextureView
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Renderiza frames NDI na thread principal (TextureView).
 * Evita crash ao desenhar ANativeWindow em thread de fundo — padrão Birddog/TV.
 */
object NdiFrameDelivery {
    private const val TAG = "NdiFrameDelivery"
    private val handler = Handler(Looper.getMainLooper())
    private val paint = Paint().apply { isFilterBitmap = true }
    private var textureView: TextureView? = null
    private var cachedBitmap: Bitmap? = null
    private var cachedW = 0
    private var cachedH = 0
    @Volatile private var drawing = false

    fun attach(view: TextureView) {
        textureView = view
    }

    fun detach() {
        textureView = null
        cachedBitmap?.recycle()
        cachedBitmap = null
        cachedW = 0
        cachedH = 0
    }

    @JvmStatic
    fun deliverRgba(width: Int, height: Int, rgba: ByteArray) {
        if (width <= 0 || height <= 0) return
        val needed = width * height * 4
        if (rgba.size < needed) return
        handler.post { drawFrame(width, height, rgba) }
    }

    private fun drawFrame(width: Int, height: Int, rgba: ByteArray) {
        if (drawing) return
        val view = textureView ?: return
        if (!view.isAvailable) return
        drawing = true
        try {
            val bitmap = bitmapFor(width, height)
            val buffer = ByteBuffer.wrap(rgba).order(ByteOrder.LITTLE_ENDIAN)
            bitmap.copyPixelsFromBuffer(buffer)

            val canvas: Canvas = view.lockCanvas() ?: return
            try {
                val vw = view.width.toFloat().coerceAtLeast(1f)
                val vh = view.height.toFloat().coerceAtLeast(1f)
                val scale = minOf(vw / width, vh / height)
                val dw = width * scale
                val dh = height * scale
                val left = (vw - dw) / 2f
                val top = (vh - dh) / 2f
                canvas.drawColor(Color.BLACK)
                canvas.drawBitmap(
                    bitmap,
                    null,
                    Rect(left.toInt(), top.toInt(), (left + dw).toInt(), (top + dh).toInt()),
                    paint,
                )
            } finally {
                view.unlockCanvasAndPost(canvas)
            }
        } catch (e: Exception) {
            Log.e(TAG, "drawFrame", e)
        } finally {
            drawing = false
        }
    }

    private fun bitmapFor(width: Int, height: Int): Bitmap {
        val cached = cachedBitmap
        if (cached != null && cachedW == width && cachedH == height && !cached.isRecycled) {
            return cached
        }
        cached?.recycle()
        val created = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        cachedBitmap = created
        cachedW = width
        cachedH = height
        return created
    }
}
