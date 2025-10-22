#include "WebViewBridge.h"
#include "DebugLog.h"
#include "SharedAudioBuffer.h"
#import <Cocoa/Cocoa.h>
#import <WebKit/WebKit.h>

// WKWebView subclass with keyboard input and hover tracking
@interface KeyboardEnabledWKWebView : WKWebView {
    NSTrackingArea* trackingArea;
}
@end

@implementation KeyboardEnabledWKWebView

- (BOOL)acceptsFirstResponder {
    return YES;
}

- (BOOL)becomeFirstResponder {
    return YES;
}

// Enable mouse events without click requirement
- (BOOL)acceptsFirstMouse:(NSEvent *)event {
    return YES;
}

- (void)viewDidMoveToWindow {
    [super viewDidMoveToWindow];
    // Make this view first responder when added to window
    if (self.window) {
        [self.window makeFirstResponder:self];
    }
    // Setup tracking area for hover events
    [self updateTrackingAreas];
}

// Setup tracking area for mouse moved events
- (void)updateTrackingAreas {
    [super updateTrackingAreas];

    if (trackingArea) {
        [self removeTrackingArea:trackingArea];
    }

    NSTrackingAreaOptions options = NSTrackingMouseMoved |
                                    NSTrackingMouseEnteredAndExited |
                                    NSTrackingActiveInKeyWindow |
                                    NSTrackingInVisibleRect;

    trackingArea = [[NSTrackingArea alloc] initWithRect:self.bounds
                                                options:options
                                                  owner:self
                                               userInfo:nil];
    [self addTrackingArea:trackingArea];
}

// Forward mouse moved events for CSS :hover states
- (void)mouseMoved:(NSEvent *)event {
    [super mouseMoved:event];
    // Tracking area ensures events are delivered to WKWebView handlers
}

