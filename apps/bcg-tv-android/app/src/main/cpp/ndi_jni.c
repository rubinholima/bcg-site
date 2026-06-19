#include <android/log.h>
#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <dlfcn.h>
#include <jni.h>
#include <pthread.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <stdint.h>
#include <unistd.h>

#define LOG_TAG "BcgNdi"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

#define STATUS_MAX 512
#define TARGET_MAX 512
#define NDI_NAME_MAX 512

typedef enum {
    NDIlib_FourCC_type_UYVY = 0x59565955,
    NDIlib_FourCC_type_BGRA = 0x41524742,
    NDIlib_FourCC_type_BGRX = 0x58524742,
} NDIlib_FourCC_video_type_e;

typedef enum {
    NDIlib_frame_format_type_progressive = 1,
} NDIlib_frame_format_type_e;

typedef struct {
    const char* p_ndi_name;
    const char* p_url_address;
} NDIlib_source_t;

typedef struct {
    bool show_local_sources;
    const char* p_groups;
    const char* p_extra_ips;
} NDIlib_find_create_t;

typedef enum {
    NDIlib_recv_color_format_BGRX_BGRA = 0,
    NDIlib_recv_color_format_UYVY_BGRA = 1,
    NDIlib_recv_color_format_fastest = 100,
    NDIlib_recv_color_format_best = 101,
} NDIlib_recv_color_format_e;

typedef enum {
    NDIlib_recv_bandwidth_highest = 100,
} NDIlib_recv_bandwidth_e;

/*
 * IMPORTANTE: o layout abaixo precisa bater EXATAMENTE com Processing.NDI.Recv.h.
 * source_to_connect_to é a struct POR VALOR (16 bytes), NÃO um ponteiro.
 * Declarar como ponteiro desloca color_format/bandwidth/p_ndi_recv_name e faz
 * o SDK ler lixo (segfault em NDIlib_recv_create_v3).
 */
typedef struct {
    NDIlib_source_t source_to_connect_to;
    NDIlib_recv_color_format_e color_format;
    NDIlib_recv_bandwidth_e bandwidth;
    bool allow_video_fields;
    const char* p_ndi_recv_name;
} NDIlib_recv_create_v3_t;

typedef enum {
    NDIlib_frame_type_none = 0,
    NDIlib_frame_type_video = 1,
    NDIlib_frame_type_audio = 2,
    NDIlib_frame_type_metadata = 3,
    NDIlib_frame_type_status_change = 100,
} NDIlib_frame_type_e;

typedef struct {
    int xres;
    int yres;
    NDIlib_FourCC_video_type_e FourCC;
    int frame_rate_N;
    int frame_rate_D;
    float picture_aspect_ratio;
    NDIlib_frame_format_type_e frame_format_type;
    int64_t timecode;
    uint8_t* p_data;
    int line_stride_in_bytes;
    const char* p_metadata;
    int64_t timestamp;
} NDIlib_video_frame_v2_t;

typedef struct {
    int sample_rate;
    int no_channels;
    int no_samples;
    int64_t timecode;
    float* p_data;
    int channel_stride_in_bytes;
    int64_t timestamp;
} NDIlib_audio_frame_v3_t;

typedef struct {
    int length;
    int64_t timecode;
    char* p_data;
} NDIlib_metadata_frame_t;

typedef void* NDIlib_find_instance_t;
typedef void* NDIlib_recv_instance_t;

typedef bool (*ndi_initialize_fn)(void);
typedef void (*ndi_destroy_fn)(void);
typedef NDIlib_find_instance_t (*ndi_find_create_fn)(const NDIlib_find_create_t*);
typedef void (*ndi_find_destroy_fn)(NDIlib_find_instance_t);
typedef bool (*ndi_find_wait_fn)(NDIlib_find_instance_t, uint32_t);
typedef const NDIlib_source_t* (*ndi_find_get_sources_fn)(NDIlib_find_instance_t, uint32_t*);
typedef NDIlib_recv_instance_t (*ndi_recv_create_fn)(const NDIlib_recv_create_v3_t*);
typedef void (*ndi_recv_destroy_fn)(NDIlib_recv_instance_t);
typedef void (*ndi_recv_connect_fn)(NDIlib_recv_instance_t, const NDIlib_source_t*);
typedef NDIlib_frame_type_e (*ndi_recv_capture_fn)(
    NDIlib_recv_instance_t,
    NDIlib_video_frame_v2_t*,
    NDIlib_audio_frame_v3_t*,
    NDIlib_metadata_frame_t*,
    uint32_t);
