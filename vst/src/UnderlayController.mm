#include "UnderlayController.h"
#include "UnderlayVST.h"
#include "WebViewBridge.h"
#include "DebugLog.h"
#include "pluginterfaces/base/ibstream.h"
#include "pluginterfaces/base/ustring.h"
#include "base/source/fstreamer.h"
#include <cstring>
#include <iostream>
#include <thread>
#include <chrono>
#include <sstream>
#include <cmath>

#ifdef __APPLE__
#include <CoreFoundation/CoreFoundation.h>
#include <dispatch/dispatch.h>
#include <mach/mach_time.h>
#include <limits.h>
#include <unistd.h>
#endif

namespace Underlay {

// Helper function to get HTML path from plugin bundle
static std::string getHTMLPath() {
#ifdef __APPLE__
    // Get the plugin bundle
    CFBundleRef bundle = CFBundleGetBundleWithIdentifier(CFSTR("com.underlay.vst3"));
    if (!bundle) {
        DEBUG_LOG("ERROR: Could not find plugin bundle");
        return "";
    }

    CFURLRef bundleURL = CFBundleCopyBundleURL(bundle);
    char bundlePath[PATH_MAX];
    if (!CFURLGetFileSystemRepresentation(bundleURL, true, (UInt8*)bundlePath, PATH_MAX)) {
        CFRelease(bundleURL);
        return "";
    }
    CFRelease(bundleURL);

    // Try production path first (Resources/out/index.html)
    std::string htmlPath = std::string(bundlePath) + "/Contents/Resources/out/index.html";

    // Check if file exists
    if (access(htmlPath.c_str(), R_OK) == 0) {
        DEBUG_LOG("Found production HTML: " << htmlPath);
        return htmlPath;
    }

    // Fallback to development path (project root/out/index.html)
    // From UnderlayVST.vst3 -> project root = 5 levels up
    htmlPath = std::string(bundlePath) + "/../../../../../out/index.html";

    // Resolve symlinks
    char realPath[PATH_MAX];
    if (realpath(htmlPath.c_str(), realPath)) {
        htmlPath = realPath;
        if (access(htmlPath.c_str(), R_OK) == 0) {
            DEBUG_LOG("Found development HTML: " << htmlPath);
            return htmlPath;
        }
    }

    DEBUG_LOG("ERROR: Could not find index.html in bundle or development location");
    return "";
#else
    return "";
#endif
}

//------------------------------------------------------------------------
// UnderlayEditorView Implementation
//------------------------------------------------------------------------

UnderlayEditorView::UnderlayEditorView(WebViewBridge* sharedWebView, UnderlayController* controller)
    : webViewBridge_(sharedWebView)
    , controller_(controller)
    , frame_(nullptr)
    , refCount_(1)
    , isAttached_(false)
    , lastZoomFactor_(1.0)
    , resizeTimer_(nullptr) {
    DEBUG_LOG("EditorView created with WebView: " << (sharedWebView ? "valid" : "NULL"));

    // Get saved window size from controller
    int savedWidth = 1280;
    int savedHeight = 800;
    if (controller_) {
        controller_->getWindowSize(savedWidth, savedHeight);
        DEBUG_LOG("Using saved window size: " << savedWidth << "x" << savedHeight);
    }

    // Set window size from saved state
    rect_.left = 0;
    rect_.top = 0;
    rect_.right = savedWidth;
    rect_.bottom = savedHeight;
}

UnderlayEditorView::~UnderlayEditorView() {
    DEBUG_LOG("EditorView destroyed");
    if (isAttached_ && webViewBridge_) {
        webViewBridge_->detachFromParent();
    }
}

Steinberg::tresult PLUGIN_API UnderlayEditorView::isPlatformTypeSupported(Steinberg::FIDString type) {
    DEBUG_LOG("isPlatformTypeSupported called with type: " << (type ? type : "NULL"));

    // Only support NSView on macOS
    if (type && strcmp(type, "NSView") == 0) {
        return Steinberg::kResultTrue;
    }

    return Steinberg::kResultFalse;
}

Steinberg::tresult PLUGIN_API UnderlayEditorView::attached(void* parent, Steinberg::FIDString type) {
    DEBUG_LOG("attached() called with parent=" << parent << ", type=" << (type ? type : "NULL"));

    if (webViewBridge_) {
        // Initialize WebView if not already done
        if (!webViewBridge_->isInitialized()) {
            // Get HTML path from bundle
            std::string htmlPath = getHTMLPath();
            DEBUG_LOG("HTML path: " << htmlPath);

            if (!webViewBridge_->initialize(parent, htmlPath)) {
                DEBUG_LOG("ERROR: Failed to initialize WebView!");
                return Steinberg::kResultFalse;
            }
        } else {
            // Already initialized, just attach
            webViewBridge_->attachToParent(parent);
        }

        webViewBridge_->resize(rect_.getWidth(), rect_.getHeight());
        isAttached_ = true;
        return Steinberg::kResultTrue;
    }

    DEBUG_LOG("ERROR: No WebView available!");
    return Steinberg::kResultFalse;
}

Steinberg::tresult PLUGIN_API UnderlayEditorView::removed() {
    DEBUG_LOG("removed() called");
    if (webViewBridge_ && isAttached_) {
        webViewBridge_->detachFromParent();
        isAttached_ = false;
    }
    return Steinberg::kResultTrue;
}

Steinberg::tresult PLUGIN_API UnderlayEditorView::getSize(Steinberg::ViewRect* size) {
    if (size) {
        *size = rect_;
        return Steinberg::kResultTrue;
    }
    return Steinberg::kResultFalse;
}

Steinberg::tresult PLUGIN_API UnderlayEditorView::onSize(Steinberg::ViewRect* newSize) {
    if (newSize) {
        rect_ = *newSize;
        if (webViewBridge_ && isAttached_) {
            int newWidth = rect_.getWidth();
            int newHeight = rect_.getHeight();

            // Save the new window size to controller state
            if (controller_) {
                controller_->setWindowSize(newWidth, newHeight);
            }

            // Resize the WebView frame
            webViewBridge_->resize(newWidth, newHeight);

            // Calculate zoom factor to fit content
            const int DEFAULT_WIDTH = 1280;
            const int DEFAULT_HEIGHT = 800;

            double zoomWidth = static_cast<double>(newWidth) / DEFAULT_WIDTH;
            double zoomHeight = static_cast<double>(newHeight) / DEFAULT_HEIGHT;

            // Use smaller ratio to maintain aspect
            double zoomFactor = std::min(zoomWidth, zoomHeight);

            // Clamp to size constraints (30% to 100%)
            zoomFactor = std::max(0.3, std::min(1.0, zoomFactor));

            // Update zoom if changed significantly
            if (std::abs(zoomFactor - lastZoomFactor_) > 0.01) {
                webViewBridge_->setZoomFactor(zoomFactor);
                lastZoomFactor_ = zoomFactor;
                DEBUG_LOG("Resized to " << newWidth << "x" << newHeight
                         << " with zoom " << zoomFactor);

                // Update viewport scale to match zoom
                std::ostringstream viewportJS;
                viewportJS << "(() => {"
                          << "  let meta = document.querySelector('meta[name=\"viewport\"]');"
                          << "  if (meta) {"
                          << "    meta.content = 'width=1280, initial-scale=" << zoomFactor
                          << ", minimum-scale=0.3, maximum-scale=1, user-scalable=yes';"
                          << "  }"
                          << "})();";
                webViewBridge_->executeJavaScript(viewportJS.str());
            }
        }
        return Steinberg::kResultTrue;
    }
    return Steinberg::kResultFalse;
}

Steinberg::tresult PLUGIN_API UnderlayEditorView::onFocus(Steinberg::TBool state) {
    return Steinberg::kResultTrue;
}

Steinberg::tresult PLUGIN_API UnderlayEditorView::setFrame(Steinberg::IPlugFrame* frame) {
    frame_ = frame;
    return Steinberg::kResultTrue;
}

Steinberg::tresult PLUGIN_API UnderlayEditorView::checkSizeConstraint(Steinberg::ViewRect* rect) {
    if (rect) {
        // Minimum: 800x500 (16:10)
        if (rect->getWidth() < 800) rect->right = rect->left + 800;
        if (rect->getHeight() < 500) rect->bottom = rect->top + 500;

        // Maximum: 1920x1200 (16:10)
        if (rect->getWidth() > 1920) rect->right = rect->left + 1920;
        if (rect->getHeight() > 1200) rect->bottom = rect->top + 1200;

        return Steinberg::kResultTrue;
    }
    return Steinberg::kResultFalse;
}

// IUnknown implementation
Steinberg::tresult PLUGIN_API UnderlayEditorView::queryInterface(const Steinberg::TUID _iid, void** obj) {
    QUERY_INTERFACE(_iid, obj, Steinberg::FUnknown::iid, Steinberg::IPlugView)
    QUERY_INTERFACE(_iid, obj, Steinberg::IPlugView::iid, Steinberg::IPlugView)
    *obj = nullptr;
    return Steinberg::kNoInterface;
}

Steinberg::uint32 PLUGIN_API UnderlayEditorView::addRef() {
    return ++refCount_;
}

Steinberg::uint32 PLUGIN_API UnderlayEditorView::release() {
    if (--refCount_ == 0) {
        delete this;
        return 0;
    }
    return refCount_;
}

//------------------------------------------------------------------------
// UnderlayController Implementation
//------------------------------------------------------------------------

UnderlayController::UnderlayController()
    : webViewBridge_(nullptr)
    , webViewInitialized_(false)
    , savedWindowWidth_(1280)
    , savedWindowHeight_(800) {
    DEBUG_LOG("UnderlayController constructor called");
}

UnderlayController::~UnderlayController() {
    DEBUG_LOG("UnderlayController destructor called");
}

WebViewBridge* UnderlayController::getWebViewBridge() {
    if (!webViewBridge_) {
        webViewBridge_ = std::make_unique<WebViewBridge>();

        // Set parameter callback for UI to host changes
        webViewBridge_->setParameterCallback([this](int paramId, double normalizedValue) {
            // Perform edit to notify host of parameter change from UI
            if (componentHandler) {
                componentHandler->beginEdit(paramId);
                setParamNormalized(paramId, normalizedValue);
                componentHandler->performEdit(paramId, normalizedValue);
                componentHandler->endEdit(paramId);
                DEBUG_LOG("[Controller] UI changed param " << paramId << " to " << normalizedValue);
            }
        });

        // WebView initialized when createView is called
    }
    return webViewBridge_.get();
}

Steinberg::tresult PLUGIN_API UnderlayController::initialize(Steinberg::FUnknown* context) {
    DEBUG_LOG("UnderlayController::initialize() called");
    Steinberg::tresult result = EditController::initialize(context);
    if (result != Steinberg::kResultOk) {
        DEBUG_LOG("ERROR: EditController::initialize() failed");
        return result;
    }
    DEBUG_LOG("EditController::initialize() succeeded, setting up parameters");

    // Define all parameters
    using namespace Steinberg::Vst;

    // BPM (60-200)
    parameters.addParameter(STR16("BPM"), STR16("bpm"), 0, 0.5,
                           ParameterInfo::kCanAutomate, kParamBPM);

    // Density (0-1)
    parameters.addParameter(STR16("Density"), STR16(""), 0, 0.0,
                           ParameterInfo::kCanAutomate, kParamDensity);

    // Brightness (0-1)
    parameters.addParameter(STR16("Brightness"), STR16(""), 0, 0.0,
                           ParameterInfo::kCanAutomate, kParamBrightness);

    // Guidance (0-6)
    parameters.addParameter(STR16("Guidance"), STR16(""), 0, 0.67,
                           ParameterInfo::kCanAutomate, kParamGuidance);

    // Temperature (0-3)
    parameters.addParameter(STR16("Temperature"), STR16(""), 0, 0.37,
                           ParameterInfo::kCanAutomate, kParamTemperature);

    // Top K (1-1000)
    parameters.addParameter(STR16("Top K"), STR16(""), 0, 0.04,
                           ParameterInfo::kCanAutomate, kParamTopK);

    // Volume (0-100)
    parameters.addParameter(STR16("Volume"), STR16("%"), 0, 0.8,
                           ParameterInfo::kCanAutomate, kParamVolume);

    // Boolean parameters
    parameters.addParameter(STR16("Mute Bass"), nullptr, 1, 0,
                           ParameterInfo::kCanAutomate | ParameterInfo::kIsBypass, kParamMuteBass);

    parameters.addParameter(STR16("Mute Drums"), nullptr, 1, 0,
                           ParameterInfo::kCanAutomate | ParameterInfo::kIsBypass, kParamMuteDrums);

    parameters.addParameter(STR16("Bass & Drums Only"), nullptr, 1, 0,
                           ParameterInfo::kCanAutomate | ParameterInfo::kIsBypass, kParamOnlyBassAndDrums);

    // Play/Pause toggle
    parameters.addParameter(STR16("Play/Pause"), nullptr, 1, 0,
                           ParameterInfo::kCanAutomate | ParameterInfo::kIsBypass, kParamPlayPause);

    // Layer parameters (up to 50 layers)
    for (int i = 0; i < 50; ++i) {
        char nameWeight[64], nameEnabled[64];
        Steinberg::Vst::TChar nameWeightW[64], nameEnabledW[64];

        sprintf(nameWeight, "Layer %d Weight", i + 1);
        sprintf(nameEnabled, "Layer %d Enabled", i + 1);

        // Convert to wide strings using UString
        Steinberg::UString(nameWeightW, 64).assign(nameWeight);
        Steinberg::UString(nameEnabledW, 64).assign(nameEnabled);

        Steinberg::Vst::ParamID weightId = kParamLayer1Weight + (i * 2);
        Steinberg::Vst::ParamID enabledId = kParamLayer1Enabled + (i * 2);

        parameters.addParameter(nameWeightW, nullptr, 0, 0.5,
                               ParameterInfo::kCanAutomate, weightId);

        parameters.addParameter(nameEnabledW, nullptr, 1, (i == 0) ? 1 : 0,
                               ParameterInfo::kCanAutomate | ParameterInfo::kIsBypass, enabledId);
    }

    return Steinberg::kResultOk;
}

Steinberg::tresult PLUGIN_API UnderlayController::terminate() {
    if (webViewBridge_) {
        webViewBridge_->shutdown();
    }
    return EditController::terminate();
}

Steinberg::tresult PLUGIN_API UnderlayController::setComponentState(Steinberg::IBStream* state) {
    if (!state) return Steinberg::kResultFalse;

    Steinberg::IBStreamer streamer(state, kLittleEndian);
    return Steinberg::kResultOk;
}

Steinberg::tresult PLUGIN_API UnderlayController::setParamNormalized(Steinberg::Vst::ParamID tag, Steinberg::Vst::ParamValue value) {
    // Call base implementation first
    Steinberg::tresult result = EditController::setParamNormalized(tag, value);

    if (result == Steinberg::kResultOk && webViewBridge_ && webViewBridge_->isInitialized()) {
        // Forward parameter change to WebView via custom event
        std::ostringstream js;
        js << "window.dispatchEvent(new CustomEvent('vstParameterChange', { detail: { paramId: "
           << tag << ", value: " << value << " } }));";
        webViewBridge_->executeJavaScript(js.str());
        DEBUG_LOG("Parameter " << tag << " changed to " << value << " - forwarded to UI");
    }

    return result;
}

Steinberg::IPlugView* PLUGIN_API UnderlayController::createView(const char* name) {
    DEBUG_LOG("createView called with name: " << (name ? name : "NULL"));

    if (name && strcmp(name, Steinberg::Vst::ViewType::kEditor) == 0) {
        DEBUG_LOG("Creating editor view");
        WebViewBridge* bridge = getWebViewBridge();

        // Initialize WebView if not already done
        if (!webViewInitialized_) {
            // WebView will be initialized when attached to parent NSView
            webViewInitialized_ = true;
        }

        UnderlayEditorView* view = new UnderlayEditorView(bridge, this);
        DEBUG_LOG("Editor view created: " << view);

        // Sync parameters to UI after initialization delay
        // Must dispatch to main queue for WebKit thread safety
#ifdef __APPLE__
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 500 * NSEC_PER_MSEC),
                      dispatch_get_main_queue(), ^{
            syncParametersToUI();
        });
#else
        std::thread([this]() {
            std::this_thread::sleep_for(std::chrono::milliseconds(500));
            // Note: syncParametersToUI handles thread-safety internally via WebViewBridge
            syncParametersToUI();
        }).detach();
#endif