// Handle keyboard shortcuts
- (BOOL)performKeyEquivalent:(NSEvent *)event {
    // Check for Command key shortcuts
    if ([event modifierFlags] & NSEventModifierFlagCommand) {
        NSString* key = [event charactersIgnoringModifiers];

        // Cmd+V (paste)
        if ([key isEqualToString:@"v"]) {
            NSPasteboard* pasteboard = [NSPasteboard generalPasteboard];
            NSString* clipboardText = [pasteboard stringForType:NSPasteboardTypeString];

            if (clipboardText) {
                // Escape text for JavaScript
                NSString* escapedText = [clipboardText stringByReplacingOccurrencesOfString:@"\\" withString:@"\\\\"];
                escapedText = [escapedText stringByReplacingOccurrencesOfString:@"\"" withString:@"\\\""];
                escapedText = [escapedText stringByReplacingOccurrencesOfString:@"\n" withString:@"\\n"];
                escapedText = [escapedText stringByReplacingOccurrencesOfString:@"\r" withString:@"\\r"];

                NSString* script = [NSString stringWithFormat:@
                    "const activeElement = document.activeElement;"
                    "if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {"
                    "  const start = activeElement.selectionStart;"
                    "  const end = activeElement.selectionEnd;"
                    "  const text = activeElement.value;"
                    "  const newText = text.substring(0, start) + \"%@\" + text.substring(end);"
                    "  const newCursorPos = start + %lu;"
                    // Trigger React change detection
                    "  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;"
                    "  nativeInputValueSetter.call(activeElement, newText);"
                    "  activeElement.selectionStart = activeElement.selectionEnd = newCursorPos;"
                    // Dispatch input and change events
                    "  const inputEvent = new Event('input', { bubbles: true });"
                    "  activeElement.dispatchEvent(inputEvent);"
                    "  const changeEvent = new Event('change', { bubbles: true });"
                    "  activeElement.dispatchEvent(changeEvent);"
                    "}", escapedText, (unsigned long)[clipboardText length]];

                [self evaluateJavaScript:script completionHandler:nil];
            }
            return YES;
        }

        // Cmd+C (copy)
        if ([key isEqualToString:@"c"]) {
            NSString* script = @
                "const activeElement = document.activeElement;"
                "if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {"
                "  activeElement.value.substring(activeElement.selectionStart, activeElement.selectionEnd);"
                "} else {"
                "  window.getSelection().toString();"
                "}";

            [self evaluateJavaScript:script completionHandler:^(id result, NSError *error) {
                if (!error && [result isKindOfClass:[NSString class]]) {
                    NSString* selectedText = (NSString*)result;
                    if (selectedText && selectedText.length > 0) {
                        [[NSPasteboard generalPasteboard] clearContents];
                        [[NSPasteboard generalPasteboard] setString:selectedText forType:NSPasteboardTypeString];
                    }
                }
            }];
            return YES;
        }

        // Cmd+X (cut)
        if ([key isEqualToString:@"x"]) {
            NSString* script = @
                "const activeElement = document.activeElement;"
                "let cutText = '';"
                "if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {"
                "  const start = activeElement.selectionStart;"
                "  const end = activeElement.selectionEnd;"
                "  cutText = activeElement.value.substring(start, end);"
                "  activeElement.value = activeElement.value.substring(0, start) + activeElement.value.substring(end);"
                "  activeElement.selectionStart = activeElement.selectionEnd = start;"
                "  activeElement.dispatchEvent(new Event('input', { bubbles: true }));"
                "}"
                "cutText;";

            [self evaluateJavaScript:script completionHandler:^(id result, NSError *error) {
                if (!error && [result isKindOfClass:[NSString class]]) {
                    NSString* cutText = (NSString*)result;
                    if (cutText && cutText.length > 0) {
                        [[NSPasteboard generalPasteboard] clearContents];
                        [[NSPasteboard generalPasteboard] setString:cutText forType:NSPasteboardTypeString];
                    }
                }
            }];
            return YES;
        }

        // Cmd+A (select all)
        if ([key isEqualToString:@"a"]) {
            NSString* script = @
                "const activeElement = document.activeElement;"
                "if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {"
                "  activeElement.select();"
                "} else {"
                "  document.execCommand('selectAll');"
                "}";
            [self evaluateJavaScript:script completionHandler:nil];
            return YES;
        }
    }

    // Let other events pass through
    return [super performKeyEquivalent:event];
}

// Enable standard edit menu items
- (BOOL)validateUserInterfaceItem:(id<NSValidatedUserInterfaceItem>)item {
    SEL action = [item action];

    if (action == @selector(paste:) ||
        action == @selector(copy:) ||
        action == @selector(cut:) ||
        action == @selector(selectAll:) ||
        action == @selector(undo:) ||
        action == @selector(redo:)) {
        return YES;
    }

    return [super validateUserInterfaceItem:item];
}

- (void)dealloc {
    if (trackingArea) {
        [self removeTrackingArea:trackingArea];
    }
}

@end

// Message handler delegate for receiving messages from JavaScript
@interface WebViewMessageHandler : NSObject <WKScriptMessageHandler>
@property (nonatomic, assign) std::function<void(const std::string&)>* messageCallback;
@property (nonatomic, assign) std::function<void(const float*, const float*, int, int)>* audioCallback;
@property (nonatomic, assign) std::function<void(int, double)>* parameterCallback;
@end