typedef void (*ndi_recv_free_video_fn)(NDIlib_recv_instance_t, const NDIlib_video_frame_v2_t*);
typedef void (*ndi_recv_free_audio_fn)(NDIlib_recv_instance_t, const NDIlib_audio_frame_v3_t*);
typedef void (*ndi_recv_free_metadata_fn)(NDIlib_recv_instance_t, const NDIlib_metadata_frame_t*);
typedef int (*ndi_recv_get_no_connections_fn)(NDIlib_recv_instance_t);

typedef struct {
    void* lib;
    ndi_initialize_fn initialize;
    ndi_destroy_fn destroy;
    ndi_find_create_fn find_create;
    ndi_find_destroy_fn find_destroy;
    ndi_find_wait_fn find_wait;
    ndi_find_get_sources_fn find_get_sources;
    ndi_recv_create_fn recv_create;
    ndi_recv_destroy_fn recv_destroy;
    ndi_recv_connect_fn recv_connect;
    ndi_recv_capture_fn recv_capture;
    ndi_recv_free_video_fn recv_free_video;
    ndi_recv_free_audio_fn recv_free_audio;
    ndi_recv_free_metadata_fn recv_free_metadata;
    ndi_recv_get_no_connections_fn get_no_connections;
    bool ok;
} NdiApi;

static JavaVM* g_jvm = NULL;
static jclass g_delivery_class = NULL;
static jmethodID g_deliver_method = NULL;

static NdiApi g_ndi;
static volatile int g_running = 0;
static pthread_t g_thread;
static int g_thread_active = 0;
static char g_target_name[TARGET_MAX];
static char g_status[STATUS_MAX] = "NDI nao iniciado";
static char g_chosen_name[NDI_NAME_MAX];
static char g_chosen_url[NDI_NAME_MAX];
static NDIlib_source_t g_chosen_source;
static pthread_mutex_t g_ndi_op_mutex = PTHREAD_MUTEX_INITIALIZER;

static uint8_t* g_rgba_buf = NULL;
static size_t g_rgba_cap = 0;

/* Renderização direta no Surface (ANativeWindow) — baixa latência, sem cópia por Java. */
static ANativeWindow* g_window = NULL;
static pthread_mutex_t g_win_mutex = PTHREAD_MUTEX_INITIALIZER;
static int g_win_w = 0;
static int g_win_h = 0;

/* Telemetria visível na tela (sem logcat). */
static volatile int g_diag_video_frames = 0;
static volatile int g_diag_draw_ok = 0;
static volatile int g_diag_vid_w = 0;
static volatile int g_diag_vid_h = 0;
static volatile int g_diag_lock_fail = 0;
static volatile int g_diag_last_type = -1;
static volatile int g_diag_none_count = 0;
static volatile int g_diag_bad_video = 0;
static volatile int g_diag_conns = -1;

static void append_json_string(char* json, size_t cap, size_t* pos, const char* s) {
    if (*pos >= cap - 2) return;
    json[(*pos)++] = '"';
    json[*pos] = '\0';
    if (s) {
        while (*s && *pos < cap - 3) {
            if (*s == '"' || *s == '\\') {
                if (*pos >= cap - 3) break;
                json[(*pos)++] = '\\';
            }
            json[(*pos)++] = *s++;
            json[*pos] = '\0';
        }
    }
    if (*pos < cap - 1) {
        json[(*pos)++] = '"';
        json[*pos] = '\0';
    }
}

static void set_status(const char* msg) {
    if (!msg) msg = "";
    snprintf(g_status, sizeof(g_status), "%s", msg);
}

static void stop_internal(void) {
    g_running = 0;
    if (g_thread_active) {
        pthread_join(g_thread, NULL);
        g_thread_active = 0;
    }
}

static bool ensure_rgba_buf(size_t need) {
    if (g_rgba_cap >= need && g_rgba_buf) return true;
    uint8_t* next = (uint8_t*)realloc(g_rgba_buf, need);
    if (!next) return false;
    g_rgba_buf = next;
    g_rgba_cap = need;
    return true;
}

static void deliver_rgba_to_java(JNIEnv* env, int w, int h, const uint8_t* rgba, size_t len) {
    if (!env || !g_delivery_class || !g_deliver_method || !rgba || len == 0) return;
    jbyteArray arr = (*env)->NewByteArray(env, (jsize)len);
    if (!arr) return;
    (*env)->SetByteArrayRegion(env, arr, 0, (jsize)len, (const jbyte*)rgba);
    (*env)->CallStaticVoidMethod(env, g_delivery_class, g_deliver_method, w, h, arr);
    if ((*env)->ExceptionCheck(env)) {
        (*env)->ExceptionClear(env);
        LOGE("deliverRgba JNI exception");
    }
    (*env)->DeleteLocalRef(env, arr);
}

