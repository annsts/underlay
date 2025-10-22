#pragma once

#include "pluginterfaces/base/funknown.h"
#include "pluginterfaces/vst/vsttypes.h"

namespace Underlay {

// Plugin unique IDs
static const Steinberg::FUID kProcessorUID(0xA1B2C3D4, 0xE5F60708, 0x90A1B2C3, 0xD4E5F607);
static const Steinberg::FUID kControllerUID(0xB2C3D4E5, 0xF6070809, 0xA1B2C3D4, 0xE5F60708);

// Parameter IDs for automation
enum ParamID : Steinberg::Vst::ParamID {
    kParamBPM = 100,
    kParamDensity = 101,
    kParamBrightness = 102,
    kParamGuidance = 103,
    kParamTemperature = 104,
    kParamTopK = 105,
    kParamSeed = 106,
    kParamScale = 107,
    kParamMode = 108,
    kParamVolume = 109,
    kParamMuteBass = 110,
    kParamMuteDrums = 111,
    kParamOnlyBassAndDrums = 112,
    kParamPlayPause = 113,

    // Layer parameters (50 layers max, 2 params each: weight and enabled)
    kParamLayer1Weight = 200,
    kParamLayer1Enabled = 201,
    // ... continues up to layer 50
    kParamLayer50Weight = 298,
    kParamLayer50Enabled = 299
};

// MIDI CC mapping for common parameters
enum MidiCC {
    kMidiCC_BPM = 20,
    kMidiCC_Density = 21,
    kMidiCC_Brightness = 22,
    kMidiCC_Guidance = 23,
    kMidiCC_Temperature = 24,
    kMidiCC_Volume = 7  // Standard volume CC
};

} // namespace Underlay