@implementation WebViewMessageHandler
- (void)userContentController:(WKUserContentController *)userContentController
      didReceiveScriptMessage:(WKScriptMessage *)message {
    @try {
        // Handle audio messages
        if ([message.body isKindOfClass:[NSDictionary class]]) {
            NSDictionary* dict = (NSDictionary*)message.body;
            NSString* type = dict[@"type"];

            if ([@"test" isEqualToString:type]) {
                NSString* testMessage = dict[@"message"];
                NSLog(@"[VST] TEST MESSAGE: %@", testMessage);
                DEBUG_LOG("TEST MESSAGE from JavaScript: " << [testMessage UTF8String]);
                return;
            }

            if ([@"audio" isEqualToString:type]) {
                NSArray* leftArray = dict[@"left"];
                NSArray* rightArray = dict[@"right"];
                NSNumber* sampleRate = dict[@"sampleRate"];

                if (!leftArray || !rightArray || !sampleRate ||
                    leftArray.count == 0 || leftArray.count != rightArray.count) {
                    NSLog(@"[VST] Audio validation failed - left=%lu right=%lu rate=%@",
                          (unsigned long)(leftArray ? leftArray.count : 0),
                          (unsigned long)(rightArray ? rightArray.count : 0),
                          sampleRate);
                    return;
                }

                int numSamples = (int)leftArray.count;
                int rate = [sampleRate intValue];

                if (rate < 8000 || rate > 192000) {
                    NSLog(@"[VST] Invalid sample rate: %d", rate);
                    return;
                }

                if (numSamples > 192000) {
                    NSLog(@"[VST] Buffer too large: %d samples", numSamples);
                    return;
                }

                float* left = nullptr;
                float* right = nullptr;

                @try {
                    left = new float[numSamples];
                    right = new float[numSamples];

                    for (int i = 0; i < numSamples; i++) {
                        id leftVal = leftArray[i];
                        id rightVal = rightArray[i];

                        if ([leftVal respondsToSelector:@selector(floatValue)] &&
                            [rightVal respondsToSelector:@selector(floatValue)]) {
                            left[i] = fmaxf(-1.0f, fminf(1.0f, [leftVal floatValue]));
                            right[i] = fmaxf(-1.0f, fminf(1.0f, [rightVal floatValue]));
                        } else {
                            left[i] = 0.0f;
                            right[i] = 0.0f;
                        }
                    }

                    Underlay::SharedAudioBuffer::getInstance().pushAudio(left, right, numSamples, rate);
                } @catch (NSException *exception) {
                    NSLog(@"[VST] Exception processing audio: %@ - %@", exception, [exception reason]);
                } @finally {
                    if (left) delete[] left;
                    if (right) delete[] right;
                }
                return;
            }

            if ([@"parameter" isEqualToString:type]) {
                NSNumber* paramId = dict[@"paramId"];
                NSNumber* value = dict[@"value"];

                if (paramId && value && self.parameterCallback) {
                    (*self.parameterCallback)([paramId intValue], [value doubleValue]);
                    DEBUG_LOG("[VST] Parameter " << [paramId intValue] << " = " << [value doubleValue]);
                }
                return;
            }
        }

        if (self.messageCallback && message.body) {
            NSString* body = [message.body description];
            (*self.messageCallback)([body UTF8String]);
        }
    } @catch (NSException *exception) {
        NSLog(@"[VST] Exception in message handler: %@", exception);
    }
}
@end

// Custom URL scheme handler to serve local files
@interface LocalFileSchemeHandler : NSObject <WKURLSchemeHandler>
@property (nonatomic, strong) NSString* basePath;
@end

@implementation LocalFileSchemeHandler