static uint8_t clamp_u8(int v) {
    if (v < 0) return 0;
    if (v > 255) return 255;
    return (uint8_t)v;
}

static void uyvy_to_rgba_row(const uint8_t* row, uint8_t* out, int width) {
    int x;
    for (x = 0; x + 1 < width; x += 2) {
        const int u = (int)row[0] - 128;
        const int y0 = (int)row[1] - 16;
        const int v = (int)row[2] - 128;
        const int y1 = (int)row[3] - 16;
        row += 4;
        const int cy0 = (int)(1.164f * (float)y0);
        const int cy1 = (int)(1.164f * (float)y1);
        out[0] = clamp_u8(cy0 + (int)(1.596f * (float)v));
        out[1] = clamp_u8(cy0 - (int)(0.391f * (float)u) - (int)(0.813f * (float)v));
        out[2] = clamp_u8(cy0 + (int)(2.018f * (float)u));
        out[3] = 255;
        out[4] = clamp_u8(cy1 + (int)(1.596f * (float)v));
        out[5] = clamp_u8(cy1 - (int)(0.391f * (float)u) - (int)(0.813f * (float)v));
        out[6] = clamp_u8(cy1 + (int)(2.018f * (float)u));
        out[7] = 255;
        out += 8;
    }
}

static bool frame_to_rgba(const NDIlib_video_frame_v2_t* frame, uint8_t* dst, size_t dst_cap) {
    if (!frame || !frame->p_data || frame->xres <= 0 || frame->yres <= 0) return false;
    const size_t need = (size_t)frame->xres * (size_t)frame->yres * 4u;
    if (dst_cap < need) return false;

    if (frame->FourCC == NDIlib_FourCC_type_BGRA || frame->FourCC == NDIlib_FourCC_type_BGRX) {
        const int src_stride = frame->line_stride_in_bytes > 0
            ? frame->line_stride_in_bytes
            : frame->xres * 4;
        const int dst_stride = frame->xres * 4;
        int y;
        for (y = 0; y < frame->yres; y++) {
            const uint8_t* src = frame->p_data + y * src_stride;
            uint8_t* out = dst + y * dst_stride;
            int x;
            for (x = 0; x < frame->xres; x++) {
                out[x * 4 + 0] = src[x * 4 + 0];
                out[x * 4 + 1] = src[x * 4 + 1];
                out[x * 4 + 2] = src[x * 4 + 2];
                out[x * 4 + 3] = 255;
            }
        }
        return true;
    }

    if (frame->FourCC == NDIlib_FourCC_type_UYVY) {
        const int src_stride = frame->line_stride_in_bytes > 0
            ? frame->line_stride_in_bytes
            : frame->xres * 2;
        const int dst_stride = frame->xres * 4;
        int y;
        for (y = 0; y < frame->yres; y++) {
            uyvy_to_rgba_row(frame->p_data + y * src_stride, dst + y * dst_stride, frame->xres);
        }
        return true;
    }

    static int logged_fourcc = 0;
    if (!logged_fourcc) {
        LOGE("FourCC nao suportado: 0x%x", frame->FourCC);
        logged_fourcc = 1;
    }
    return false;
}

/* Escreve o frame no buffer do ANativeWindow em RGBX (R,G,B,X), respeitando o stride. */
static void frame_to_window(const NDIlib_video_frame_v2_t* frame, ANativeWindow_Buffer* buf) {
    const int w = frame->xres < buf->width ? frame->xres : buf->width;
    const int h = frame->yres < buf->height ? frame->yres : buf->height;
    uint8_t* dst_base = (uint8_t*)buf->bits;
    const int dst_stride = buf->stride * 4;

    if (frame->FourCC == NDIlib_FourCC_type_BGRA || frame->FourCC == NDIlib_FourCC_type_BGRX) {
        const int src_stride = frame->line_stride_in_bytes > 0 ? frame->line_stride_in_bytes : frame->xres * 4;
        for (int y = 0; y < h; y++) {
            const uint8_t* src = frame->p_data + (size_t)y * src_stride;
            uint8_t* dst = dst_base + (size_t)y * dst_stride;
            for (int x = 0; x < w; x++) {
                dst[x * 4 + 0] = src[x * 4 + 2]; /* R */
                dst[x * 4 + 1] = src[x * 4 + 1]; /* G */
                dst[x * 4 + 2] = src[x * 4 + 0]; /* B */
                dst[x * 4 + 3] = 255;            /* X */
            }
        }
        return;
    }

    if (frame->FourCC == NDIlib_FourCC_type_UYVY) {
        const int src_stride = frame->line_stride_in_bytes > 0 ? frame->line_stride_in_bytes : frame->xres * 2;
        for (int y = 0; y < h; y++) {
            /* uyvy_to_rgba_row já produz R,G,B,A na ordem correta para a janela. */
            uyvy_to_rgba_row(frame->p_data + (size_t)y * src_stride, dst_base + (size_t)y * dst_stride, w);
        }
        return;
    }

    static int logged_fourcc = 0;
    if (!logged_fourcc) {
        LOGE("FourCC nao suportado (window): 0x%x", frame->FourCC);
        logged_fourcc = 1;
    }
}

