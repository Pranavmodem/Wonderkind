import { useRef } from "react";
import type { Activity } from "../../game/types";
import { DrawFigure, DrawLine, DrawShape, PlotPoints, SymmetryLine } from "./GridActivities";
import { BarGraph, DotPlot, MakeAngle, MakeLength, SetClock } from "./MeasureActivities";
import { BuildArray, BuildBlocks, Cut, FillFrame, MakeMoney, Order, PlaceOnLine, Shade, Sort } from "./NumberActivities";
import type { ActivityProps } from "./shared";
import { TraceNumber } from "./TraceActivity";
import { ChemistryActivityView } from "../science/ChemistryActivities";
import { PhysicsActivityView } from "../science/PhysicsActivities";
import type { ChemistryActivity } from "../../game/science/chemistryTypes";
import type { PhysicsActivity } from "../../game/science/physicsTypes";

function ActivityView(props: ActivityProps<Activity>) {
  const { a } = props;
  if (a.kind.startsWith("phys-")) return <PhysicsActivityView {...props} a={a as PhysicsActivity} />;
  if (a.kind.startsWith("chem-")) return <ChemistryActivityView {...props} a={a as ChemistryActivity} />;
  switch (a.kind) {
    case "fillFrame":
      return <FillFrame {...props} a={a} />;
    case "buildBlocks":
      return <BuildBlocks {...props} a={a} />;
    case "makeMoney":
      return <MakeMoney {...props} a={a} />;
    case "setClock":
      return <SetClock {...props} a={a} />;
    case "placeOnLine":
      return <PlaceOnLine {...props} a={a} />;
    case "makeLength":
      return <MakeLength {...props} a={a} />;
    case "plotPoints":
      return <PlotPoints {...props} a={a} />;
    case "makeAngle":
      return <MakeAngle {...props} a={a} />;
    case "shade":
      return <Shade {...props} a={a} />;
    case "cut":
      return <Cut {...props} a={a} />;
    case "barGraph":
      return <BarGraph {...props} a={a} />;
    case "dotPlot":
      return <DotPlot {...props} a={a} />;
    case "sort":
      return <Sort {...props} a={a} />;
    case "order":
      return <Order {...props} a={a} />;
    case "drawShape":
      return <DrawShape {...props} a={a} />;
    case "buildArray":
      return <BuildArray {...props} a={a} />;
    case "drawLine":
      return <DrawLine {...props} a={a} />;
    case "drawFigure":
      return <DrawFigure {...props} a={a} />;
    case "symmetryLine":
      return <SymmetryLine {...props} a={a} />;
    case "trace":
      return <TraceNumber {...props} a={a} />;
  }
}

interface Props {
  activity: Activity;
  /** Show the correct result. */
  solved: boolean;
  /** Read-only (worked examples, or after the question is over). */
  locked: boolean;
  /** Hide the Check button (worked examples). */
  noCheck?: boolean;
  onSubmit: (correct: boolean, from: Element | null) => void;
}

/** A hands-on activity with its Check button. */
export function ActivityStage({ activity, solved, locked, noCheck, onSubmit }: Props) {
  const correct = useRef(false);
  return (
    <div className="activity">
      <div className="activity-work">
        <ActivityView a={activity} solved={solved} locked={locked || solved} onChange={(c) => (correct.current = c)} />
      </div>
      {!noCheck && (
        <button type="button" className="btn btn-big act-check" disabled={locked || solved} onClick={(e) => onSubmit(correct.current, e.currentTarget)}>
          Check
        </button>
      )}
    </div>
  );
}
