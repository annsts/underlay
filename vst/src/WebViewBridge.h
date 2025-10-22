#pragma once

#include <string>
#include <functional>

namespace Underlay {

/**
 * WebViewBridge - Embeds WKWebView into VST's NSView
 */
class WebViewBridge {
public:
    WebViewBridge();
    ~WebViewBridge();

    // Initialize with parent NSView and HTML path
    bool initialize(void* parentNSView, const std::string& htmlPath);
    void shutdown();

    // Attach/detach from parent without destroying WebView
    void attachToParent(void* parentNSView);
    void detachFromParent();

    // Resize the webview
    void resize(int width, int height);

    // Set zoom factor
    void setZoomFactor(double zoomFactor);

    // Execute JavaScript
    void executeJavaScript(const std::string& script);

    // Set callback for messages from JavaScript
    void setMessageHandler(std::function<void(const std::string&)> handler);

    // Set callback for audio data from Web Audio API
    void setAudioCallback(std::function<void(const float*, const float*, int, int)> callback);

    // Set callback for parameter changes from UI
    void setParameterCallback(std::function<void(int, double)> callback);

    // Check if initialized
    bool isInitialized() const { return webView_ != nullptr; }

private:
    void* webView_ = nullptr;
    void* parentView_ = nullptr;
    std::function<void(const std::string&)> messageHandler_;
    std::function<void(const float*, const float*, int, int)> audioCallback_;
    std::function<void(int, double)> parameterCallback_;
};

} // namespace Underlay
