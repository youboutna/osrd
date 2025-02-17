package fr.sncf.osrd.signaling.impl;

import fr.sncf.osrd.signaling.*
import fr.sncf.osrd.sim_infra.api.*
import fr.sncf.osrd.sim_infra.api.SignalDriver
import fr.sncf.osrd.utils.indexing.StaticIdxSpace

class MockSigSystemManager(val sigSystem: String, val settingsSchema: SigSettingsSchema) : SigSystemManager {
    override fun checkSignalingSystemBlock(reporter: BlockDiagReporter, sigSystem: SignalingSystemId, block: SigBlock) {
    }

    override fun evalSignal(
        driverId: SignalDriverId,
        signal: SigSettings,
        stateSchema: SigStateSchema,
        maView: MovementAuthorityView?,
        limitView: SpeedLimitView?
    ): SigState {
        TODO("Not yet implemented")
    }

    override val signalingSystems: StaticIdxSpace<SignalingSystem>
        get() = StaticIdxSpace(1u)

    override fun findSignalingSystem(sigSystem: String): SignalingSystemId {
        if (sigSystem != this.sigSystem)
            throw RuntimeException("Unknown signaling system: $sigSystem") //TODO
        return SignalingSystemId(0u)
    }

    override fun getStateSchema(sigSystem: SignalingSystemId): SigStateSchema {
        TODO("Not yet implemented")
    }

    override fun getSettingsSchema(sigSystem: SignalingSystemId): SigSettingsSchema {
        return settingsSchema
    }

    override val drivers: StaticIdxSpace<SignalDriver>
        get() = StaticIdxSpace(1u)

    override fun findDriver(outputSig: SignalingSystemId, inputSig: SignalingSystemId): SignalDriverId {
        assert(outputSig == SignalingSystemId(0u) && inputSig == SignalingSystemId(0u))
        return SignalDriverId(0u)
    }

    override fun getInputSignalingSystem(driver: SignalDriverId): SignalingSystemId {
        assert(driver == SignalDriverId(0u))
        return SignalingSystemId(0u)
    }

    override fun getOutputSignalingSystem(driver: SignalDriverId): SignalingSystemId {
        assert(driver == SignalDriverId(0u))
        return SignalingSystemId(0u)
    }

    override fun isBlockDelimiter(sigSystem: SignalingSystemId, settings: SigSettings): Boolean {
        return true
    }
}
