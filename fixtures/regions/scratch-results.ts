/** Maintained ACR reference derived from conveyal/ui repository fixtures; not imported by the collector. */

import { RECOMMENDED_WORKER_VERSION } from "lib/constants/r5";

/** Expected accessibility counts for named analysis variants at one location. */
type LocationResults = {
  [key: string]: number;
  default: number;
};

/** Reference origins sampled by the historical Cypress suite. */
export type Location = "downtown" | "middle" | "margin";

/** Version-specific expectations retained for interpreting historical UI fixtures. */
type WorkerLocationResults = {
  version: string;
  weightedAverageAccessibility: {
    aggregationAreaTest: number;
    zoomTest: number;
  };
  locations: {
    [key in Location]: LocationResults;
  };
};

/** Baseline expected counts for R5 worker version 7.4. */
const v7_4: WorkerLocationResults = {
  version: RECOMMENDED_WORKER_VERSION,
  weightedAverageAccessibility: {
    aggregationAreaTest: 14_953,
    zoomTest: 11_350,
  },
  locations: {
    downtown: {
      default: 136_141,
      "6:00-8:00": 136_252,
      "20:00-22:00": 81_816,
      customBounds: 80_138,
    },
    middle: {
      default: 46_292,
      bikeOnly: 95_902,
    },
    margin: {
      default: 32_375,
    },
  },
};

/** Baseline expected counts for R5 worker version 6.10. */
const v6_10: WorkerLocationResults = {
  version: "v6.10",
  weightedAverageAccessibility: {
    aggregationAreaTest: 14_934,
    zoomTest: 11_349,
  },
  locations: {
    downtown: {
      default: 136_141,
      "6:00-8:00": 136_252,
      "20:00-22:00": 81_816,
      customBounds: 80_138,
    },
    middle: {
      default: 46_292,
      bikeOnly: 95_602,
    },
    margin: {
      default: 32_375,
    },
  },
};

/** Baseline expected counts for R5 worker version 6.9. */
const v6_9: WorkerLocationResults = {
  version: "v6.9",
  weightedAverageAccessibility: {
    aggregationAreaTest: 14_799,
    zoomTest: 11_382,
  },
  locations: {
    downtown: {
      default: 132_530,
      "6:00-8:00": 132_817,
      "20:00-22:00": 79_159,
      customBounds: 77_634,
    },
    middle: {
      default: 43_828,
      bikeOnly: 93_404,
    },
    margin: {
      default: 31_778,
    },
  },
};

/** Supported historical origin keys used by the fixture reference guard. */
const resultsLocationNames = Object.keys(v6_10.locations);

/** Recognize one of the historical fixture location keys. */
export function isScratchResultsLocation(s: any): s is Location {
  return resultsLocationNames.includes(s);
}

/** Expected results selected for the historical recommended worker. */
export const currentWorkerResults = v7_4;

/** Retained worker baselines for historical comparison. */
export const scratchResultsByWorker = [v7_4, v6_10, v6_9];
