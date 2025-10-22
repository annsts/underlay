#include "UnderlayVST.h"
#include "DebugLog.h"
#include "SharedAudioBuffer.h"
#include "PluginIDs.h"
#include "pluginterfaces/vst/ivstparameterchanges.h"
#include "pluginterfaces/vst/ivstevents.h"
#include "base/source/fstreamer.h"

namespace Underlay {

UnderlayProcessor::UnderlayProcessor() {
    DEBUG_LOG("UnderlayProcessor constructor called");

    // Set controller class ID
    setControllerClass(kControllerUID);
    DEBUG_LOG("Controller class ID set");
}

UnderlayProcessor::~UnderlayProcessor() {
}

Steinberg::tresult PLUGIN_API UnderlayProcessor::initialize(Steinberg::FUnknown* context) {
    DEBUG_LOG("UnderlayProcessor::initialize() called");
    Steinberg::tresult result = AudioEffect::initialize(context);
    if (result != Steinberg::kResultOk) {
        DEBUG_LOG("ERROR: AudioEffect::initialize() failed");
        return result;
    }

    // Add audio outputs (stereo)
    addAudioOutput(STR16("Stereo Out"), Steinberg::Vst::SpeakerArr::kStereo);

    // Add MIDI input
    addEventInput(STR16("MIDI In"), 1);

    DEBUG_LOG("UnderlayProcessor initialized successfully");
    return Steinberg::kResultOk;
}

Steinberg::tresult PLUGIN_API UnderlayProcessor::terminate() {
    return AudioEffect::terminate();
}

Steinberg::tresult PLUGIN_API UnderlayProcessor::setActive(Steinberg::TBool state) {
    if (state) {
        DEBUG_LOG("Processor activated");
    } else {
        DEBUG_LOG("Processor deactivated");
    }

    return AudioEffect::setActive(state);
}

Steinberg::tresult PLUGIN_API UnderlayProcessor::process(Steinberg::Vst::ProcessData& data) {
    // Check for host tempo changes and update BPM parameter
    if (data.processContext) {
        if (data.processContext->state & Steinberg::Vst::ProcessContext::kTempoValid) {
            double hostTempo = data.processContext->tempo;

            // Update BPM parameter on tempo change
            if (!hostTempoSent_ || std::abs(hostTempo - lastHostTempo_) > 0.01) {
                lastHostTempo_ = hostTempo;
                hostTempoSent_ = true;

                // Update BPM parameter
                double normalizedBPM = (hostTempo - 60.0) / 140.0;
                normalizedBPM = std::max(0.0, std::min(1.0, normalizedBPM));

                // Send parameter change output to controller
                if (data.outputParameterChanges) {
                    Steinberg::int32 index = 0;
                    Steinberg::Vst::IParamValueQueue* queue =
                        data.outputParameterChanges->addParameterData(kParamBPM, index);
                    if (queue) {
                        queue->addPoint(0, normalizedBPM, index);
                        DEBUG_LOG("Host tempo: " << hostTempo << " BPM (normalized: " << normalizedBPM << ")");
                    }
                }
            }
        }
    }

    updateParameters(data);
    processMidiInput(data);
    if (data.numOutputs == 0 || data.outputs[0].numChannels == 0) {
        return Steinberg::kResultOk;
    }

    Steinberg::int32 numChannels = data.outputs[0].numChannels;
    Steinberg::int32 numSamples = data.numSamples;

    // Validate buffer pointers before accessing
    if (!data.outputs[0].channelBuffers32) {
        DEBUG_LOG("ERROR: Null channel buffer pointer");
        return Steinberg::kResultOk;
    }

    // Verify outputs array is not null
    if (!data.outputs) {
        DEBUG_LOG("ERROR: outputs array is NULL");
        return Steinberg::kResultOk;
    }

    try {
        // Pull audio from shared buffer
        SharedAudioBuffer::getInstance().pullAudio(data.outputs[0].channelBuffers32, numChannels, numSamples);
    } catch (const std::exception& e) {
        DEBUG_LOG("ERROR: Exception in audio processing: " << e.what());
    } catch (...) {
        DEBUG_LOG("ERROR: Unknown exception in audio processing");
    }

    return Steinberg::kResultOk;
}

void UnderlayProcessor::updateParameters(Steinberg::Vst::ProcessData& data) {
    if (!data.inputParameterChanges) return;

    Steinberg::int32 numParamsChanged = data.inputParameterChanges->getParameterCount();

    for (Steinberg::int32 i = 0; i < numParamsChanged; ++i) {
        Steinberg::Vst::IParamValueQueue* paramQueue = data.inputParameterChanges->getParameterData(i);
        if (!paramQueue) continue;

        Steinberg::Vst::ParamID paramId = paramQueue->getParameterId();
        Steinberg::int32 numPoints = paramQueue->getPointCount();

        if (numPoints > 0) {
            Steinberg::int32 sampleOffset;
            Steinberg::Vst::ParamValue value;

            if (paramQueue->getPoint(numPoints - 1, sampleOffset, value) == Steinberg::kResultOk) {
                parameters_[paramId] = value;
            }
        }
    }
}

void UnderlayProcessor::processMidiInput(Steinberg::Vst::ProcessData& data) {
    if (!data.inputEvents) return;

    Steinberg::int32 numEvents = data.inputEvents->getEventCount();

    for (Steinberg::int32 i = 0; i < numEvents; ++i) {
        Steinberg::Vst::Event event;
        if (data.inputEvents->getEvent(i, event) == Steinberg::kResultOk) {
            // MIDI CC parameter control can be implemented here
        }
    }
}

Steinberg::tresult PLUGIN_API UnderlayProcessor::setBusArrangements(
    Steinberg::Vst::SpeakerArrangement* inputs,
    Steinberg::int32 numIns,
    Steinberg::Vst::SpeakerArrangement* outputs,
    Steinberg::int32 numOuts) {

    if (numOuts == 1 && outputs[0] == Steinberg::Vst::SpeakerArr::kStereo) {
        return AudioEffect::setBusArrangements(inputs, numIns, outputs, numOuts);
    }

    return Steinberg::kResultFalse;
}

Steinberg::tresult PLUGIN_API UnderlayProcessor::canProcessSampleSize(Steinberg::int32 symbolicSampleSize) {
    if (symbolicSampleSize == Steinberg::Vst::kSample32 || symbolicSampleSize == Steinberg::Vst::kSample64) {
        return Steinberg::kResultTrue;
    }
    return Steinberg::kResultFalse;
}

Steinberg::tresult PLUGIN_API UnderlayProcessor::setState(Steinberg::IBStream* state) {
    if (!state) return Steinberg::kResultFalse;

    Steinberg::IBStreamer streamer(state, kLittleEndian);
    return Steinberg::kResultOk;
}

Steinberg::tresult PLUGIN_API UnderlayProcessor::getState(Steinberg::IBStream* state) {
    if (!state) return Steinberg::kResultFalse;

    Steinberg::IBStreamer streamer(state, kLittleEndian);
    return Steinberg::kResultOk;
}

} // namespace Underlay
