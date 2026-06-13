#include <android/log.h>
#include <android/native_window.h>
#include <android/native_window_jni.h>
#include <dlfcn.h>
#include <jni.h>
#include <pthread.h>
#include <string.h>
#include <strings.h>
#include <unistd.h>
#include <atomic>
#include <string>

#define LOG_TAG "BcgNdi"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

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

typedef bool (*ndi_initialize_fn)();
typedef void (*ndi_destroy_fn)();
typedef NDIlib_find_instance_t (*ndi_find_create_fn)(const NDIlib_find_create_t*);
typedef void (*ndi_find_destroy_fn)(NDIlib_find_instance_t);
typedef bool (*ndi_find_wait_fn)(NDIlib_find_instance_t, uint32_t);
typedef const NDIlib_source_t* (*ndi_find_get_sources_fn)(NDIlib_find_instance_t, uint32_t*, uint32_t);
typedef NDIlib_recv_instance_t (*ndi_recv_create_fn)(const NDIlib_recv_create_v3_t*);
typedef void (*ndi_recv_destroy_fn)(NDIlib_recv_instance_t);
typedef void (*ndi_recv_connect_fn)(NDIlib_recv_instance_t, const NDIlib_source_t*);
typedef NDIlib_frame_type_e (*ndi_recv_capture_fn)(NDIlib_recv_instance_t, NDIlib_video_frame_v2_t*, void*, void*, uint32_t);
typedef void (*ndi_recv_free_video_fn)(NDIlib_recv_instance_t, const NDIlib_video_frame_v2_t*);

struct NdiApi {
    void* lib = nullptr;
    ndi_initialize_fn initialize = nullptr;
    ndi_destroy_fn destroy = nullptr;
    ndi_find_create_fn find_create = nullptr;
    ndi_find_destroy_fn find_destroy = nullptr;
    ndi_find_wait_fn find_wait = nullptr;
    ndi_find_get_sources_fn find_get_sources = nullptr;
    ndi_recv_create_fn recv_create = nullptr;
    ndi_recv_destroy_fn recv_destroy = nullptr;
    ndi_recv_connect_fn recv_connect = nullptr;
    ndi_recv_capture_fn recv_capture = nullptr;
    ndi_recv_free_video_fn recv_free_video = nullptr;
    bool ok = false;
};

static NdiApi g_ndi;
static std::atomic<bool> g_running{false};
static pthread_t g_thread{};
static ANativeWindow* g_window = nullptr;
static std::string g_target_name;
static std::string g_status = "NDI não iniciado";

static void stop_internal() {
    g_running.store(false);
    if (g_thread) {
        pthread_join(g_thread, nullptr);
        g_thread = {};
    }
    if (g_window) {
        ANativeWindow_release(g_window);
        g_window = nullptr;
    }
}

static bool load_ndi() {
    if (g_ndi.ok) return true;
    g_ndi.lib = dlopen("libndi.so", RTLD_NOW);
    if (!g_ndi.lib) {
        LOGE("dlopen libndi.so failed: %s", dlerror());
        g_status = "libndi.so ausente — rode setup-ndi-sdk.ps1";
        return false;
    }
#define LOAD(sym, fn)                                                                                \
    g_ndi.fn = reinterpret_cast<decltype(g_ndi.fn)>(dlsym(g_ndi.lib, sym));                        \
    if (!g_ndi.fn) {                                                                                 \
        LOGE("dlsym %s failed", sym);                                                                \
        return false;                                                                                \
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
        g_status = "NDIlib_initialize falhou";
        return false;
    }
    g_ndi.ok = true;
    return true;
}

static bool name_matches(const char* ndi_name, const std::string& target) {
    if (!ndi_name || target.empty()) return false;
    if (strcasecmp(ndi_name, target.c_str()) == 0) return true;
    if (strstr(ndi_name, target.c_str()) != nullptr) return true;
    return false;
}

static void render_bgra(ANativeWindow* window, const NDIlib_video_frame_v2_t* frame) {
    if (!window || !frame || !frame->p_data || frame->xres <= 0 || frame->yres <= 0) return;
    ANativeWindow_setBuffersGeometry(window, frame->xres, frame->yres, WINDOW_FORMAT_RGBA_8888);
    ANativeWindow_Buffer buffer;
    if (ANativeWindow_lock(window, &buffer, nullptr) != 0) return;
    const int dst_stride = buffer.stride * 4;
    const int copy_width = frame->xres * 4;
    const int copy_height = frame->yres;
    uint8_t* dst = static_cast<uint8_t*>(buffer.bits);
    const uint8_t* src = frame->p_data;
    const int src_stride = frame->line_stride_in_bytes;
    for (int y = 0; y < copy_height && y < buffer.height; y++) {
        memcpy(dst + y * dst_stride, src + y * src_stride, copy_width);
    }
    ANativeWindow_unlockAndPost(window);
}

