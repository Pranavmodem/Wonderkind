import type { PhysicsActivity } from "../../game/science/physicsTypes";
import type { ActivityProps } from "../activities/shared";
import { BuildCircuit, MagnetActivity, MatchWave, Material } from "./physics/FieldActivities";
import { Balance, ForceArrows, Launch, PushPull } from "./physics/MotionActivities";

/**
 * Draws a "phys-" hands-on activity. Each one reports correctness with useReport, shows the right result when
 * `solved`, and ignores input when `locked`. See game/science/physicsTypes.ts for every kind's fields.
 */
export function PhysicsActivityView(props: ActivityProps<PhysicsActivity>) {
  const { a } = props;
  switch (a.kind) {
    case "phys-pushpull":
      return <PushPull {...props} a={a} />;
    case "phys-forceArrows":
      return <ForceArrows {...props} a={a} />;
    case "phys-buildCircuit":
      return <BuildCircuit {...props} a={a} />;
    case "phys-launch":
      return <Launch {...props} a={a} />;
    case "phys-balance":
      return <Balance {...props} a={a} />;
    case "phys-matchWave":
      return <MatchWave {...props} a={a} />;
    case "phys-material":
      return <Material {...props} a={a} />;
    case "phys-magnet":
      return <MagnetActivity {...props} a={a} />;
  }
}
