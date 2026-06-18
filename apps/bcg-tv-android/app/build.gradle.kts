plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.bostoncitygroup.bcgtv"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.bostoncitygroup.bcgtv"
        minSdk = 24
        targetSdk = 35
        versionCode = 12
        versionName = "1.3.2"
        buildConfigField("String", "PLAYER_BASE_URL", "\"https://www.bostoncitygroup.biz/tv/\"")
        buildConfigField("String", "API_BASE_URL", "\"https://www.bostoncitygroup.biz/api/public/boston-tv/\"")
        buildConfigField("String", "STREAM_ORIGIN", "\"https://origin.bostoncitygroup.biz\"")
        ndk {
            abiFilters += listOf("arm64-v8a", "armeabi-v7a")
        }
        externalNativeBuild {
            cmake {
                arguments += listOf("-DANDROID_STL=none")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        buildConfig = true
        viewBinding = true
    }

    externalNativeBuild {
        cmake {
            path = file("src/main/cpp/CMakeLists.txt")
        }
    }
}

tasks.register("checkNdiLib") {
    doLast {
        listOf("arm64-v8a", "armeabi-v7a").forEach { abi ->
            val lib = file("src/main/jniLibs/$abi/libndi.so")
            if (!lib.exists()) {
                throw GradleException(
                    "libndi.so ausente em jniLibs/$abi. Rode: .\\scripts\\setup-ndi-sdk.ps1 -SdkRoot \"<pasta NDI Advanced SDK for Android>\"",
                )
            }
        }
    }
}

tasks.named("preBuild") {
    dependsOn("checkNdiLib")
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.2.0")
    implementation("androidx.leanback:leanback:1.0.0")
    implementation("androidx.media3:media3-exoplayer:1.5.1")
    implementation("androidx.media3:media3-exoplayer-hls:1.5.1")
    implementation("androidx.media3:media3-ui:1.5.1")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("io.coil-kt:coil:2.7.0")
}
