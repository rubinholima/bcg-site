cmake_minimum_required(VERSION 3.22.1)
project("bcg_ndi")

add_library(bcg_ndi SHARED ndi_jni.cpp)
find_library(log-lib log)
find_library(android-lib android)
find_library(dl-lib dl)
target_link_libraries(bcg_ndi ${log-lib} ${android-lib} ${dl-lib})