        return view;
    }

    DEBUG_LOG("No editor view created (name mismatch)");
    return nullptr;
}

void UnderlayController::syncParametersToUI() {
    if (!webViewBridge_ || !webViewBridge_->isInitialized()) {
        DEBUG_LOG("Cannot sync parameters - WebView not initialized");
        return;
    }

    DEBUG_LOG("Syncing all parameters to UI...");

    // Sync all parameters via JavaScript
    std::ostringstream js;
    js << "window.dispatchEvent(new CustomEvent('vstSyncParameters', { detail: { params: [";

    Steinberg::int32 paramCount = getParameterCount();
    for (Steinberg::int32 i = 0; i < paramCount; ++i) {
        Steinberg::Vst::ParameterInfo paramInfo;
        if (getParameterInfo(i, paramInfo) == Steinberg::kResultOk) {
            Steinberg::Vst::ParamValue value = getParamNormalized(paramInfo.id);

            if (i > 0) js << ",";
            js << "{id:" << paramInfo.id << ",value:" << value << "}";
        }
    }

    js << "] } }));";
    webViewBridge_->executeJavaScript(js.str());

    DEBUG_LOG("Synced " << paramCount << " parameters to UI");
}

void UnderlayController::setWindowSize(int width, int height) {
    savedWindowWidth_ = width;
    savedWindowHeight_ = height;
    DEBUG_LOG("Window size saved: " << width << "x" << height);
}

