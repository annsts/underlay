#pragma once

#include <vector>
#include <mutex>
#include <memory>
#include <cstring>
#include "DebugLog.h"

namespace Underlay {

/**
 * Thread-safe audio buffer shared between UI (WebView) and audio processor
 */
class SharedAudioBuffer {
public:
    static SharedAudioBuffer& getInstance() {
        static SharedAudioBuffer instance;
        return instance;
    }

    // Add audio samples from Web Audio API
    void pushAudio(const float* left, const float* right, int numSamples, int sampleRate) {
        DEBUG_LOG("[SharedAudioBuffer] pushAudio called - samples: " << numSamples << ", rate: " << sampleRate);
        std::lock_guard<std::mutex> lock(mutex_);
        DEBUG_LOG("[SharedAudioBuffer] Mutex acquired");

        // Perform cleanup if flagged by audio thread
        if (needsCleanup_ && readPos_ > 0) {
            DEBUG_LOG("[SharedAudioBuffer] Performing buffer cleanup - removing " << readPos_ << " consumed samples");
            leftBuffer_.erase(leftBuffer_.begin(), leftBuffer_.begin() + readPos_);
            rightBuffer_.erase(rightBuffer_.begin(), rightBuffer_.begin() + readPos_);
            readPos_ = 0;
            needsCleanup_ = false;
        }

        // Resize buffers if needed
        const size_t maxCapacity = 48000 * 6;
        if (leftBuffer_.capacity() < maxCapacity) {
            DEBUG_LOG("[SharedAudioBuffer] Reserving buffer capacity: " << maxCapacity);
            leftBuffer_.reserve(maxCapacity);
            rightBuffer_.reserve(maxCapacity);
        }

        size_t beforeSize = leftBuffer_.size();
        DEBUG_LOG("[SharedAudioBuffer] Buffer size before push: " << beforeSize);

        // Append samples using insert
        leftBuffer_.insert(leftBuffer_.end(), left, left + numSamples);
        rightBuffer_.insert(rightBuffer_.end(), right, right + numSamples);

        DEBUG_LOG("[SharedAudioBuffer] Buffer size after push: " << leftBuffer_.size());

        // Prevent buffer from growing too large
        const size_t maxSize = maxCapacity;
        if (leftBuffer_.size() > maxSize) {
            size_t toRemove = leftBuffer_.size() - maxSize;
            DEBUG_LOG("[SharedAudioBuffer] Buffer overflow - removing " << toRemove << " samples");
            leftBuffer_.erase(leftBuffer_.begin(), leftBuffer_.begin() + toRemove);
            rightBuffer_.erase(rightBuffer_.begin(), rightBuffer_.begin() + toRemove);
            readPos_ = (readPos_ > toRemove) ? (readPos_ - toRemove) : 0;
        }

        DEBUG_LOG("[SharedAudioBuffer] pushAudio complete - final size: " << leftBuffer_.size());
    }

    // Get audio samples for processing (real-time audio thread)
    void pullAudio(float** outputs, int numChannels, int numSamples) {
        std::lock_guard<std::mutex> lock(mutex_);

        for (int ch = 0; ch < numChannels && ch < 2; ch++) {
            auto& buffer = (ch == 0) ? leftBuffer_ : rightBuffer_;
            size_t availableSamples = buffer.size() > readPos_ ? buffer.size() - readPos_ : 0;
            size_t samplesToCopy = std::min((size_t)numSamples, availableSamples);

            // Copy available samples
            if (samplesToCopy > 0) {
                std::memcpy(outputs[ch], buffer.data() + readPos_, samplesToCopy * sizeof(float));
            }

            // Fill rest with silence if needed
            if (samplesToCopy < (size_t)numSamples) {
                std::memset(outputs[ch] + samplesToCopy, 0, (numSamples - samplesToCopy) * sizeof(float));
            }

            if (ch == 0) {
                // Update read position
                readPos_ += samplesToCopy;

                // Mark buffer for cleanup (deferred to non-RT thread)
                if (readPos_ > 48000) {
                    needsCleanup_ = true;
                }
            }
        }
    }

    // Check how many samples are available
    size_t available() const {
        std::lock_guard<std::mutex> lock(mutex_);
        return leftBuffer_.size() > readPos_ ? leftBuffer_.size() - readPos_ : 0;
    }

    void clear() {
        std::lock_guard<std::mutex> lock(mutex_);
        leftBuffer_.clear();
        rightBuffer_.clear();
        readPos_ = 0;
    }

private:
    SharedAudioBuffer() : readPos_(0), needsCleanup_(false) {}
    ~SharedAudioBuffer() = default;
    SharedAudioBuffer(const SharedAudioBuffer&) = delete;
    SharedAudioBuffer& operator=(const SharedAudioBuffer&) = delete;

    mutable std::mutex mutex_;
    std::vector<float> leftBuffer_;
    std::vector<float> rightBuffer_;
    size_t readPos_;
    bool needsCleanup_;
};

} // namespace Underlay
