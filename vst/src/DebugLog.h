#pragma once

#include <fstream>
#include <string>
#include <mutex>
#include <sstream>
#include <ctime>

namespace Underlay {

class DebugLog {
public:
    static DebugLog& getInstance() {
        static DebugLog instance;
        return instance;
    }

    void log(const std::string& message) {
        std::lock_guard<std::mutex> lock(mutex_);

        if (!file_.is_open()) {
            file_.open("/tmp/underlay_vst_debug.log", std::ios::app);
        }

        if (file_.is_open()) {
            // Get timestamp
            time_t now = time(nullptr);
            char timestamp[100];
            strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", localtime(&now));

            file_ << "[" << timestamp << "] " << message << std::endl;
            file_.flush();
        }
    }

private:
    DebugLog() {}
    ~DebugLog() {
        if (file_.is_open()) {
            file_.close();
        }
    }

    std::ofstream file_;
    std::mutex mutex_;
};

#define DEBUG_LOG(msg) do { \
    std::ostringstream oss; \
    oss << msg; \
    Underlay::DebugLog::getInstance().log(oss.str()); \
} while(0)

} // namespace Underlay
