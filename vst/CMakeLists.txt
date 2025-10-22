cmake_minimum_required(VERSION 3.14)

project(UnderlayVST VERSION 1.0.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Disable VST validator (it tries to run the plugin which needs the UI)
set(SMTG_RUN_VST_VALIDATOR OFF CACHE BOOL "Run VST validator" FORCE)

# VST3 SDK path - download this from Steinberg
# Download from: https://github.com/steinbergmedia/vst3sdk
set(VST3_SDK_PATH "${CMAKE_CURRENT_SOURCE_DIR}/vst3sdk" CACHE PATH "Path to VST3 SDK")

if(NOT EXISTS "${VST3_SDK_PATH}")
    message(FATAL_ERROR "VST3 SDK not found at ${VST3_SDK_PATH}. Please download it from https://github.com/steinbergmedia/vst3sdk")
endif()

# Add VST3 SDK
add_subdirectory(${VST3_SDK_PATH} vst3sdk_build)

# Source files
set(SOURCES
    src/UnderlayVST.cpp
    src/UnderlayController.mm
    src/WebViewBridge.mm
    src/PluginProcessor.cpp
)

# Add platform-specific entry point
if(APPLE)
    list(APPEND SOURCES "${VST3_SDK_PATH}/public.sdk/source/main/macmain.cpp")
elseif(WIN32)
    list(APPEND SOURCES "${VST3_SDK_PATH}/public.sdk/source/main/dllmain.cpp")
endif()

set(HEADERS
    src/UnderlayVST.h
    src/UnderlayController.h
    src/WebViewBridge.h
    src/PluginIDs.h
    src/SharedAudioBuffer.h
    src/DebugLog.h
)

# Create VST3 plugin target
smtg_add_vst3plugin(UnderlayVST ${SOURCES} ${HEADERS})

# Set plugin properties
target_compile_definitions(UnderlayVST PUBLIC
    $<$<CONFIG:Debug>:DEBUG=1>
    $<$<CONFIG:Release>:NDEBUG=1>
)

# Include directories
target_include_directories(UnderlayVST PRIVATE
    ${CMAKE_CURRENT_SOURCE_DIR}/src
)

# Link libraries
target_link_libraries(UnderlayVST PRIVATE
    sdk
    base
)

# Platform-specific settings
if(APPLE)
    target_link_libraries(UnderlayVST PRIVATE
        "-framework Foundation"
        "-framework AppKit"
        "-framework WebKit"
        "-framework CoreFoundation"
    )
    # Enable ARC for Objective-C++ files
    set_source_files_properties(src/WebViewBridge.mm PROPERTIES
        COMPILE_FLAGS "-fobjc-arc"
    )
    set_source_files_properties(src/UnderlayController.mm PROPERTIES
        COMPILE_FLAGS "-fobjc-arc"
    )
    set_target_properties(UnderlayVST PROPERTIES
        BUNDLE TRUE
        BUNDLE_EXTENSION "vst3"
        XCODE_ATTRIBUTE_WRAPPER_EXTENSION "vst3"
        MACOSX_BUNDLE_INFO_PLIST "${CMAKE_CURRENT_SOURCE_DIR}/Info.plist.in"
    )
    smtg_target_set_exported_symbols(UnderlayVST "${VST3_SDK_PATH}/public.sdk/source/main/macexport.exp")

    # Code signing support
    # Set CODESIGN_IDENTITY environment variable to enable
    # Example: export CODESIGN_IDENTITY="Developer ID Application: (TEAMID)"
    if(DEFINED ENV{CODESIGN_IDENTITY})
        set(CODESIGN_ID "$ENV{CODESIGN_IDENTITY}")
        message(STATUS "Code signing enabled with identity: ${CODESIGN_ID}")

        # Add post-build command to sign the bundle
        add_custom_command(TARGET UnderlayVST POST_BUILD
            COMMAND codesign --force --sign "${CODESIGN_ID}"
                --options runtime
                --timestamp
                --deep
                "$<TARGET_BUNDLE_DIR:UnderlayVST>"
            COMMAND codesign --verify --deep --strict "$<TARGET_BUNDLE_DIR:UnderlayVST>"
            COMMENT "Code signing UnderlayVST.vst3"
        )
    else()
        message(STATUS "Code signing disabled. Set CODESIGN_IDENTITY to enable.")
    endif()
elseif(WIN32)
    target_link_libraries(UnderlayVST PRIVATE
        Ole32
        Shell32
    )
endif()

# Copy Next.js build output to VST bundle Resources
add_custom_command(TARGET UnderlayVST POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
        "${CMAKE_SOURCE_DIR}/../out"
        "$<TARGET_BUNDLE_DIR:UnderlayVST>/Contents/Resources/out"
    COMMENT "Copying Next.js build output to VST bundle"
)

# Set plugin information
smtg_target_set_bundle(UnderlayVST
    BUNDLE_IDENTIFIER "com.underlay.vst3"
    COMPANY_NAME "Underlay"
)

# Install target
if(APPLE)
    set(VST3_INSTALL_PATH "~/Library/Audio/Plug-Ins/VST3")
elseif(WIN32)
    set(VST3_INSTALL_PATH "$ENV{CommonProgramFiles}/VST3")
endif()

install(TARGETS UnderlayVST DESTINATION ${VST3_INSTALL_PATH})