- (void)webView:(WKWebView *)webView startURLSchemeTask:(id<WKURLSchemeTask>)urlSchemeTask {
    NSURL* url = urlSchemeTask.request.URL;
    NSString* path = [url.path stringByRemovingPercentEncoding];

    // Build full file path
    NSString* filePath = [self.basePath stringByAppendingPathComponent:path];

    NSLog(@"[LocalFileSchemeHandler] Requested: %@ -> %@", path, filePath);

    // Check if file exists
    if (![[NSFileManager defaultManager] fileExistsAtPath:filePath]) {
        NSLog(@"[LocalFileSchemeHandler] File not found: %@", filePath);
        NSError* error = [NSError errorWithDomain:NSURLErrorDomain code:NSURLErrorFileDoesNotExist userInfo:nil];
        [urlSchemeTask didFailWithError:error];
        return;
    }

    // Read file data
    NSData* data = [NSData dataWithContentsOfFile:filePath];
    if (!data) {
        NSError* error = [NSError errorWithDomain:NSURLErrorDomain code:NSURLErrorCannotOpenFile userInfo:nil];
        [urlSchemeTask didFailWithError:error];
        return;
    }

    // Determine MIME type
    NSString* mimeType = @"application/octet-stream";
    NSString* ext = [path pathExtension].lowercaseString;

    if ([ext isEqualToString:@"css"]) {
        mimeType = @"text/css";
        NSString* cssContent = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
        if (cssContent) {
            cssContent = [cssContent stringByReplacingOccurrencesOfString:@"url(/underlay/_next/" withString:@"url(app:///_next/"];
            cssContent = [cssContent stringByReplacingOccurrencesOfString:@"url(/underlay/" withString:@"url(app:///"];
            cssContent = [cssContent stringByReplacingOccurrencesOfString:@"url(/_next/" withString:@"url(app:///_next/"];
            data = [cssContent dataUsingEncoding:NSUTF8StringEncoding];
        }
    }
    else if ([ext isEqualToString:@"js"]) mimeType = @"application/javascript";
    else if ([ext isEqualToString:@"html"]) mimeType = @"text/html";
    else if ([ext isEqualToString:@"json"]) mimeType = @"application/json";
    else if ([ext isEqualToString:@"png"]) mimeType = @"image/png";
    else if ([ext isEqualToString:@"jpg"] || [ext isEqualToString:@"jpeg"]) mimeType = @"image/jpeg";
    else if ([ext isEqualToString:@"svg"]) mimeType = @"image/svg+xml";
    else if ([ext isEqualToString:@"woff2"]) mimeType = @"font/woff2";
    else if ([ext isEqualToString:@"woff"]) mimeType = @"font/woff";

    NSHTTPURLResponse* response = [[NSHTTPURLResponse alloc] initWithURL:url
                                                              statusCode:200
                                                             HTTPVersion:@"HTTP/1.1"
                                                            headerFields:@{@"Content-Type": mimeType}];

    [urlSchemeTask didReceiveResponse:response];
    [urlSchemeTask didReceiveData:data];
    [urlSchemeTask didFinish];
}

- (void)webView:(WKWebView *)webView stopURLSchemeTask:(id<WKURLSchemeTask>)urlSchemeTask {
    // Task cancelled
}

@end