void UnderlayController::getWindowSize(int& width, int& height) const {
    width = savedWindowWidth_;
    height = savedWindowHeight_;
}

Steinberg::tresult PLUGIN_API UnderlayController::setState(Steinberg::IBStream* state) {
    if (!state) return Steinberg::kResultFalse;

    DEBUG_LOG("Loading controller state (window size)...");
    Steinberg::IBStreamer streamer(state, kLittleEndian);

    // Read window size
    int32_t width, height;
    if (!streamer.readInt32(width)) {
        DEBUG_LOG("Failed to read window width, using defaults");
        return Steinberg::kResultFalse;
    }
    if (!streamer.readInt32(height)) {
        DEBUG_LOG("Failed to read window height, using defaults");
        return Steinberg::kResultFalse;
    }

    // Validate and clamp window size
    if (width < 800) width = 800;
    if (width > 1920) width = 1920;
    if (height < 500) height = 500;
    if (height > 1200) height = 1200;

    savedWindowWidth_ = width;
    savedWindowHeight_ = height;

    DEBUG_LOG("Loaded window size: " << width << "x" << height);
    return Steinberg::kResultOk;
}

Steinberg::tresult PLUGIN_API UnderlayController::getState(Steinberg::IBStream* state) {
    if (!state) return Steinberg::kResultFalse;

    DEBUG_LOG("Saving controller state (window size)...");
    Steinberg::IBStreamer streamer(state, kLittleEndian);

    // Write window size
    if (!streamer.writeInt32(savedWindowWidth_)) {
        DEBUG_LOG("Failed to write window width");
        return Steinberg::kResultFalse;
    }
    if (!streamer.writeInt32(savedWindowHeight_)) {
        DEBUG_LOG("Failed to write window height");
        return Steinberg::kResultFalse;
    }

    DEBUG_LOG("Saved window size: " << savedWindowWidth_ << "x" << savedWindowHeight_);
    return Steinberg::kResultOk;
}

} // namespace Underlay