static void render_to_window(const NDIlib_video_frame_v2_t* frame) {
    if (!frame || !frame->p_data || frame->xres <= 0 || frame->yres <= 0) return;

    pthread_mutex_lock(&g_win_mutex);
    ANativeWindow* w = g_window;
    if (w) ANativeWindow_acquire(w);
    pthread_mutex_unlock(&g_win_mutex);
    if (!w) {
        static int warned = 0;
        if (!warned) { LOGE("render_to_window: SEM Surface (g_window=NULL) — video nao desenha"); warned = 1; }
        return;
    }

    static int lock_err = 0;

    if (g_win_w != frame->xres || g_win_h != frame->yres) {
        if (ANativeWindow_setBuffersGeometry(w, frame->xres, frame->yres, WINDOW_FORMAT_RGBX_8888) == 0) {
            g_win_w = frame->xres;
            g_win_h = frame->yres;
        }
    }

    ANativeWindow_Buffer buf;
    int lr = ANativeWindow_lock(w, &buf, NULL);
    if (lr == 0) {
        frame_to_window(frame, &buf);
        ANativeWindow_unlockAndPost(w);
        g_diag_draw_ok = 1;
        g_diag_vid_w = frame->xres;
        g_diag_vid_h = frame->yres;
    } else {
        g_diag_lock_fail = lr;
        if (!lock_err) {
            LOGE("ANativeWindow_lock falhou: %d", lr);
            lock_err = 1;
        }
    }
    ANativeWindow_release(w);
}

static void deliver_frame(JNIEnv* env, const NDIlib_video_frame_v2_t* frame) {
    (void)env;
    render_to_window(frame);
}

static bool attach_recv_env(JNIEnv** env, bool* attached) {
    *env = NULL;
    *attached = false;
    if (!g_jvm) return false;
    jint rs = (*g_jvm)->GetEnv(g_jvm, (void**)env, JNI_VERSION_1_6);
    if (rs == JNI_OK) return true;
    if (rs == JNI_EDETACHED) {
        if ((*g_jvm)->AttachCurrentThread(g_jvm, env, NULL) == 0) {
            *attached = true;
            return true;
        }
    }
    return false;
}