namespace Underlay {

WebViewBridge::WebViewBridge() {
    DEBUG_LOG("WebViewBridge constructor");
}

WebViewBridge::~WebViewBridge() {
    DEBUG_LOG("WebViewBridge destructor");
    shutdown();
}

bool WebViewBridge::initialize(void* parentNSView, const std::string& htmlPath) {
    DEBUG_LOG("WebViewBridge::initialize with HTML path: " << htmlPath);

    @autoreleasepool {
        NSView* parent = (__bridge NSView*)parentNSView;
        if (!parent) {
            DEBUG_LOG("ERROR: Parent NSView is null!");
            return false;
        }

        parentView_ = parentNSView;

        WKWebViewConfiguration* config = [[WKWebViewConfiguration alloc] init];
        NSURL* htmlURL = [NSURL fileURLWithPath:[NSString stringWithUTF8String:htmlPath.c_str()]];
        NSURL* baseURL = [htmlURL URLByDeletingLastPathComponent];

        LocalFileSchemeHandler* schemeHandler = [[LocalFileSchemeHandler alloc] init];
        schemeHandler.basePath = [baseURL path];
        [config setURLSchemeHandler:schemeHandler forURLScheme:@"app"];

        WebViewMessageHandler* messageHandler = [[WebViewMessageHandler alloc] init];
        messageHandler.messageCallback = &messageHandler_;
        messageHandler.audioCallback = &audioCallback_;
        messageHandler.parameterCallback = &parameterCallback_;
        [config.userContentController addScriptMessageHandler:messageHandler name:@"vstHost"];

#ifdef DEBUG
        [config.preferences setValue:@YES forKey:@"developerExtrasEnabled"];
#endif
        NSRect frame = [parent bounds];
        KeyboardEnabledWKWebView* webView = [[KeyboardEnabledWKWebView alloc] initWithFrame:frame configuration:config];
        webView_ = (void*)CFBridgingRetain(webView);

        [parent addSubview:webView];

        if (parent.window) {
            [parent.window makeFirstResponder:webView];
        }

        NSURL* url = [NSURL fileURLWithPath:[NSString stringWithUTF8String:htmlPath.c_str()]];

        if (![[NSFileManager defaultManager] fileExistsAtPath:[url path]]) {
            DEBUG_LOG("ERROR: HTML file does not exist: " << htmlPath);
            return false;
        }

        DEBUG_LOG("Loading HTML from: " << htmlPath);

        NSError* error = nil;
        NSString* htmlContent = [NSString stringWithContentsOfURL:url encoding:NSUTF8StringEncoding error:&error];

        if (error || !htmlContent) {
            DEBUG_LOG("ERROR: Failed to read HTML file: " << [[error description] UTF8String]);
            return false;
        }

        // Handle both /underlay/_next/ (production) and /_next/ (dev/VST) paths
        htmlContent = [htmlContent stringByReplacingOccurrencesOfString:@"\"/underlay/_next/" withString:@"\"app:///_next/"];
        htmlContent = [htmlContent stringByReplacingOccurrencesOfString:@"'/underlay/_next/" withString:@"'app:///_next/"];
        htmlContent = [htmlContent stringByReplacingOccurrencesOfString:@"\"/underlay/" withString:@"\"app:///"];
        htmlContent = [htmlContent stringByReplacingOccurrencesOfString:@"'/underlay/" withString:@"'app:///"];
        htmlContent = [htmlContent stringByReplacingOccurrencesOfString:@"\"/_next/" withString:@"\"app:///_next/"];
        htmlContent = [htmlContent stringByReplacingOccurrencesOfString:@"'/_next/" withString:@"'app:///_next/"];
        htmlContent = [htmlContent stringByReplacingOccurrencesOfString:@"src=\"/" withString:@"src=\"app:///"];
        htmlContent = [htmlContent stringByReplacingOccurrencesOfString:@"href=\"/" withString:@"href=\"app:///"];
        NSString* originalViewport = @"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, maximum-scale=1\" />";
        NSString* vstViewport = @"<meta name=\"viewport\" content=\"width=960, initial-scale=1, minimum-scale=0.3, maximum-scale=1, user-scalable=yes\" />";

        if ([htmlContent containsString:originalViewport]) {
            htmlContent = [htmlContent stringByReplacingOccurrencesOfString:originalViewport withString:vstViewport];
            DEBUG_LOG("Replaced viewport meta tag");
        } else {
            DEBUG_LOG("Viewport tag not found in HTML, injecting");
            NSString* headTag = @"</head>";
            if ([htmlContent containsString:headTag]) {
                htmlContent = [htmlContent stringByReplacingOccurrencesOfString:headTag
                                                                    withString:[vstViewport stringByAppendingString:headTag]];
                DEBUG_LOG("Injected viewport tag before </head>");
            }
        }

        NSURL* customBaseURL = [NSURL URLWithString:@"app:///"];
        [webView loadHTMLString:htmlContent baseURL:customBaseURL];
        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 0.5 * NSEC_PER_SEC),
                      dispatch_get_main_queue(), ^{
            [webView evaluateJavaScript:@
                "(() => {"
                "  let meta = document.querySelector('meta[name=\"viewport\"]');"
                "  if (!meta) {"
                "    meta = document.createElement('meta');"
                "    meta.name = 'viewport';"
                "    document.head.appendChild(meta);"
                "  }"
                "  meta.content = 'width=960, initial-scale=1, minimum-scale=0.3, maximum-scale=1, user-scalable=yes';"
                "})();"
                completionHandler:nil];
        });

