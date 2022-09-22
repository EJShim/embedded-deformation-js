cmake_minimum_required(VERSION 3.10)
project(edl)

set(EXECUTABLE_OUTPUT_PATH ${PROJECT_SOURCE_DIR}/../wasm)

#Sources
file(GLOB TARGET_FILES ${PROJECT_SOURCE_DIR}/*.cpp)
list(APPEND MODULES ${TARGET_FILES})

foreach(MODULE_FILE ${TARGET_FILES})
    get_filename_component(LIBRARY_NAME ${MODULE_FILE} NAME_WE)
    add_executable(${LIBRARY_NAME} ${MODULE_FILE})

    list(APPEND emscripten_options
        "SHELL:-s EXPORT_ES6=1"
        "SHELL:-s MODULARIZE=1"
        "SHELL:-s WASM=1"
        "SHELL:-s EXPORTED_RUNTIME_METHODS=ccall"
    )

    target_compile_options(${LIBRARY_NAME} PUBLIC ${emscripten_options})
    target_link_options(${LIBRARY_NAME} PUBLIC ${emscripten_options})
    # target_link_libraries(${LIBRARY_NAME} embind})
endforeach()
    