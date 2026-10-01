/** Maintained ACR reference derived from conveyal/ui repository fixtures; not imported by the collector. */

import { RECOMMENDED_WORKER_VERSION } from "../../lib/constants/r5";

import scratchRegion from "./regions/scratch";

/** Historical UI analysis defaults; runtime settings live in audit/fixture-manifest.json. */
export const defaultAnalysisSettings: Partial<CL.AnalysisRequestSettings> = {
  accessModes: "WALK",
  bikeSpeed: 4.166666666666667,
  bikeTrafficStress: 1,
  bounds: scratchRegion.bounds,
  date: scratchRegion.date,
  decayFunction: {
    type: "step",
    standardDeviationMinutes: 10,
    widthMinutes: 10,
  },
  destinationPointSetIds: [],
  directModes: "WALK",
  egressModes: "WALK",
  fromTime: 25200,
  maxBikeTime: 20,
  maxRides: 4,
  maxWalkTime: 20,
  monteCarloDraws: 200,
  percentiles: [5, 25, 50, 75, 95],
  toTime: 32400,
  transitModes: "BUS,TRAM,RAIL,SUBWAY,FERRY,CABLE_CAR,GONDOLA,FUNICULAR",
  walkSpeed: 1.3888888888888888,
  workerVersion: RECOMMENDED_WORKER_VERSION,
};