        dispatch_after(dispatch_time(DISPATCH_TIME_NOW, 2 * NSEC_PER_SEC),
                      dispatch_get_main_queue(), ^{
            [webView evaluateJavaScript:@
                "if (window.webkit?.messageHandlers?.vstHost) {"
                "  window.webkit.messageHandlers.vstHost.postMessage({type: 'test', message: 'Bridge connected'});"
                "}"
                completionHandler:nil];
        });

        DEBUG_LOG("WKWebView initialized successfully");
        return true;
    }
}

void WebViewBridge::shutdown() {
    DEBUG_LOG("WebViewBridge::shutdown");

    @autoreleasepool {
        if (webView_) {
            WKWebView* webView = (WKWebView*)CFBridgingRelease(webView_); // Transfer ownership
            [webView removeFromSuperview];
            webView_ = nullptr;
            parentView_ = nullptr;
        }
    }
}

void WebViewBridge::attachToParent(void* parentNSView) {
    DEBUG_LOG("WebViewBridge::attachToParent");

    @autoreleasepool {
        if (!webView_) {
            DEBUG_LOG("ERROR: Cannot attach - WebView not initialized");
            return;
        }

        NSView* parent = (__bridge NSView*)parentNSView;
        if (!parent) {
            DEBUG_LOG("ERROR: Parent NSView is null!");
            return;
        }

        WKWebView* webView = (__bridge WKWebView*)webView_;

        // Remove from old parent if any
        [webView removeFromSuperview];

        // Add to new parent
        NSRect frame = [parent bounds];
        [webView setFrame:frame];
        [parent addSubview:webView];

        // Make webview first responder for keyboard events
        if (parent.window) {
            [parent.window makeFirstResponder:webView];
        }

        parentView_ = parentNSView;
        DEBUG_LOG("WebView attached to new parent");
    }
}

void WebViewBridge::detachFromParent() {
    DEBUG_LOG("WebViewBridge::detachFromParent");

    @autoreleasepool {
        if (webView_) {
            WKWebView* webView = (__bridge WKWebView*)webView_;
            [webView removeFromSuperview];
            parentView_ = nullptr;
            DEBUG_LOG("WebView detached");
        }
    }
}

void WebViewBridge::resize(int width, int height) {
    @autoreleasepool {
        if (webView_) {
            WKWebView* webView = (__bridge WKWebView*)webView_;
            NSRect newFrame = NSMakeRect(0, 0, width, height);
            [webView setFrame:newFrame];
            DEBUG_LOG("WebView resized to " << width << "x" << height);
        }
    }
}

void WebViewBridge::setZoomFactor(double zoomFactor) {
    @autoreleasepool {
        if (webView_) {
            WKWebView* webView = (__bridge WKWebView*)webView_;
            [webView setPageZoom:zoomFactor];
            DEBUG_LOG("WebView zoom set to " << zoomFactor << "x");
        }
    }
}

void WebViewBridge::executeJavaScript(const std::string& script) {
    @autoreleasepool {
        if (webView_) {
            WKWebView* webView = (__bridge WKWebView*)webView_;
            NSString* jsCode = [NSString stringWithUTF8String:script.c_str()];

            // WKWebView requires JavaScript execution on main thread
            dispatch_async(dispatch_get_main_queue(), ^{
                [webView evaluateJavaScript:jsCode completionHandler:^(id result, NSError *error) {
                    if (error) {
                        DEBUG_LOG("JavaScript execution error: " << [[error description] UTF8String]);
                    } else {
                        DEBUG_LOG("JavaScript executed successfully");
                    }
                }];
            });
        }
    }
}

void WebViewBridge::setMessageHandler(std::function<void(const std::string&)> handler) {
    messageHandler_ = handler;
    DEBUG_LOG("Message handler set");
}

void WebViewBridge::setAudioCallback(std::function<void(const float*, const float*, int, int)> callback) {
    audioCallback_ = callback;
    DEBUG_LOG("Audio callback set");
}

void WebViewBridge::setParameterCallback(std::function<void(int, double)> callback) {
    parameterCallback_ = callback;
    DEBUG_LOG("Parameter callback set");
}

} // namespace Underlay
