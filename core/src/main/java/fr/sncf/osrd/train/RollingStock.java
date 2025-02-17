package fr.sncf.osrd.train;

import static fr.sncf.osrd.envelope_sim.EnvelopeSimPath.ModeAndProfile;

import com.google.common.collect.ImmutableRangeMap;
import com.google.common.collect.Range;
import com.google.common.collect.RangeMap;
import com.google.common.collect.TreeRangeMap;
import edu.umd.cs.findbugs.annotations.SuppressFBWarnings;
import fr.sncf.osrd.envelope_sim.PhysicsRollingStock;
import fr.sncf.osrd.railjson.schema.rollingstock.RJSLoadingGaugeType;
import java.util.Map;
import java.util.Set;


/**
 * The immutable characteristics of a specific train.
 * There must be a RollingStock instance per train on the network.
 */
@SuppressFBWarnings({ "URF_UNREAD_PUBLIC_OR_PROTECTED_FIELD" })
public class RollingStock implements PhysicsRollingStock {
    public final String id;

    public final double A; // in newtons
    public final double B; // in newtons / (m/s)
    public final double C; // in newtons / (m/s^2)

    /**
     * the kind of deceleration input of the train. It can be:
     * a constant value
     * the maximum possible deceleration value
     */
    public final GammaType gammaType;

    /**
     * the deceleration of the train, in m/s^2
     */
    public final double gamma;

    /**
     * the length of the train, in meters.
     */
    public final double length;

    /**
     * The max speed of the train, in meters per seconds.
     */
    public final double maxSpeed;

    /**
     * The time the train takes to start up, in seconds.
     * During this time, the train's maximum acceleration is limited.
     */
    public final double startUpTime;

    /**
     * The acceleration to apply during the startup state.
     */
    public final double startUpAcceleration;

    /**
     * The maximum acceleration when the train is in its regular operating mode.
     */
    public final double comfortAcceleration;

    /**
     * The mass of the train, in kilograms.
     */
    public final double mass;

    /**
     * Defined as mass * inertiaCoefficient
     */
    public final double inertia;

    /**
     * Inertia coefficient.
     * The mass alone isn't sufficient to compute accelerations, as the wheels and internals
     * also need force to get spinning. This coefficient can be used to account for the difference.
     * It's without unit.
     */
    public final double inertiaCoefficient;

    public final RJSLoadingGaugeType loadingGaugeType;

    /**
     * Associates a speed to a force.
     * https://en.wikipedia.org/wiki/Tractive_force#Tractive_effort_curves
     */
    protected final Map<String, ModeEffortCurves> modes;

    private final String defaultMode;
    public final String powerClass;

    @Override
    public double getMass() {
        return mass;
    }

    @Override
    public double getInertia() {
        return inertia;
    }

    @Override
    public double getLength() {
        return length;
    }

    @Override
    public double getMaxSpeed() {
        return maxSpeed;
    }

    /**
     * Gets the rolling resistance at a given speed, which is a force that always goes
     * opposite to the train's movement direction
     */
    @Override
    public double getRollingResistance(double speed) {
        speed = Math.abs(speed);
        // this formula is called the Davis equation.
        // it's completely empirical, and models the drag and friction forces
        return A + B * speed + C * speed * speed;
    }

    @Override
    public double getRollingResistanceDeriv(double speed) {
        speed = Math.abs(speed);
        return B + 2 * C * speed;
    }

    @Override
    public double getMaxBrakingForce(double speed) {
        return gamma * inertia;
    }

    @Override
    public GammaType getGammaType() {
        return gammaType;
    }

    public record ModeEffortCurves(boolean isElectric, TractiveEffortPoint[] defaultCurve,
                                   ConditionalEffortCurve[] curves) {
    }

    public record ConditionalEffortCurve(EffortCurveConditions cond, TractiveEffortPoint[] curve) {
    }

    public record EffortCurveConditions(Comfort comfort, String electricalProfile) {
        /**
         * Returns true if the conditions are met
         * If comfort condition is null then it matches any comfort, same for electrical profile
         */
        public boolean match(Comfort comfort, String electricalProfile) {
            return (this.comfort == null || comfort == this.comfort)
                    && (this.electricalProfile == null || this.electricalProfile.equals(electricalProfile));
        }
    }