static bool load_ndi(void) {
    if (g_ndi.ok) return true;
    memset(&g_ndi, 0, sizeof(g_ndi));
    g_ndi.lib = dlopen("libndi.so", RTLD_NOW | RTLD_NOLOAD);
    if (!g_ndi.lib) {
        g_ndi.lib = dlopen("libndi.so", RTLD_NOW);
    }
    if (!g_ndi.lib) {
        LOGE("dlopen libndi.so failed: %s", dlerror());
        set_status("libndi.so ausente — rode setup-ndi-sdk.ps1");
        return false;
    }
#define LOAD(sym, fn)                                                                                  \
    g_ndi.fn = (ndi_##fn##_fn)dlsym(g_ndi.lib, sym);                                                   \
    if (!g_ndi.fn) {                                                                                   \
        LOGE("dlsym %s failed", sym);                                                                  \
        set_status("NDI SDK incompleto (" sym ")");                                                    \
        return false;                                                                                  \
    }
    LOAD("NDIlib_initialize", initialize);
    LOAD("NDIlib_destroy", destroy);
    LOAD("NDIlib_find_create_v2", find_create);
    LOAD("NDIlib_find_destroy", find_destroy);
    LOAD("NDIlib_find_wait_for_sources", find_wait);
    LOAD("NDIlib_find_get_current_sources", find_get_sources);
    LOAD("NDIlib_recv_create_v3", recv_create);
    LOAD("NDIlib_recv_destroy", recv_destroy);
    LOAD("NDIlib_recv_capture_v3", recv_capture);
    LOAD("NDIlib_recv_free_video_v2", recv_free_video);
#undef LOAD
    g_ndi.recv_connect = (ndi_recv_connect_fn)dlsym(g_ndi.lib, "NDIlib_recv_connect");
    g_ndi.recv_free_audio = (ndi_recv_free_audio_fn)dlsym(g_ndi.lib, "NDIlib_recv_free_audio_v3");
    g_ndi.recv_free_metadata = (ndi_recv_free_metadata_fn)dlsym(g_ndi.lib, "NDIlib_recv_free_metadata");
    g_ndi.get_no_connections = (ndi_recv_get_no_connections_fn)dlsym(g_ndi.lib, "NDIlib_recv_get_no_connections");
    if (!g_ndi.initialize()) {
        LOGE("NDIlib_initialize failed");
        set_status("NDIlib_initialize falhou");
        return false;
    }
    g_ndi.ok = true;
    return true;
}

static bool name_matches(const char* ndi_name, const char* target) {
    if (!ndi_name || !target || !target[0]) return false;
    if (strcasecmp(ndi_name, target) == 0) return true;
    if (strstr(ndi_name, target) != NULL) return true;
    if (strstr(target, ndi_name) != NULL) return true;
    return false;
}

static void copy_source(const NDIlib_source_t* src, NDIlib_source_t* dst) {
    g_chosen_name[0] = '\0';
    g_chosen_url[0] = '\0';
    if (src && src->p_ndi_name) {
        snprintf(g_chosen_name, sizeof(g_chosen_name), "%s", src->p_ndi_name);
    }
    if (src && src->p_url_address) {
        snprintf(g_chosen_url, sizeof(g_chosen_url), "%s", src->p_url_address);
    }
    dst->p_ndi_name = g_chosen_name[0] ? g_chosen_name : NULL;
    dst->p_url_address = g_chosen_url[0] ? g_chosen_url : NULL;
}

static bool refresh_chosen_from_finder(NDIlib_find_instance_t finder) {
    if (!finder || !g_running) return false;
    g_ndi.find_wait(finder, 300);
    uint32_t count = 0;
    const NDIlib_source_t* sources = g_ndi.find_get_sources(finder, &count);
    if (!sources || count == 0) return false;
    for (uint32_t i = 0; i < count; i++) {
        const char* name = sources[i].p_ndi_name ? sources[i].p_ndi_name : "";
        if (name_matches(name, g_target_name)) {
            copy_source(&sources[i], &g_chosen_source);
            LOGI("fonte atualizada: %s url=%s", g_chosen_name,
                 g_chosen_url[0] ? g_chosen_url : "(null)");
            return true;
        }
    }
    return false;
}

static void ndi_reconnect(NDIlib_recv_instance_t recv) {
    if (!g_ndi.recv_connect || !recv) return;
    g_ndi.recv_connect(recv, &g_chosen_source);
}

static void* recv_loop(void* arg) {
    (void)arg;
    JNIEnv* env = NULL;
    bool attached = false;
    if (!attach_recv_env(&env, &attached)) {
        set_status("JNI attach falhou");
        g_thread_active = 0;
        return NULL;
    }

    snprintf(g_status, sizeof(g_status), "Iniciando NDI: %s", g_target_name);

    if (!load_ndi()) {
        if (attached && g_jvm) (*g_jvm)->DetachCurrentThread(g_jvm);
        g_thread_active = 0;
        return NULL;
    }

    NDIlib_find_create_t find_create;
    memset(&find_create, 0, sizeof(find_create));
    find_create.show_local_sources = true;
    NDIlib_find_instance_t finder = g_ndi.find_create(&find_create);
    if (!finder) {
        set_status("NDI finder falhou");
        if (attached && g_jvm) (*g_jvm)->DetachCurrentThread(g_jvm);
        g_thread_active = 0;
        return NULL;
    }

    bool have_chosen = false;
    while (g_running && !have_chosen) {
        int attempt;
        for (attempt = 0; attempt < 60 && g_running && !have_chosen; attempt++) {
            g_ndi.find_wait(finder, 500);
            if (!g_running) break;

            uint32_t count = 0;
            const NDIlib_source_t* sources = g_ndi.find_get_sources(finder, &count);
            if (!sources) count = 0;

            if (count > 0) {
                uint32_t i;
                for (i = 0; i < count; i++) {
                    const char* name = sources[i].p_ndi_name ? sources[i].p_ndi_name : "?";
                    LOGI("NDI source [%u]: %s", i, name);
                    if (name_matches(name, g_target_name)) {
                        copy_source(&sources[i], &g_chosen_source);
                        have_chosen = true;
                        break;
                    }
                }
                if (!have_chosen) {
                    snprintf(g_status, sizeof(g_status), "NDI: %u fonte(s), procurando %s", count, g_target_name);
                }
            } else {
                snprintf(g_status, sizeof(g_status), "Procurando NDI: %s", g_target_name);
            }
        }
        if (!have_chosen && g_running) {
            snprintf(g_status, sizeof(g_status), "NDI nao encontrado — tentando: %s", g_target_name);
            LOGI("NDI retry search for %s", g_target_name);
        }
    }

    if (!g_running || !have_chosen) {
        g_ndi.find_destroy(finder);
        if (attached && g_jvm) (*g_jvm)->DetachCurrentThread(g_jvm);
        g_thread_active = 0;
        return NULL;
    }

    NDIlib_recv_create_v3_t recv_create;
    memset(&recv_create, 0, sizeof(recv_create));
    /* Receiver vazio + connect explícito (não duplicar source no create) */
    recv_create.color_format = NDIlib_recv_color_format_fastest;
    recv_create.bandwidth = NDIlib_recv_bandwidth_highest;
    recv_create.allow_video_fields = true;
    recv_create.p_ndi_recv_name = "BCG TV Receiver";
    NDIlib_recv_instance_t recv = g_ndi.recv_create(&recv_create);
    if (!recv) {
        set_status("NDI receiver falhou");
        g_ndi.find_destroy(finder);
        if (attached && g_jvm) (*g_jvm)->DetachCurrentThread(g_jvm);
        g_thread_active = 0;
        return NULL;
    }

    if (!g_ndi.recv_connect) {
        set_status("NDI recv_connect ausente");
        g_ndi.recv_destroy(recv);
        g_ndi.find_destroy(finder);
        if (attached && g_jvm) (*g_jvm)->DetachCurrentThread(g_jvm);
        g_thread_active = 0;
        return NULL;
    }
    ndi_reconnect(recv);
    snprintf(g_status, sizeof(g_status), "Negociando: %s", g_chosen_source.p_ndi_name);
    LOGI("Connecting to %s url=%s", g_chosen_source.p_ndi_name,
         g_chosen_source.p_url_address ? g_chosen_source.p_url_address : "(null)");
    /* Android: manter finder vivo durante recepção — mDNS/_ndi depende disso */

    int video_frames = 0;
    int empty_polls = 0;
    int format_retry = 0;
    int status_changes = 0;
    int reconnect_polls = 0;
    g_diag_video_frames = 0;
    g_diag_draw_ok = 0;
    g_diag_lock_fail = 0;
    g_diag_last_type = -1;
    g_diag_none_count = 0;
    g_diag_bad_video = 0;
    g_diag_conns = -1;
    while (g_running) {
        NDIlib_video_frame_v2_t video;
        NDIlib_audio_frame_v3_t audio;
        NDIlib_metadata_frame_t metadata;
        memset(&video, 0, sizeof(video));
        memset(&audio, 0, sizeof(audio));
        memset(&metadata, 0, sizeof(metadata));
        NDIlib_frame_type_e t = g_ndi.recv_capture(recv, &video, &audio, &metadata, 1000);
        g_diag_last_type = (int)t;
        if (g_ndi.get_no_connections) g_diag_conns = g_ndi.get_no_connections(recv);

        if (t == NDIlib_frame_type_video) {
            empty_polls = 0;
            if (video.p_data && video.xres > 0 && video.yres > 0) {
                video_frames++;
                g_diag_video_frames = video_frames;
                if (video_frames == 1 || video_frames % 120 == 0) {
                    LOGI("VIDEO #%d %dx%d fourcc=0x%x conns=%d",
                         video_frames, video.xres, video.yres, video.FourCC, g_diag_conns);
                }
                deliver_frame(env, &video);
            } else {
                g_diag_bad_video++;
                LOGE("VIDEO invalido: p_data=%p %dx%d", (void*)video.p_data, video.xres, video.yres);
            }
            g_ndi.recv_free_video(recv, &video);
        } else if (t == NDIlib_frame_type_audio) {
            empty_polls = 0;
            if (g_ndi.recv_free_audio) g_ndi.recv_free_audio(recv, &audio);
        } else if (t == NDIlib_frame_type_metadata) {
            empty_polls = 0;
            if (g_ndi.recv_free_metadata) g_ndi.recv_free_metadata(recv, &metadata);
        } else if (t == NDIlib_frame_type_status_change) {
            status_changes++;
            if (g_ndi.get_no_connections) g_diag_conns = g_ndi.get_no_connections(recv);
            LOGI("status_change #%d conns=%d", status_changes, g_diag_conns);
            if (refresh_chosen_from_finder(finder)) {
                ndi_reconnect(recv);
            }
            if (g_diag_conns > 0) {
                snprintf(g_status, sizeof(g_status), "Conectado: %s", g_chosen_source.p_ndi_name);
            } else {
                snprintf(g_status, sizeof(g_status), "Negociando: %s", g_chosen_source.p_ndi_name);
            }
        } else if (t == NDIlib_frame_type_none) {
            g_diag_none_count++;
            empty_polls++;
            reconnect_polls++;
            if (g_diag_conns == 0 && reconnect_polls % 5 == 0 && refresh_chosen_from_finder(finder)) {
                ndi_reconnect(recv);
                LOGI("reconnect periodico conns=0");
            }
            if (video_frames == 0 && empty_polls == 15 && format_retry == 0 && g_running) {
                format_retry = 1;
                LOGI("sem video 15s — tenta UYVY_BGRA progressivo");
                g_ndi.recv_destroy(recv);
                memset(&recv_create, 0, sizeof(recv_create));
                recv_create.color_format = NDIlib_recv_color_format_UYVY_BGRA;
                recv_create.bandwidth = NDIlib_recv_bandwidth_highest;
                recv_create.allow_video_fields = false;
                recv_create.p_ndi_recv_name = "BCG TV Receiver";
                recv = g_ndi.recv_create(&recv_create);
                if (recv && g_ndi.recv_connect) {
                    ndi_reconnect(recv);
                    snprintf(g_status, sizeof(g_status), "Reconectado (UYVY): %s", g_chosen_source.p_ndi_name);
                }
                empty_polls = 0;
                reconnect_polls = 0;
            } else if (empty_polls == 3 || empty_polls % 10 == 0) {
                LOGI("sem frame %ds conns=%d video=%d", empty_polls, g_diag_conns, video_frames);
            }
        }
    }
    LOGI("recv_loop fim: total de video frames=%d", video_frames);

    g_ndi.recv_destroy(recv);
    g_ndi.find_destroy(finder);
    if (attached && g_jvm) (*g_jvm)->DetachCurrentThread(g_jvm);
    g_thread_active = 0;
    return NULL;
}

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* reserved) {
    (void)reserved;
    g_jvm = vm;
    JNIEnv* env = NULL;
    if ((*vm)->GetEnv(vm, (void**)&env, JNI_VERSION_1_6) != JNI_OK) return JNI_ERR;
    jclass local = (*env)->FindClass(env, "com/bostoncitygroup/bcgtv/NdiFrameDelivery");
    if (!local) {
        LOGE("NdiFrameDelivery class not found");
        return JNI_ERR;
    }
    g_delivery_class = (jclass)(*env)->NewGlobalRef(env, local);
    (*env)->DeleteLocalRef(env, local);
    g_deliver_method = (*env)->GetStaticMethodID(env, g_delivery_class, "deliverRgba", "(II[B)V");
    if (!g_deliver_method) {
        LOGE("deliverRgba method not found");
        return JNI_ERR;
    }
    return JNI_VERSION_1_6;
}

