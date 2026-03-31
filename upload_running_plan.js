/**
 * Garmin Connect — Structured Running Plan Uploader
 *
 * Uploads a 10-week half-marathon training plan to Garmin Connect
 * as structured workouts, scheduled in your calendar.
 *
 * Usage: paste into browser console at connect.garmin.com
 * See README.md for full instructions.
 */

(async () => {

// =============================================================================
// CONFIGURATION
// =============================================================================

/** First Monday of your training plan (YYYY-MM-DD) */
const START_DATE = "2026-04-01";

/**
 * Heart rate zones in BPM — edit to match your Garmin zones.
 * Check yours at: connect.garmin.com → User Settings → Heart Rate Zones
 *
 * Used when a step has hrZone: 1-5.
 * Steps with hr: [min, max] or hr: value ignore this table.
 */
const HR_ZONES = {
  1: [100, 130],  // Z1 — recovery / very easy
  2: [130, 148],  // Z2 — aerobic base / conversational
  3: [148, 162],  // Z3 — tempo / marathon pace
  4: [162, 174],  // Z4 — threshold / hard
  5: [174, 200],  // Z5 — VO2max / maximum effort
};

// =============================================================================
// PLAN DEFINITION
//
// Each entry is one workout session:
//
//   { week, day, steps, name? }
//
//   week  {number}   Week number (1, 2, 3 ...)
//   day   {string}   "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"
//   steps {array}    Ordered list of step objects (see below)
//   name  {string}   Optional. Overrides the auto-generated workout name.
//
// ─────────────────────────────────────────────────────────────────────────────
// STEP REFERENCE
// ─────────────────────────────────────────────────────────────────────────────
//
// ── DISTANCE ─────────────────────────────────────────────────────────────────
// Every step accepts km or m. They are interchangeable:
//   km: 2      → 2 kilometres
//   m: 2000    → same result
// If both are given, km takes precedence.
// If neither is given, a sensible default is used (noted per type).
//
// ── TARGET (pace / heart rate) ───────────────────────────────────────────────
// Every step accepts at most one target. Priority: pace > hrZone > hr > none.
//
//   pace  {string}   Pace zone. "M:SS" per km. Watch shows ±5 sec/km range.
//                    Example:  pace: "4:30"
//
//   hrZone {number}  HR zone 1–5 from your HR_ZONES config at the top of this file.
//                    Watch shows the corresponding bpm range.
//                    Example:  hrZone: 2
//
//   hr {number}      Single HR target. Watch shows value ±10 bpm.
//   hr {array}       Explicit bpm range [min, max].
//                    Examples: hr: 155  →  [145, 165] bpm
//                              hr: [140, 165]
//
// ── type: "easy" ─────────────────────────────────────────────────────────────
//   km / m   Distance (default: 1km)
//   pace     Optional soft pace zone
//   hrZone   Optional HR zone target (alternative to pace)
//   hr       Optional HR bpm target  (alternative to pace/hrZone)
//   label    "warmup" | "cooldown"  — changes step colour in the app
//
//   { type: "easy", km: 2, label: "warmup" }
//   { type: "easy", km: 10 }
//   { type: "easy", km: 12, hrZone: 2 }          // easy in Z2
//   { type: "easy", km: 8,  hr: [130, 145] }     // easy in specific bpm range
//   { type: "easy", km: 3,  pace: "5:30" }        // easy with soft pace zone
//
// ── type: "tempo" ────────────────────────────────────────────────────────────
//   km / m   Distance (default: 1km)
//   pace     Target pace (required if no hrZone/hr)
//   hrZone   HR zone target (alternative to pace)
//   hr       HR bpm target  (alternative to pace/hrZone)
//
//   { type: "tempo", km: 6,    pace: "4:44" }
//   { type: "tempo", m: 3000,  hrZone: 4 }       // threshold effort by HR
//   { type: "tempo", km: 5,    hr: [160, 172] }  // threshold effort by bpm
//
// ── type: "intervals" ────────────────────────────────────────────────────────
//   reps     Number of repetitions (required)
//   km / m   Interval distance (default: 1km)
//   pace     Target pace (required if no hrZone/hr)
//   hrZone   HR zone target (alternative to pace)
//   hr       HR bpm target  (alternative to pace/hrZone)
//   rest     Recovery between reps in minutes (default: 2)
//
//   { type: "intervals", reps: 6, km: 1,   pace: "4:30", rest: 2 }
//   { type: "intervals", reps: 5, m: 1600, pace: "4:35", rest: 3 }
//   { type: "intervals", reps: 6, km: 1,   hrZone: 4,    rest: 2 }  // by HR zone
//   { type: "intervals", reps: 8, km: 0.4, hr: [170, 185], rest: 1.5 }
//
// ── type: "strides" ──────────────────────────────────────────────────────────
//   count    Number of 100m strides (required)
//   km / m   Easy distance before strides (default: 0)
//   pace     Stride pace (default: "3:00")
//   rest     Recovery between strides in seconds (default: 90)
//
//   { type: "strides", km: 8, count: 4 }
//   { type: "strides", count: 2, pace: "2:50" }
//   { type: "strides", km: 10, count: 6, rest: 60 }
//
// ── type: "recovery" ─────────────────────────────────────────────────────────
//   km / m   Recovery jog distance. If omitted, uses time instead.
//   mins     Time-based recovery in minutes (default: 5, used if no km/m)
//
//   { type: "recovery", km: 1 }
//   { type: "recovery", mins: 3 }
//   { type: "recovery", m: 400 }
//
// ─────────────────────────────────────────────────────────────────────────────
// EXAMPLES OF FULL SESSIONS
// ─────────────────────────────────────────────────────────────────────────────
//
// Standard interval session with warmup / cooldown:
//   steps: [
//     { type: "easy",      km: 2,   label: "warmup" },
//     { type: "intervals", reps: 6, km: 1,   pace: "4:30", rest: 2 },
//     { type: "easy",      km: 2,   label: "cooldown" },
//   ]
//
// Long run with race-pace finish:
//   steps: [
//     { type: "easy",  km: 12 },
//     { type: "tempo", km: 6,  pace: "4:44" },
//   ]
//
// Two tempo blocks at different paces:
//   steps: [
//     { type: "easy",  km: 3 },
//     { type: "tempo", km: 3, pace: "5:00" },
//     { type: "easy",  km: 2 },
//     { type: "tempo", km: 3, pace: "4:44" },
//   ]
//
// Two interval blocks (different distances):
//   steps: [
//     { type: "easy",      km: 2,   label: "warmup" },
//     { type: "intervals", reps: 4, km: 1.6, pace: "4:35", rest: 3 },
//     { type: "recovery",  mins: 3 },
//     { type: "intervals", reps: 4, m: 400,  pace: "4:10", rest: 1 },
//     { type: "easy",      km: 2,   label: "cooldown" },
//   ]
//
// Easy run with strides (Thursday session):
//   steps: [
//     { type: "strides", km: 8, count: 4 },
//   ]
//
// Race-week activation (short jog + a few strides):
//   steps: [
//     { type: "easy",    km: 3 },
//     { type: "strides", count: 2 },
//   ]
// =============================================================================

const PLAN = [

  // ── Week 1: Base ────────────────────────────────────────────────────────────
  { week: 1, day: "tue", steps: [
    { type: "easy",      km: 2,   label: "warmup" },
    { type: "intervals", reps: 6, km: 1,   pace: "4:30", rest: 2 },
    { type: "easy",      km: 2,   label: "cooldown" },
  ]},
  { week: 1, day: "thu", steps: [{ type: "strides", km: 8,  count: 4 }]},
  { week: 1, day: "sun", steps: [{ type: "easy",    km: 13 }]},

  // ── Week 2: Base ────────────────────────────────────────────────────────────
  { week: 2, day: "tue", steps: [
    { type: "easy",      km: 2,   label: "warmup" },
    { type: "intervals", reps: 7, km: 1,   pace: "4:30", rest: 2 },
    { type: "easy",      km: 2,   label: "cooldown" },
  ]},
  { week: 2, day: "thu", steps: [{ type: "strides", km: 9,  count: 4 }]},
  { week: 2, day: "sun", steps: [{ type: "easy",    km: 14 }]},

  // ── Week 3: Bridge — final 1000m week ─────────────────────────────────────
  { week: 3, day: "tue", steps: [
    { type: "easy",      km: 2,   label: "warmup" },
    { type: "intervals", reps: 8, km: 1,   pace: "4:30", rest: 2 },
    { type: "easy",      km: 2,   label: "cooldown" },
  ]},
  { week: 3, day: "thu", steps: [{ type: "strides", km: 10, count: 5 }]},
  { week: 3, day: "sun", steps: [{ type: "easy",    km: 15 }]},

  // ── Week 4: Build / 1600m introduction ────────────────────────────────────
  { week: 4, day: "tue", steps: [
    { type: "easy",      km: 2,   label: "warmup" },
    { type: "intervals", reps: 5, m: 1600, pace: "4:35", rest: 3 },
    { type: "easy",      km: 2,   label: "cooldown" },
  ]},
  { week: 4, day: "thu", steps: [{ type: "strides", km: 10, count: 5 }]},
  { week: 4, day: "sun", steps: [
    { type: "easy",  km: 12 },
    { type: "tempo", km: 3,  pace: "4:44" },
  ]},

  // ── Week 5: Build / volume increase ───────────────────────────────────────
  { week: 5, day: "tue", steps: [
    { type: "easy",      km: 2,   label: "warmup" },
    { type: "intervals", reps: 6, m: 1600, pace: "4:35", rest: 3 },
    { type: "easy",      km: 2,   label: "cooldown" },
  ]},
  { week: 5, day: "thu", steps: [{ type: "strides", km: 10, count: 6 }]},
  { week: 5, day: "sun", steps: [
    { type: "easy",  km: 12 },
    { type: "tempo", km: 4,  pace: "4:44" },
  ]},

  // ── Week 6: PEAK ──────────────────────────────────────────────────────────
  { week: 6, day: "tue", steps: [
    { type: "easy",      km: 2,   label: "warmup" },
    { type: "intervals", reps: 8, km: 1,   pace: "4:30", rest: 2 },
    { type: "easy",      km: 2,   label: "cooldown" },
  ]},
  { week: 6, day: "thu", steps: [{ type: "strides", km: 12, count: 6 }]},
  { week: 6, day: "sun", steps: [
    { type: "easy",  km: 12 },
    { type: "tempo", km: 6,  pace: "4:44" },
  ]},

  // ── Week 7: DELOAD ────────────────────────────────────────────────────────
  { week: 7, day: "tue", steps: [
    { type: "easy",      km: 2,   label: "warmup" },
    { type: "intervals", reps: 6, km: 1,   pace: "4:30", rest: 2 },
    { type: "easy",      km: 2,   label: "cooldown" },
  ]},
  { week: 7, day: "thu", steps: [{ type: "strides", km: 10, count: 6 }]},
  { week: 7, day: "sun", steps: [
    { type: "easy",  km: 10 },
    { type: "tempo", km: 5,  pace: "4:44" },
  ]},

  // ── Week 8: Second peak ───────────────────────────────────────────────────
  { week: 8, day: "tue", steps: [
    { type: "easy",      km: 2,   label: "warmup" },
    { type: "intervals", reps: 5, m: 1600, pace: "4:35", rest: 3 },
    { type: "easy",      km: 2,   label: "cooldown" },
  ]},
  { week: 8, day: "thu", steps: [{ type: "strides", km: 10, count: 6 }]},
  { week: 8, day: "sun", steps: [
    { type: "easy",  km: 12 },
    { type: "tempo", km: 6,  pace: "4:44" },
  ]},

  // ── Week 9: TAPER ─────────────────────────────────────────────────────────
  { week: 9, day: "tue", steps: [
    { type: "easy",      km: 2,   label: "warmup" },
    { type: "intervals", reps: 4, m: 800,  pace: "4:30", rest: 2 },
    { type: "easy",      km: 2,   label: "cooldown" },
  ]},
  { week: 9, day: "thu", steps: [{ type: "strides", km: 8,  count: 4 }]},
  { week: 9, day: "sun", steps: [{ type: "easy",    km: 14 }]},

  // ── Week 10: RACE WEEK ────────────────────────────────────────────────────
  { week: 10, day: "tue", steps: [
    { type: "easy",      km: 2,   label: "warmup" },
    { type: "intervals", reps: 4, m: 400,  pace: "4:44", rest: 2 },
    { type: "easy",      km: 2,   label: "cooldown" },
  ]},
  { week: 10, day: "thu", steps: [
    { type: "easy",    km: 3 },
    { type: "strides", count: 2 },
  ]},
  // Sunday week 10 = race day, no workout

];

const BASE = "https://connect.garmin.com/gc-api";

// =============================================================================
// AUTH
// =============================================================================

// Fetch CSRF token automatically from an active Garmin Connect API request.
// No manual copying needed — the browser already has an active session.
let CSRF;
try {
  const probe = await fetch(`${BASE}/web-gateway/users/displayName`, {
    credentials: "include"
  });
  CSRF = probe.headers.get("connect-csrf-token") ||
         document.cookie.match(/CSRF[^=]*=([^;]+)/i)?.[1];
} catch (_) {}

if (!CSRF) {
  // Fallback: ask user if auto-detection failed
  CSRF = prompt(
    "Auto-detection failed. Paste connect-csrf-token manually:\n" +
    "(F12 → Network → any gc-api request → Request Headers)"
  );
}
if (!CSRF) { console.error("No CSRF token found. Make sure you are logged in at connect.garmin.com."); return; }

// =============================================================================
// API
// =============================================================================

const apiHeaders = {
  "content-type":       "application/json",
  "connect-csrf-token": CSRF,
  "nk":                 "NT",
  "x-app-ver":          "5.23.0.33",
  "x-lang":             "en-US",
  "x-requested-with":   "XMLHttpRequest",
};

async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST", headers: apiHeaders,
    body: JSON.stringify(body), credentials: "include",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function uploadWorkout(workout) {
  const data = await apiPost(`${BASE}/workout-service/workout`, workout);
  return data.workoutId ?? data.workout?.workoutId;
}

async function scheduleWorkout(workoutId, dateStr) {
  await apiPost(`${BASE}/workout-service/schedule/${workoutId}`, { date: dateStr });
}

// =============================================================================
// DATE UTILITIES
// =============================================================================

const DAY_OFFSET = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6 };

function toMonday(dateStr) {
  const d = new Date(dateStr);
  const shift = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + shift);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const planStart = toMonday(START_DATE);
console.log(`Plan start (Monday): ${planStart.toISOString().slice(0, 10)}`);

function workoutDate(week, day) {
  if (!(day in DAY_OFFSET)) throw new Error(`Unknown day: "${day}". Use mon/tue/wed/thu/fri/sat/sun.`);
  return addDays(planStart, (week - 1) * 7 + DAY_OFFSET[day]);
}

// =============================================================================
// DISTANCE HELPER
// Resolves km/m fields to metres. km takes precedence over m.
// =============================================================================

function resolveM(step, defaultKm = 1) {
  if (step.km != null) return Math.round(step.km * 1000);
  if (step.m  != null) return Math.round(step.m);
  return Math.round(defaultKm * 1000);
}

// =============================================================================
// GARMIN STEP PRIMITIVES
// =============================================================================

const SPORT_RUNNING = { sportTypeId: 1, sportTypeKey: "running", displayOrder: 1 };

const COND = {
  distance:   () => ({ conditionTypeId: 3, conditionTypeKey: "distance",   displayOrder: 3, displayable: true  }),
  time:       () => ({ conditionTypeId: 2, conditionTypeKey: "time",        displayOrder: 2, displayable: true  }),
  iterations: () => ({ conditionTypeId: 7, conditionTypeKey: "iterations",  displayOrder: 7, displayable: false }),
};

const NO_TARGET = {
  targetType:      { workoutTargetTypeId: 1, workoutTargetTypeKey: "no.target", displayOrder: 1 },
  targetValueOne:  null,
  targetValueTwo:  null,
  targetValueUnit: null,
};

function paceZone(paceStr) {
  const [m, s] = paceStr.split(":").map(Number);
  const center = m * 60 + s; // sec/km
  return {
    targetType:      { workoutTargetTypeId: 6, workoutTargetTypeKey: "pace.zone", displayOrder: 6 },
    targetValueOne:  parseFloat((1000 / (center + 5)).toFixed(7)),
    targetValueTwo:  parseFloat((1000 / (center - 5)).toFixed(7)),
    targetValueUnit: null,
  };
}

/**
 * Heart rate target.
 * Accepts:
 *   hrZone: 1-5        → looks up bpm range from HR_ZONES config
 *   hr: 155            → single value, uses ±10 bpm window
 *   hr: [140, 165]     → explicit [min, max] bpm range
 */
function hrTarget(stepDef) {
  let min, max;

  if (stepDef.hrZone != null) {
    const zone = HR_ZONES[stepDef.hrZone];
    if (!zone) throw new Error(`Unknown hrZone: ${stepDef.hrZone}. Valid: 1-5`);
    [min, max] = zone;

  } else if (Array.isArray(stepDef.hr)) {
    [min, max] = stepDef.hr;

  } else if (typeof stepDef.hr === "number") {
    min = stepDef.hr - 10;
    max = stepDef.hr + 10;

  } else {
    return null; // no HR target
  }

  return {
    targetType:      { workoutTargetTypeId: 2, workoutTargetTypeKey: "heart.rate.zone", displayOrder: 2 },
    targetValueOne:  min,
    targetValueTwo:  max,
    targetValueUnit: null,
  };
}

/**
 * Resolve the target for a step.
 * Priority: pace > hrZone / hr > none
 */
function resolveTarget(stepDef) {
  if (stepDef.pace)                            return paceZone(stepDef.pace);
  const hr = hrTarget(stepDef);
  if (hr)                                      return hr;
  return NO_TARGET;
}

let _stepId = 0;
const nextId = () => ++_stepId;

function execStep(typeId, typeKey, typeDisplay, endCond, endVal, target) {
  const id = nextId();
  const { targetType, ...targetFields } = target;
  return {
    type: "ExecutableStepDTO", stepId: id, stepOrder: id,
    stepType: { stepTypeId: typeId, stepTypeKey: typeKey, displayOrder: typeDisplay },
    endCondition: endCond, endConditionValue: endVal,
    targetType, ...targetFields,
    category: null, exerciseName: null, stepAudioNote: null,
  };
}

// Garmin step type IDs: 1=warmup, 2=cooldown, 3=interval, 4=recovery, 6=repeat
const GS = {
  warmup:   (dist, target = NO_TARGET) => execStep(1, "warmup",   1, COND.distance(), dist, target),
  cooldown: (dist, target = NO_TARGET) => execStep(2, "cooldown", 2, COND.distance(), dist, target),
  run:      (dist, target = NO_TARGET) => execStep(3, "interval", 3, COND.distance(), dist, target),
  recovery: (secs)                     => execStep(4, "recovery", 4, COND.time(),     secs, NO_TARGET),
  recoDist: (dist)                     => execStep(4, "recovery", 4, COND.distance(), dist, NO_TARGET),
};

function repeatGroup(reps, children) {
  const id = nextId();
  return {
    type: "RepeatGroupDTO", stepId: id, stepOrder: id,
    stepType: { stepTypeId: 6, stepTypeKey: "repeat", displayOrder: 6 },
    numberOfIterations: reps, childStepId: 1,
    endCondition: COND.iterations(), endConditionValue: reps,
    workoutSteps: children,
  };
}

// =============================================================================
// STEP COMPILER
// =============================================================================

const RECOVERY_PACE_SEC_KM = 330; // ~5:30/km — used to estimate recovery distance

function compileStep(stepDef) {
  switch (stepDef.type) {

    // ── easy ──────────────────────────────────────────────────────────────
    case "easy": {
      const distM  = resolveM(stepDef, 1);
      const target = resolveTarget(stepDef);
      let garminStep;
      if      (stepDef.label === "warmup")   garminStep = GS.warmup(distM, target);
      else if (stepDef.label === "cooldown") garminStep = GS.cooldown(distM, target);
      else                                   garminStep = GS.run(distM, target);
      return { garminSteps: [garminStep], distM };
    }

    // ── tempo ─────────────────────────────────────────────────────────────
    case "tempo": {
      if (!stepDef.pace && stepDef.hr == null && stepDef.hrZone == null)
        throw new Error('"tempo" step requires pace, hr, or hrZone');
      const distM = resolveM(stepDef, 1);
      return { garminSteps: [GS.run(distM, resolveTarget(stepDef))], distM };
    }

    // ── intervals ─────────────────────────────────────────────────────────
    case "intervals": {
      if (stepDef.reps == null) throw new Error('"intervals" step requires reps');
      if (!stepDef.pace && stepDef.hr == null && stepDef.hrZone == null)
        throw new Error('"intervals" step requires pace, hr, or hrZone');
      const distM     = resolveM(stepDef, 1);
      const restSecs  = Math.round((stepDef.rest ?? 2) * 60);
      const recovDist = Math.round(restSecs / RECOVERY_PACE_SEC_KM * 1000);
      return {
        garminSteps: [
          repeatGroup(stepDef.reps, [
            GS.run(distM, resolveTarget(stepDef)),
            GS.recovery(restSecs),
          ]),
        ],
        distM: stepDef.reps * distM + stepDef.reps * recovDist,
      };
    }

    // ── strides ───────────────────────────────────────────────────────────
    case "strides": {
      if (stepDef.count == null) throw new Error('"strides" step requires count');
      const easyDistM   = resolveM(stepDef, 0);
      const stridePace  = stepDef.pace ?? "3:00";
      const restSecs    = Math.round(stepDef.rest ?? 90);
      const strideDistM = stepDef.count * 100;
      const recovDistM  = stepDef.count * Math.round(restSecs / RECOVERY_PACE_SEC_KM * 1000);
      const garminSteps = [];
      if (easyDistM > 0) garminSteps.push(GS.run(easyDistM));
      garminSteps.push(
        repeatGroup(stepDef.count, [
          GS.run(100, paceZone(stridePace)),
          GS.recovery(restSecs),
        ])
      );
      return { garminSteps, distM: easyDistM + strideDistM + recovDistM };
    }

    // ── recovery ──────────────────────────────────────────────────────────
    case "recovery": {
      if (stepDef.km != null || stepDef.m != null) {
        const distM = resolveM(stepDef, 1);
        return { garminSteps: [GS.recoDist(distM)], distM };
      }
      const secs  = Math.round((stepDef.mins ?? 5) * 60);
      const distM = Math.round(secs / RECOVERY_PACE_SEC_KM * 1000);
      return { garminSteps: [GS.recovery(secs)], distM };
    }

    default:
      throw new Error(
        `Unknown step type: "${stepDef.type}". ` +
        `Valid types: easy, tempo, intervals, strides, recovery`
      );
  }
}

// =============================================================================
// AUTO NAME GENERATOR
// =============================================================================

function mStr(distM) {
  return distM % 1000 === 0 ? `${distM / 1000}km` : `${distM}m`;
}

function targetLabel(s) {
  if (s.pace)              return `@${s.pace}`;
  if (s.hrZone != null)    return `Z${s.hrZone}`;
  if (Array.isArray(s.hr)) return `${s.hr[0]}-${s.hr[1]}bpm`;
  if (s.hr != null)        return `~${s.hr}bpm`;
  return "";
}

function autoName(steps) {
  return steps.map(s => {
    const tgt = targetLabel(s);
    switch (s.type) {
      case "easy": {
        const distM  = resolveM(s, 1);
        const suffix = s.label ? ` (${s.label})` : "";
        return tgt ? `${mStr(distM)} easy ${tgt}${suffix}` : `${mStr(distM)} easy${suffix}`;
      }
      case "tempo": {
        const distM = resolveM(s, 1);
        return `${mStr(distM)} ${tgt}`;
      }
      case "intervals": {
        const distM = resolveM(s, 1);
        return `${s.reps}×${mStr(distM)} ${tgt}`;
      }
      case "strides": {
        const easyDistM = resolveM(s, 0);
        return easyDistM > 0
          ? `${mStr(easyDistM)} + ${s.count}×100m strides`
          : `${s.count}×100m strides`;
      }
      case "recovery": {
        if (s.km != null || s.m != null) return `${mStr(resolveM(s, 1))} recovery`;
        return `${s.mins ?? 5}min recovery`;
      }
      default: return s.type;
    }
  }).join(", ");
}

function autoDescription(steps) {
  return steps.map(s => {
    const tgt = targetLabel(s);
    const tgtFull = s.pace ? `@${s.pace}/km`
                 : s.hrZone != null    ? `Z${s.hrZone} (${HR_ZONES[s.hrZone]?.[0]}-${HR_ZONES[s.hrZone]?.[1]} bpm)`
                 : Array.isArray(s.hr) ? `${s.hr[0]}-${s.hr[1]} bpm`
                 : s.hr != null        ? `~${s.hr} bpm (±10)`
                 : "";
    switch (s.type) {
      case "easy":      return `${mStr(resolveM(s, 1))} easy${tgtFull ? " " + tgtFull : ""}`;
      case "tempo":     return `${mStr(resolveM(s, 1))} ${tgtFull}`;
      case "intervals": return `${s.reps}×${mStr(resolveM(s, 1))} ${tgtFull}, ${s.rest ?? 2}min rest`;
      case "strides": {
        const easy = resolveM(s, 0);
        return (easy > 0 ? `${mStr(easy)} easy + ` : "") + `${s.count}×100m strides`;
      }
      case "recovery":
        return s.km != null || s.m != null
          ? `${mStr(resolveM(s, 1))} recovery`
          : `${s.mins ?? 5}min recovery`;
      default: return s.type;
    }
  }).join(" | ");
}

// =============================================================================
// WORKOUT BUILDER
// =============================================================================

function buildWorkout(entry) {
  _stepId = 0;

  const garminSteps = [];
  let   totalDistM  = 0;

  for (const stepDef of entry.steps) {
    const { garminSteps: compiled, distM } = compileStep(stepDef);
    garminSteps.push(...compiled);
    totalDistM += distM;
  }

  const name    = entry.name ?? autoName(entry.steps);
  const estMins = entry.estMins ?? Math.round(totalDistM / 1000 / 0.165); // ~6 min/km default
  const avgSpeed = totalDistM > 0
    ? parseFloat((totalDistM / (estMins * 60)).toFixed(7))
    : 2.7282825;

  return {
    workoutName:               name,
    description:               autoDescription(entry.steps),
    sportType:                 SPORT_RUNNING,
    subSportType:              null,
    isWheelchair:              false,
    estimatedDurationInSecs:   estMins * 60,
    estimatedDistanceInMeters: totalDistM,
    avgTrainingSpeed:          avgSpeed,
    estimateType:              null,
    estimatedDistanceUnit:     { unitKey: null },
    workoutSegments: [{
      segmentOrder: 1,
      sportType:    SPORT_RUNNING,
      workoutSteps: garminSteps,
    }],
  };
}

// =============================================================================
// UPLOAD & SCHEDULE
// =============================================================================

console.log(`\nUploading ${PLAN.length} workouts to Garmin Connect...\n`);
let success = 0, failed = 0;

for (const entry of PLAN) {
  const dateStr = workoutDate(entry.week, entry.day);
  let workout;

  try {
    workout = buildWorkout(entry);
  } catch (err) {
    console.error(`✗ [Week ${entry.week} ${entry.day}] Build error: ${err.message}`);
    failed++;
    continue;
  }

  const label = `[Week ${entry.week} ${entry.day.toUpperCase()}]`;

  try {
    const id = await uploadWorkout(workout);
    await scheduleWorkout(id, dateStr);
    console.log(`✓ ${label} ${workout.workoutName} → ${dateStr}  (ID: ${id})`);
    success++;
  } catch (err) {
    console.error(`✗ ${label} ${workout.workoutName}: ${err.message}`);
    failed++;
  }

  await new Promise(r => setTimeout(r, 350));
}

console.log(`\n${"─".repeat(60)}`);
console.log(`Done: ${success} uploaded, ${failed} failed`);
if (success > 0) {
  console.log("View your calendar: https://connect.garmin.com/modern/calendar");
}

})();
