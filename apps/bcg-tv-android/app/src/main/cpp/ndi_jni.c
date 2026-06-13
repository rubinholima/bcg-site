#include <android/log.h>
#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <dlfcn.h>
#include <jni.h>
#include <pthread.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include <strings.h>
#include <stdint.h>

#define LOG_TAG "BcgNdi"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

#define STATUS_MAX 512
#define TARGET_MAX 512
#define NAME_MAX 512

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
} NDIlib_recv_color_format_e;

typedef enum {
    NDIlib_recv_bandwidth_highest = 100,
} NDIlib_recv_bandwidth_e;

typedef struct {
    const NDIlib_source_t* source_to_connect_to;
    NDIlib_recv_color_format_e color_format;
    NDIlib_recv_bandwidth_e bandwidth;
    bool allow_video_fields;
    const char* p_ndi_recv_name;
} NDIlib_recv_create_v3_t;

typedef enum {
    NDIlib_frame_type_none = 0,
    NDIlib_frame_type_video = 1,
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
typedef NDIlib_frame_type_e (*ndi_recv_capture_fn)(NDIlib_recv_instance_t, NDIlib_video_frame_v2_t*, void*, void*, uint32_t);
typedef void (*ndi_recv_free_video_fn)(NDIlib_recv_instance_t, const NDIlib_video_frame_v2_t*);

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
    bool ok;
} NdiApi;

static NdiApi g_ndi;
static volatile int g_running = 0;
static pthread_t g_thread;
static int g_thread_active = 0;
static pthread_mutex_t g_window_mutex = PTHREAD_MUTEX_INITIALIZER;
static ANativeWindow* g_window = NULL;
static char g_target_name[TARGET_MAX];
static char g_status[STATUS_MAX] = "NDI nao iniciado";
static char g_chosen_name[NAME_MAX];
static char g_chosen_url[NAME_MAX];
static NDIlib_source_t g_chosen_source;

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