JNIEXPORT jboolean JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_isSdkAvailable0(JNIEnv* env, jobject thiz) {
    (void)env;
    (void)thiz;
    return load_ndi() ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jstring JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_getStatus0(JNIEnv* env, jobject thiz) {
    (void)thiz;
    return (*env)->NewStringUTF(env, g_status);
}

JNIEXPORT jstring JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_getDiag0(JNIEnv* env, jobject thiz) {
    (void)thiz;
    pthread_mutex_lock(&g_win_mutex);
    int win = g_window ? 1 : 0;
    pthread_mutex_unlock(&g_win_mutex);
    char diag[320];
    snprintf(diag, sizeof(diag),
             "frames=%d surface=%d draw=%d %dx%d lockfail=%d type=%d none=%d bad=%d conns=%d url=%s",
             g_diag_video_frames, win, g_diag_draw_ok,
             g_diag_vid_w, g_diag_vid_h, g_diag_lock_fail,
             g_diag_last_type, g_diag_none_count, g_diag_bad_video, g_diag_conns,
             g_chosen_url[0] ? g_chosen_url : "-");
    return (*env)->NewStringUTF(env, diag);
}

JNIEXPORT void JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_setSurface0(JNIEnv* env, jobject thiz, jobject surface) {
    (void)thiz;
    pthread_mutex_lock(&g_win_mutex);
    if (g_window) {
        ANativeWindow_release(g_window);
        g_window = NULL;
    }
    g_win_w = 0;
    g_win_h = 0;
    if (surface) {
        g_window = ANativeWindow_fromSurface(env, surface);
        LOGI("setSurface: window=%p", (void*)g_window);
    } else {
        LOGI("setSurface: limpo");
    }
    pthread_mutex_unlock(&g_win_mutex);
}

JNIEXPORT jboolean JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_startReceive0(JNIEnv* env, jobject thiz, jstring sourceName) {
    (void)thiz;
    pthread_mutex_lock(&g_ndi_op_mutex);
    if (!sourceName) {
        pthread_mutex_unlock(&g_ndi_op_mutex);
        return JNI_FALSE;
    }
    const char* utf = (*env)->GetStringUTFChars(env, sourceName, NULL);
    if (utf) {
        snprintf(g_target_name, sizeof(g_target_name), "%s", utf);
        (*env)->ReleaseStringUTFChars(env, sourceName, utf);
    } else {
        g_target_name[0] = '\0';
    }

    stop_internal();

    if (!load_ndi()) {
        pthread_mutex_unlock(&g_ndi_op_mutex);
        return JNI_FALSE;
    }

    snprintf(g_status, sizeof(g_status), "Procurando NDI: %s", g_target_name);

    g_running = 1;
    if (pthread_create(&g_thread, NULL, recv_loop, NULL) != 0) {
        g_running = 0;
        set_status("Thread NDI falhou");
        pthread_mutex_unlock(&g_ndi_op_mutex);
        return JNI_FALSE;
    }
    g_thread_active = 1;
    pthread_mutex_unlock(&g_ndi_op_mutex);
    return JNI_TRUE;
}

JNIEXPORT jstring JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_discoverSources0(JNIEnv* env, jobject thiz, jint waitMs) {
    (void)thiz;
    char json[16384];
    size_t pos = 0;
    json[0] = '[';
    pos = 1;
    json[pos] = '\0';

    pthread_mutex_lock(&g_ndi_op_mutex);

    if (g_running) {
        pthread_mutex_unlock(&g_ndi_op_mutex);
        return (*env)->NewStringUTF(env, "[]");
    }

    if (!load_ndi()) {
        pthread_mutex_unlock(&g_ndi_op_mutex);
        return (*env)->NewStringUTF(env, "[]");
    }

    NDIlib_find_create_t find_create;
    memset(&find_create, 0, sizeof(find_create));
    find_create.show_local_sources = true;
    NDIlib_find_instance_t finder = g_ndi.find_create(&find_create);
    if (!finder) {
        pthread_mutex_unlock(&g_ndi_op_mutex);
        return (*env)->NewStringUTF(env, "[]");
    }

    int budget = waitMs > 0 ? (int)waitMs : 10000;
    if (budget > 30000) budget = 30000;
    int elapsed = 0;
    uint32_t count = 0;
    const NDIlib_source_t* sources = NULL;

    while (elapsed < budget) {
        g_ndi.find_wait(finder, 500);
        elapsed += 500;
        count = 0;
        sources = g_ndi.find_get_sources(finder, &count);
        if (count > 0) break;
    }

    uint32_t i;
    for (i = 0; i < count && pos < sizeof(json) - 4; i++) {
        if (i > 0) {
            json[pos++] = ',';
            json[pos] = '\0';
        }
        const char* name = sources[i].p_ndi_name ? sources[i].p_ndi_name : "";
        append_json_string(json, sizeof(json), &pos, name);
    }

    if (pos < sizeof(json) - 2) {
        json[pos++] = ']';
        json[pos] = '\0';
    }

    g_ndi.find_destroy(finder);
    pthread_mutex_unlock(&g_ndi_op_mutex);

    LOGI("NDI discover: %u fonte(s) em %d ms", count, elapsed);
    return (*env)->NewStringUTF(env, json);
}

JNIEXPORT void JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_stopReceive0(JNIEnv* env, jobject thiz) {
    (void)env;
    (void)thiz;
    pthread_mutex_lock(&g_ndi_op_mutex);
    stop_internal();
    set_status("NDI parado");
    pthread_mutex_unlock(&g_ndi_op_mutex);
}

JNIEXPORT void JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_shutdown0(JNIEnv* env, jobject thiz) {
    (void)env;
    (void)thiz;
    pthread_mutex_lock(&g_ndi_op_mutex);
    stop_internal();
    set_status("NDI parado");
    pthread_mutex_unlock(&g_ndi_op_mutex);
}