    public enum Comfort {
        STANDARD,
        HEATING,
        AC,
    }

    protected record CurveAndCondition(TractiveEffortPoint[] curve, ModeAndProfile modeAndProfile) {
    }

    public record CurvesAndConditions(RangeMap<Double, TractiveEffortPoint[]> curves,
                                      RangeMap<Double, ModeAndProfile> conditions) {
    }

    /**
     * Returns Gamma
     */
    public double getDeceleration() {
        return -gamma;
    }

    /**
     * Returns the tractive effort curve that matches best, along with the condition that matched
     */
    protected CurveAndCondition findTractiveEffortCurve(String catenaryMode, String electricalProfile,
                                                        Comfort comfort) {
        // Get mode effort curves
        var mode = modes.get(defaultMode);
        var usedMode = defaultMode;
        if (catenaryMode != null && modes.containsKey(catenaryMode)) {
            mode = modes.get(catenaryMode);
            usedMode = catenaryMode;
        }

        // Get best curve given a comfort
        for (var condCurve : mode.curves) {
            if (condCurve.cond.match(comfort, electricalProfile)) {
                return new CurveAndCondition(condCurve.curve,
                        new ModeAndProfile(catenaryMode, condCurve.cond.electricalProfile));
            }
        }
        return new CurveAndCondition(mode.defaultCurve, new ModeAndProfile(usedMode, null));
    }

    /**
     * Returns the tractive effort curves corresponding to the given mode and profile map
     *
     * @param modeAndProfileMap The map of mode and profile to use
     * @param comfort           The comfort level to get the curves for
     */
    public CurvesAndConditions mapTractiveEffortCurves(RangeMap<Double, ModeAndProfile> modeAndProfileMap,
                                                       Comfort comfort, double pathLength) {
        TreeRangeMap<Double, ModeAndProfile> conditionsUsed = TreeRangeMap.create();
        TreeRangeMap<Double, TractiveEffortPoint[]> res = TreeRangeMap.create();
        var defaultCurve = findTractiveEffortCurve(defaultMode, null, comfort);
        res.put(Range.all(), defaultCurve.curve);
        conditionsUsed.put(Range.closed(0., pathLength), defaultCurve.modeAndProfile);
        for (var modeAndProfileEntry : modeAndProfileMap.asMapOfRanges().entrySet()) {
            var modeAndProfile = modeAndProfileEntry.getValue();
            var curve = findTractiveEffortCurve(modeAndProfile.mode(), modeAndProfile.profile(), comfort);
            res.put(modeAndProfileEntry.getKey(), curve.curve);
            conditionsUsed.put(modeAndProfileEntry.getKey(), curve.modeAndProfile);
        }
        return new CurvesAndConditions(ImmutableRangeMap.copyOf(res), ImmutableRangeMap.copyOf(conditionsUsed));
    }

    public Set<String> getModeNames() {
        return modes.keySet();
    }

    /**
     * Return whether this rolling stock support only electric modes
     */
    public boolean isElectricOnly() {
        for (var mode : modes.values()) {
            if (!mode.isElectric)
                return false;
        }
        return true;
    }

    /**
     * Creates a new rolling stock (a physical train inventory item).
     */
    public RollingStock(
            String id,
            double length,
            double mass,
            double inertiaCoefficient,
            double a,
            double b,
            double c,
            double maxSpeed,
            double startUpTime,
            double startUpAcceleration,
            double comfortAcceleration,
            double gamma,
            GammaType gammaType,
            RJSLoadingGaugeType loadingGaugeType,
            Map<String, ModeEffortCurves> modes,
            String defaultMode,
            String powerClass
    ) {
        this.id = id;
        this.A = a;
        this.B = b;
        this.C = c;
        this.length = length;
        this.maxSpeed = maxSpeed;
        this.startUpTime = startUpTime;
        this.startUpAcceleration = startUpAcceleration;
        this.comfortAcceleration = comfortAcceleration;
        this.gamma = gamma;
        this.gammaType = gammaType;
        this.mass = mass;
        this.inertiaCoefficient = inertiaCoefficient;
        this.modes = modes;
        this.defaultMode = defaultMode;
        this.inertia = mass * inertiaCoefficient;
        this.loadingGaugeType = loadingGaugeType;
        this.powerClass = powerClass;
    }
}