static bool load_ndi(void) {
    if (g_ndi.ok) return true;
    memset(&g_ndi, 0, sizeof(g_ndi));
    g_ndi.lib = dlopen("libndi.so", RTLD_NOW);
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
    LOAD("NDIlib_recv_connect", recv_connect);
    LOAD("NDIlib_recv_capture_v3", recv_capture);
    LOAD("NDIlib_recv_free_video_v2", recv_free_video);
#undef LOAD
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

static void render_bgra(ANativeWindow* window, const NDIlib_video_frame_v2_t* frame) {
    if (!window || !frame || !frame->p_data || frame->xres <= 0 || frame->yres <= 0) return;
    if (ANativeWindow_setBuffersGeometry(window, frame->xres, frame->yres, WINDOW_FORMAT_RGBA_8888) != 0) {
        return;
    }
    ANativeWindow_Buffer buffer;
    if (ANativeWindow_lock(window, &buffer, NULL) != 0) return;
    const int dst_stride = buffer.stride * 4;
    const int copy_width = frame->xres * 4;
    const int copy_height = frame->yres;
    uint8_t* dst = (uint8_t*)buffer.bits;
    const uint8_t* src = frame->p_data;
    const int src_stride = frame->line_stride_in_bytes;
    int y;
    for (y = 0; y < copy_height && y < buffer.height; y++) {
        memcpy(dst + y * dst_stride, src + y * src_stride, (size_t)copy_width);
    }
    ANativeWindow_unlockAndPost(window);
}

static void* recv_loop(void* arg) {
    (void)arg;
    snprintf(g_status, sizeof(g_status), "Iniciando NDI: %s", g_target_name);

    if (!load_ndi()) return NULL;

    NDIlib_find_create_t find_create;
    memset(&find_create, 0, sizeof(find_create));
    find_create.show_local_sources = true;
    NDIlib_find_instance_t finder = g_ndi.find_create(&find_create);
    if (!finder) {
        set_status("NDI finder falhou");
        return NULL;
    }

    bool have_chosen = false;
    int attempt;
    for (attempt = 0; attempt < 120 && g_running; attempt++) {
        g_ndi.find_wait(finder, 1000);
        uint32_t count = 0;
        const NDIlib_source_t* sources = g_ndi.find_get_sources(finder, &count);

        if (count > 0) {
            uint32_t i;
            for (i = 0; i < count; i++) {
                const char* name = sources[i].p_ndi_name ? sources[i].p_ndi_name : "?";
                LOGI("NDI source [%u]: %s", i, name);
                if (!have_chosen && name_matches(name, g_target_name)) {
                    copy_source(&sources[i], &g_chosen_source);
                    have_chosen = true;
                    break;
                }
            }
            if (have_chosen) break;
            snprintf(g_status, sizeof(g_status), "NDI: %u fonte(s), procurando %s", count, g_target_name);
        } else {
            snprintf(g_status, sizeof(g_status), "Procurando NDI: %s", g_target_name);
        }
    }

    if (!have_chosen) {
        snprintf(g_status, sizeof(g_status), "Fonte NDI nao encontrada: %s", g_target_name);
        g_ndi.find_destroy(finder);
        return NULL;
    }

    NDIlib_recv_create_v3_t recv_create;
    memset(&recv_create, 0, sizeof(recv_create));
    recv_create.source_to_connect_to = &g_chosen_source;
    recv_create.color_format = NDIlib_recv_color_format_BGRX_BGRA;
    recv_create.bandwidth = NDIlib_recv_bandwidth_highest;
    recv_create.allow_video_fields = false;
    recv_create.p_ndi_recv_name = "BCG TV Receiver";
    NDIlib_recv_instance_t recv = g_ndi.recv_create(&recv_create);
    if (!recv) {
        set_status("NDI receiver falhou");
        g_ndi.find_destroy(finder);
        return NULL;
    }

    g_ndi.recv_connect(recv, &g_chosen_source);
    snprintf(g_status, sizeof(g_status), "Conectado: %s", g_chosen_source.p_ndi_name);
    LOGI("Connected to %s", g_chosen_source.p_ndi_name);
    g_ndi.find_destroy(finder);

    while (g_running) {
        NDIlib_video_frame_v2_t video;
        memset(&video, 0, sizeof(video));
        NDIlib_frame_type_e t = g_ndi.recv_capture(recv, &video, NULL, NULL, 1000);
        if (t == NDIlib_frame_type_video) {
            pthread_mutex_lock(&g_window_mutex);
            ANativeWindow* window = g_window;
            if (window) {
                ANativeWindow_acquire(window);
            }
            pthread_mutex_unlock(&g_window_mutex);
            if (window) {
                render_bgra(window, &video);
                ANativeWindow_release(window);
            }
            g_ndi.recv_free_video(recv, &video);
        } else if (t == NDIlib_frame_type_status_change) {
            g_ndi.recv_connect(recv, &g_chosen_source);
        }
    }

    g_ndi.recv_destroy(recv);
    return NULL;
}

JNIEXPORT jboolean JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_isSdkAvailable(JNIEnv* env, jobject thiz) {
    (void)env;
    (void)thiz;
    return load_ndi() ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jstring JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_getStatus(JNIEnv* env, jobject thiz) {
    (void)thiz;
    return (*env)->NewStringUTF(env, g_status);
}

JNIEXPORT void JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_setSurface(JNIEnv* env, jobject thiz, jobject surface) {
    (void)thiz;
    pthread_mutex_lock(&g_window_mutex);
    if (g_window) {
        ANativeWindow_release(g_window);
        g_window = NULL;
    }
    if (surface) {
        g_window = ANativeWindow_fromSurface(env, surface);
    }
    pthread_mutex_unlock(&g_window_mutex);
}

JNIEXPORT jboolean JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_startReceive(JNIEnv* env, jobject thiz, jstring sourceName) {
    (void)thiz;
    if (!sourceName) return JNI_FALSE;
    const char* utf = (*env)->GetStringUTFChars(env, sourceName, NULL);
    if (utf) {
        snprintf(g_target_name, sizeof(g_target_name), "%s", utf);
        (*env)->ReleaseStringUTFChars(env, sourceName, utf);
    } else {
        g_target_name[0] = '\0';
    }

    stop_internal();

    if (!load_ndi()) return JNI_FALSE;

    snprintf(g_status, sizeof(g_status), "Procurando NDI: %s", g_target_name);

    g_running = 1;
    if (pthread_create(&g_thread, NULL, recv_loop, NULL) != 0) {
        g_running = 0;
        set_status("Thread NDI falhou");
        return JNI_FALSE;
    }
    g_thread_active = 1;
    return JNI_TRUE;
}

JNIEXPORT void JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_stopReceive(JNIEnv* env, jobject thiz) {
    (void)env;
    (void)thiz;
    stop_internal();
    set_status("NDI parado");
}

JNIEXPORT void JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_shutdown(JNIEnv* env, jobject thiz) {
    (void)env;
    (void)thiz;
    stop_internal();
    set_status("NDI parado");
    /* Nao chamar NDIlib_destroy/dlclose aqui — quebra reconexao na mesma sessao. */
}
