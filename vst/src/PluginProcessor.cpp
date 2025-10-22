#include "UnderlayVST.h"
#include "UnderlayController.h"
#include "DebugLog.h"
#include "public.sdk/source/main/pluginfactory.h"

// VST3 Plugin Entry Point
#define stringPluginName "Underlay"

using namespace Steinberg::Vst;
using namespace Underlay;

// Plugin factory info
BEGIN_FACTORY_DEF("Underlay",
                  "https://github.com/annsts",
                  "https://github.com/annsts")

    // Processor entry
    DEF_CLASS2(INLINE_UID_FROM_FUID(kProcessorUID),
               PClassInfo::kManyInstances,
               kVstAudioEffectClass,
               stringPluginName,
               Vst::kDistributable,
               "Fx|Instrument|Synth",
               "1.0.0",
               kVstVersionString,
               UnderlayProcessor::createInstance)

    // Controller entry
    DEF_CLASS2(INLINE_UID_FROM_FUID(kControllerUID),
               PClassInfo::kManyInstances,
               kVstComponentControllerClass,
               stringPluginName "Controller",
               0,
               "",
               "1.0.0",
               kVstVersionString,
               UnderlayController::createInstance)

END_FACTORY

//------------------------------------------------------------------------
// Module init/deinit
//------------------------------------------------------------------------
bool InitModule() {
    // Called when the plugin library is loaded
    DEBUG_LOG("=== InitModule() called - VST3 plugin loaded ===");
    return true;
}

bool DeinitModule() {
    // Called when the plugin library is unloaded
    DEBUG_LOG("=== DeinitModule() called - VST3 plugin unloaded ===");
    return true;
}
