#pragma once

#include "public.sdk/source/vst/vstaudioeffect.h"
#include "PluginIDs.h"
#include <map>
#include <vector>
#include <mutex>

namespace Underlay {

/**
 * Main VST3 Processor class
 * Handles audio processing, MIDI input, and parameter automation
 */
class UnderlayProcessor : public Steinberg::Vst::AudioEffect {
public:
    UnderlayProcessor();
    ~UnderlayProcessor() override;

    // Factory
    static Steinberg::FUnknown* createInstance(void*) {
        return (Steinberg::Vst::IAudioProcessor*)new UnderlayProcessor();
    }

    // IComponent
    Steinberg::tresult PLUGIN_API initialize(Steinberg::FUnknown* context) override;
    Steinberg::tresult PLUGIN_API terminate() override;
    Steinberg::tresult PLUGIN_API setActive(Steinberg::TBool state) override;
    Steinberg::tresult PLUGIN_API process(Steinberg::Vst::ProcessData& data) override;

    // IAudioProcessor
    Steinberg::tresult PLUGIN_API setBusArrangements(
        Steinberg::Vst::SpeakerArrangement* inputs,
        Steinberg::int32 numIns,
        Steinberg::Vst::SpeakerArrangement* outputs,
        Steinberg::int32 numOuts) override;

    Steinberg::tresult PLUGIN_API canProcessSampleSize(Steinberg::int32 symbolicSampleSize) override;
    Steinberg::tresult PLUGIN_API setState(Steinberg::IBStream* state) override;
    Steinberg::tresult PLUGIN_API getState(Steinberg::IBStream* state) override;

private:
    // Parameter values
    std::map<Steinberg::Vst::ParamID, double> parameters_;

    // Transport state
    bool isPlaying_ = false;
    double lastHostTempo_ = 0.0;
    bool hostTempoSent_ = false;

    // Process MIDI input
    void processMidiInput(Steinberg::Vst::ProcessData& data);

    // Update parameters from automation
    void updateParameters(Steinberg::Vst::ProcessData& data);

    // Audio buffer for routing from WKWebView
    std::vector<std::vector<float>> audioBuffer_;
    std::mutex audioBufferMutex_;
};

} // namespace Underlay