static void* recv_loop(void*) {
    if (!load_ndi()) return nullptr;

    NDIlib_find_create_t find_create{};
    find_create.show_local_sources = true;
    NDIlib_find_instance_t finder = g_ndi.find_create(&find_create);
    if (!finder) {
        g_status = "NDI finder falhou";
        return nullptr;
    }

    const NDIlib_source_t* chosen = nullptr;
    for (int attempt = 0; attempt < 60 && g_running.load(); attempt++) {
        g_ndi.find_wait(finder, 1000);
        uint32_t count = 0;
        const NDIlib_source_t* sources = g_ndi.find_get_sources(finder, &count, 0);
        for (uint32_t i = 0; i < count; i++) {
            if (name_matches(sources[i].p_ndi_name, g_target_name)) {
                chosen = &sources[i];
                break;
            }
        }
        if (chosen) break;
        g_status = "Procurando NDI: " + g_target_name;
    }

    if (!chosen) {
        g_status = "Fonte NDI não encontrada: " + g_target_name;
        g_ndi.find_destroy(finder);
        return nullptr;
    }

    NDIlib_recv_create_v3_t recv_create{};
    recv_create.color_format = NDIlib_recv_color_format_BGRX_BGRA;
    recv_create.bandwidth = NDIlib_recv_bandwidth_highest;
    recv_create.allow_video_fields = false;
    recv_create.p_ndi_recv_name = "BCG TV Receiver";
    NDIlib_recv_instance_t recv = g_ndi.recv_create(&recv_create);
    if (!recv) {
        g_status = "NDI receiver falhou";
        g_ndi.find_destroy(finder);
        return nullptr;
    }

    g_ndi.recv_connect(recv, chosen);
    g_status = std::string("Conectado: ") + chosen->p_ndi_name;
    LOGI("Connected to %s", chosen->p_ndi_name);

    while (g_running.load()) {
        NDIlib_video_frame_v2_t video{};
        NDIlib_frame_type_e t = g_ndi.recv_capture(recv, &video, nullptr, nullptr, 1000);
        if (t == NDIlib_frame_type_video) {
            ANativeWindow* window = g_window;
            if (window) render_bgra(window, &video);
            g_ndi.recv_free_video(recv, &video);
        } else if (t == NDIlib_frame_type_status_change) {
            g_ndi.recv_connect(recv, chosen);
        }
    }

    g_ndi.recv_destroy(recv);
    g_ndi.find_destroy(finder);
    return nullptr;
}

extern "C" {

JNIEXPORT jboolean JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_isSdkAvailable(JNIEnv*, jobject) {
    return load_ndi() ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jstring JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_getStatus(JNIEnv* env, jobject) {
    return env->NewStringUTF(g_status.c_str());
}

JNIEXPORT void JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_setSurface(JNIEnv* env, jobject, jobject surface) {
    if (g_window) {
        ANativeWindow_release(g_window);
        g_window = nullptr;
    }
    if (surface) {
        g_window = ANativeWindow_fromSurface(env, surface);
    }
}

JNIEXPORT jboolean JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_startReceive(JNIEnv* env, jobject, jstring sourceName) {
    if (!sourceName) return JNI_FALSE;
    const char* utf = env->GetStringUTFChars(sourceName, nullptr);
    g_target_name = utf ? utf : "";
    env->ReleaseStringUTFChars(sourceName, utf);

    stop_internal();

    if (!load_ndi()) return JNI_FALSE;

    g_running.store(true);
    if (pthread_create(&g_thread, nullptr, recv_loop, nullptr) != 0) {
        g_running.store(false);
        g_status = "Thread NDI falhou";
        return JNI_FALSE;
    }
    return JNI_TRUE;
}

JNIEXPORT void JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_stopReceive(JNIEnv*, jobject) {
    stop_internal();
    g_status = "NDI parado";
}

JNIEXPORT void JNICALL
Java_com_bostoncitygroup_bcgtv_NdiNative_shutdown(JNIEnv*, jobject) {
    stop_internal();
    if (g_ndi.ok) {
        g_ndi.destroy();
        g_ndi.ok = false;
    }
    if (g_ndi.lib) {
        dlclose(g_ndi.lib);
        g_ndi.lib = nullptr;
    }
}

} // extern "C"
