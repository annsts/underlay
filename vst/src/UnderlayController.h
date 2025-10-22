#pragma once

#include "public.sdk/source/vst/vsteditcontroller.h"
#include "pluginterfaces/gui/iplugview.h"
#include "PluginIDs.h"
#include <memory>
#include <dispatch/dispatch.h>

namespace Underlay {

// Forward declarations
class WebViewBridge;
class UnderlayController;

/**
 * Custom VST3 Editor View that manages WKWebView window
 */
class UnderlayEditorView : public Steinberg::IPlugView {
public:
    UnderlayEditorView(WebViewBridge* sharedWebView, UnderlayController* controller);
    virtual ~UnderlayEditorView();

    // IPlugView interface
    Steinberg::tresult PLUGIN_API isPlatformTypeSupported(Steinberg::FIDString type) override;
    Steinberg::tresult PLUGIN_API attached(void* parent, Steinberg::FIDString type) override;
    Steinberg::tresult PLUGIN_API removed() override;
    Steinberg::tresult PLUGIN_API onWheel(float distance) override { return Steinberg::kResultFalse; }
    Steinberg::tresult PLUGIN_API onKeyDown(Steinberg::char16 key, Steinberg::int16 keyCode, Steinberg::int16 modifiers) override { return Steinberg::kResultFalse; }
    Steinberg::tresult PLUGIN_API onKeyUp(Steinberg::char16 key, Steinberg::int16 keyCode, Steinberg::int16 modifiers) override { return Steinberg::kResultFalse; }
    Steinberg::tresult PLUGIN_API getSize(Steinberg::ViewRect* size) override;
    Steinberg::tresult PLUGIN_API onSize(Steinberg::ViewRect* newSize) override;
    Steinberg::tresult PLUGIN_API onFocus(Steinberg::TBool state) override;
    Steinberg::tresult PLUGIN_API setFrame(Steinberg::IPlugFrame* frame) override;
    Steinberg::tresult PLUGIN_API canResize() override { return Steinberg::kResultTrue; }
    Steinberg::tresult PLUGIN_API checkSizeConstraint(Steinberg::ViewRect* rect) override;

    // IUnknown interface
    DECLARE_FUNKNOWN_METHODS

private:
    WebViewBridge* webViewBridge_;
    UnderlayController* controller_;
    Steinberg::IPlugFrame* frame_;
    Steinberg::ViewRect rect_;
    int refCount_;
    bool isAttached_;
    double lastZoomFactor_;
    dispatch_source_t resizeTimer_;
};

/**
 * VST3 Edit Controller class
 * Handles parameter management and UI communication
 */
class UnderlayController : public Steinberg::Vst::EditController {
public:
    UnderlayController();
    ~UnderlayController() override;

    // Factory
    static Steinberg::FUnknown* createInstance(void*) {
        return (Steinberg::Vst::IEditController*)new UnderlayController();
    }

    // IPluginBase
    Steinberg::tresult PLUGIN_API initialize(Steinberg::FUnknown* context) override;
    Steinberg::tresult PLUGIN_API terminate() override;

    // EditController
    Steinberg::tresult PLUGIN_API setComponentState(Steinberg::IBStream* state) override;
    Steinberg::IPlugView* PLUGIN_API createView(const char* name) override;
    Steinberg::tresult PLUGIN_API setParamNormalized(Steinberg::Vst::ParamID tag, Steinberg::Vst::ParamValue value) override;

    // State persistence (for window size)
    Steinberg::tresult PLUGIN_API setState(Steinberg::IBStream* state) override;
    Steinberg::tresult PLUGIN_API getState(Steinberg::IBStream* state) override;

    // Bridge access for editor
    WebViewBridge* getWebViewBridge();

    // Sync all current parameter values to UI
    void syncParametersToUI();

    // Window size management
    void setWindowSize(int width, int height);
    void getWindowSize(int& width, int& height) const;

private:
    std::unique_ptr<WebViewBridge> webViewBridge_;
    bool webViewInitialized_;

    // Saved window size
    int savedWindowWidth_;
    int savedWindowHeight_;
};

} // namespace Underlay
