# garmin-workout-importer

> Browser-console script to bulk-upload a structured running plan to Garmin Connect — no API key, no OAuth, no install.

Paste one file into your browser's DevTools console while logged into Garmin Connect. It uploads structured workouts and schedules them automatically in your calendar. No external dependencies, no tokens to manage, no Python or Node required.

The script ships with a ready-to-run 10-week sub-1:40 half marathon example plan. Edit it to match your own training before running — or just change the start date and go.

---

## Example plan — 10 weeks to sub-1:40 half marathon

The script includes a ready-made plan as a starting point. You can use it as-is, tweak the paces, or replace it entirely with your own sessions — see [Customising the plan](#customising-the-plan) below.

Goal pace: **4:44 min/km** | Sessions: Tuesday intervals + Thursday easy/strides + Sunday long run

| Week | Phase | Tuesday | Thursday | Sunday |
|---|---|---|---|---|
| 1–2 | Base | 6–7 × 1000m @4:30 | 8–9km easy + strides | 13–14km easy |
| 3 | Bridge | 8 × 1000m @4:30 | 10km easy + strides | 15km easy |
| 4–5 | Build | 5–6 × 1600m @4:35 | 10km easy + strides | 12km + tempo finish |
| 6 | **PEAK** | 8 × 1000m @4:30 | 12km easy + strides | 12km + 6km @4:44 |
| 7 | **Deload** | 6 × 1000m @4:30 | 10km easy + strides | 10km + 5km @4:44 |
| 8 | Second peak | 5 × 1600m @4:35 | 10km easy + strides | 12km + 6km @4:44 |
| 9 | **Taper** | 4 × 800m @4:30 | 8km easy + strides | 14km easy |
| 10 | **Race week** | 4 × 400m @4:44 | 3km + 2 strides | 🏁 Race day |

Weekly volume peaks at ~52–56 km in week 6, then drops through deload and two taper weeks.

---

## Quick start

### 1. Set your start date

Open `upload_running_plan.js` and edit the line at the top:

```javascript
const START_DATE = "2026-04-01";  // First Monday of your training plan
```

### 2. Edit the plan (or keep the example)

Scroll down to the `PLAN` array in the script. The included plan is a 10-week sub-1:40 half marathon programme — use it as-is or replace it with your own sessions.

At minimum, check that the paces match your current fitness:
- `"4:30"` — 1000m interval pace (should feel hard but controlled)
- `"4:35"` — 1600m interval pace
- `"4:44"` — goal race pace (long run tempo finish)

Not sure? Keep the defaults, start week 1, and adjust based on how it feels.

### 3. Run the script

1. Open **[connect.garmin.com](https://connect.garmin.com)** in your browser and log in
2. Press **F12** → **Console** tab
3. Copy the entire contents of `upload_running_plan.js`
4. Paste into the console and press **Enter**

Console output:

```
Plan start (Monday): 2026-04-01
Uploading 29 workouts to Garmin Connect...

✓ [Week 1 TUE] 2km easy (warmup), 6×1km @4:30, 2km easy (cooldown) → 2026-04-01  (ID: 1234567)
✓ [Week 1 THU] 8km easy + 4×100m strides → 2026-04-03  (ID: 1234568)
✓ [Week 1 SUN] 13km easy → 2026-04-06  (ID: 1234569)
...
────────────────────────────────────────────────────────────
Done: 29 uploaded, 0 failed
View your calendar: https://connect.garmin.com/modern/calendar
```

Workouts sync to your watch automatically once the calendar is updated.

---

## Date formats

Each plan entry must specify when the workout happens. Three formats are supported and can be mixed freely:

```javascript
// 1. Exact date — scheduled on this specific day
{ date: "2026-04-01", steps: [...] }

// 2. Week + day — relative to START_DATE at the top of the script
{ week: 1, day: "tue", steps: [...] }

// 3. Day only — first occurrence of that weekday strictly after the previous entry
{ day: "wed", steps: [...] }
```

**Day-only** is useful when mixing with exact dates or when you prefer not to count weeks manually:

```javascript
{ date: "2026-04-01", steps: [...] }  // Wednesday April 1
{ day: "fri",         steps: [...] }  // → Friday April 3  (next Friday after Apr 1)
{ day: "sun",         steps: [...] }  // → Sunday April 5  (next Sunday after Apr 3)
{ day: "tue",         steps: [...] }  // → Tuesday April 7 (next Tuesday after Apr 5)
```

All three formats produce the same console output — `✓ [Week 1 TUE] ... → 2026-04-01` — so you always see the resolved date.

---

## Step reference

Each workout is a list of `steps` in order. Every step has a `type` and some parameters.

**Distance** can be given as `km` or `m` in every step type — they are interchangeable:

```javascript
{ type: "easy", km: 2 }       // 2 kilometres
{ type: "easy", m: 2000 }     // same thing
```

If both are provided, `km` takes precedence. If neither is provided, a default is used (noted per type below).

---

### Distance or duration

Every step accepts **distance** (`km` or `m`) **or duration** (`mins` or `secs`) — not both. Priority when multiple are given: `km` > `m` > `mins` > `secs`.

```javascript
{ type: "easy", km: 10 }        // 10 kilometres
{ type: "easy", m: 10000 }      // same
{ type: "easy", mins: 45 }      // 45 minutes
{ type: "easy", secs: 2700 }    // same (45 × 60)
```

Time-based steps have their distance estimated at ~5:30/km for the workout summary and calendar entry.

---

### Target — pace or heart rate

Every step (except `strides` and `recovery`) accepts one optional target. Priority: `pace` > `hrZone` > `hr` > none.

| Parameter | Type | Description |
|---|---|---|
| `pace` | `"M:SS"` | Pace zone ±5 sec/km. E.g. `"4:30"` |
| `hrZone` | `1`–`5` | HR zone from the `HR_ZONES` config at the top of the script |
| `hr` | `number` | Single HR value, watch shows ±10 bpm. E.g. `hr: 150` |
| `hr` | `[min, max]` | Explicit bpm range. E.g. `hr: [140, 165]` |

Edit `HR_ZONES` at the top of the script to match your zones from Garmin Connect → User Settings → Heart Rate Zones.

---

### `"easy"` — easy run

Conversational pace. No target by default.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `km` | number | one of km/m/mins/secs | — | Distance in kilometres |
| `m` | number | one of km/m/mins/secs | — | Distance in metres |
| `mins` | number | one of km/m/mins/secs | — | Duration in minutes |
| `secs` | number | one of km/m/mins/secs | — | Duration in seconds |
| `pace` | string | no | — | Soft pace zone |
| `hrZone` | number | no | — | HR zone target (alternative to pace) |
| `hr` | number\|array | no | — | HR bpm target (alternative to pace/hrZone) |
| `label` | string | no | — | `"warmup"` or `"cooldown"` — changes step colour in the app |

```javascript
{ type: "easy", km: 2,    label: "warmup" }
{ type: "easy", km: 10 }
{ type: "easy", mins: 45 }                     // 45-minute easy run
{ type: "easy", mins: 30, hrZone: 2 }          // 30min in Z2
{ type: "easy", km: 8,    hr: [130, 148] }     // specific bpm range
{ type: "easy", km: 3,    pace: "5:30" }       // soft pace zone
```

---

### `"tempo"` — race-pace run

Continuous effort at a fixed target. Watch shows a ±5 sec/km pace zone or bpm range.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `km` | number | one of km/m/mins/secs | — | Distance in kilometres |
| `m` | number | one of km/m/mins/secs | — | Distance in metres |
| `mins` | number | one of km/m/mins/secs | — | Duration in minutes |
| `secs` | number | one of km/m/mins/secs | — | Duration in seconds |
| `pace` | string | one of pace/hrZone/hr | — | Target pace, e.g. `"4:44"` |
| `hrZone` | number | one of pace/hrZone/hr | — | HR zone target |
| `hr` | number\|array | one of pace/hrZone/hr | — | HR bpm target |

```javascript
{ type: "tempo", km: 6,    pace: "4:44" }
{ type: "tempo", mins: 20, pace: "4:44" }      // 20min at race pace
{ type: "tempo", km: 5,    hrZone: 4 }         // threshold by HR zone
{ type: "tempo", mins: 25, hr: [160, 174] }    // 25min in threshold bpm range
```

---

### `"intervals"` — repeated efforts

Structured reps with timed recovery. Watch counts down each rep and rest period.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `reps` | number | **yes** | — | Number of repetitions |
| `km` | number | one of km/m/mins/secs | — | Interval distance in kilometres |
| `m` | number | one of km/m/mins/secs | — | Interval distance in metres |
| `mins` | number | one of km/m/mins/secs | — | Interval duration in minutes |
| `secs` | number | one of km/m/mins/secs | — | Interval duration in seconds |
| `pace` | string | one of pace/hrZone/hr | — | Target pace, e.g. `"4:30"` |
| `hrZone` | number | one of pace/hrZone/hr | — | HR zone target |
| `hr` | number\|array | one of pace/hrZone/hr | — | HR bpm target |
| `rest` | number | no | 2 | Recovery between reps in **minutes** |

```javascript
{ type: "intervals", reps: 6, km: 1,    pace: "4:30", rest: 2 }
{ type: "intervals", reps: 5, m: 1600,  pace: "4:35", rest: 3 }
{ type: "intervals", reps: 8, mins: 3,  pace: "4:30", rest: 2 }    // 8×3min
{ type: "intervals", reps: 6, secs: 90, pace: "4:20", rest: 1 }    // 6×90s
{ type: "intervals", reps: 6, km: 1,    hrZone: 4,    rest: 2 }    // by HR zone
```

---

### `"strides"` — easy run with accelerations

Easy run followed by short 100m sprints. Good for activation and neuromuscular stimulus.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `count` | number | **yes** | — | Number of 100m strides |
| `km` | number | no | 0 | Easy running distance before strides |
| `m` | number | no | — | Easy distance in metres |
| `pace` | string | no | `"3:00"` | Target pace for each stride |
| `rest` | number | no | 90 | Recovery between strides in **seconds** |

```javascript
{ type: "strides", km: 8, count: 4 }                      // 8km easy then 4×100m
{ type: "strides", count: 2, pace: "2:50" }               // 2 strides only, faster pace
{ type: "strides", km: 10, count: 6, rest: 60 }           // shorter recovery
```

---

### `"recovery"` — explicit rest block

Useful between two interval sets or as a standalone rest period.

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `km` | number | one of km/m/mins | — | Recovery jog distance in kilometres |
| `m` | number | one of km/m/mins | — | Recovery jog distance in metres |
| `mins` | number | one of km/m/mins | 5 | Time-based recovery in minutes (used if no distance given) |

```javascript
{ type: "recovery", km: 1 }       // jog 1km as recovery
{ type: "recovery", mins: 3 }     // 3 minutes standing/walking
{ type: "recovery", m: 400 }      // 400m jog recovery
```

---

## Plan structure

A session entry has these fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `date` | string | one of date / week+day / day | Exact date `"YYYY-MM-DD"` |
| `week` | number | one of date / week+day / day | Week number (used with `day`) |
| `day` | string | one of date / week+day / day | `"mon"` `"tue"` `"wed"` `"thu"` `"fri"` `"sat"` `"sun"` |
| `steps` | array | yes | Ordered list of step objects |
| `name` | string | no | Custom workout name (auto-generated if omitted) |
| `estMins` | number | no | Estimated duration in minutes (auto-calculated if omitted) |

All seven days of the week are supported. Garmin only supports one workout per calendar day — scheduling two entries on the same date will create two separate workouts on that day.

---

## Customising the plan

**Change goal pace:** Replace all instances of `"4:44"` with your target pace.

**Change interval pace:** Replace `"4:30"` (1000m sessions) or `"4:35"` (1600m sessions).

**Add a session on another day:**
```javascript
{ week: 2, day: "sat", steps: [{ type: "easy", km: 10 }]},
```

**Two interval blocks in one session:**
```javascript
{ week: 5, day: "tue", steps: [
  { type: "easy",      km: 2,   label: "warmup" },
  { type: "intervals", reps: 4, m: 1600, pace: "4:35", rest: 3 },
  { type: "recovery",  mins: 3 },
  { type: "intervals", reps: 4, m: 400,  pace: "4:10", rest: 1 },
  { type: "easy",      km: 2,   label: "cooldown" },
]},
```

**Progressive long run (two tempo blocks at different paces):**
```javascript
{ week: 6, day: "sun", steps: [
  { type: "easy",  km: 6 },
  { type: "tempo", km: 4, pace: "5:00" },
  { type: "easy",  km: 2 },
  { type: "tempo", km: 4, pace: "4:44" },
]},
```

---

## How it works

Garmin Connect's web app communicates with an internal REST API at `connect.garmin.com/gc-api`. This script uses the same endpoints:

- `POST /workout-service/workout` — creates a structured workout
- `POST /workout-service/schedule/{id}` — places it on a calendar date

Authentication uses the browser's existing session cookies. The only extra credential needed is the CSRF token, which is already in every request the web app makes.

**Workout structure:**

```
Workout
└── WorkoutSegment
    ├── ExecutableStepDTO  (warmup — 2km, no pace target)
    ├── RepeatGroupDTO     (N repetitions)
    │   ├── ExecutableStepDTO  (interval — distance + pace zone target)
    │   └── ExecutableStepDTO  (recovery — time-based)
    └── ExecutableStepDTO  (cooldown — 2km, no pace target)
```

Pace targets are stored as m/s with a ±5 sec/km window around the target:

```
4:30/km = 270 sec/km
  faster bound: 1000 / 265 ≈ 3.7736 m/s
  slower bound: 1000 / 275 ≈ 3.6364 m/s
```

---

## Troubleshooting

**`HTTP 403 Forbidden`**  
Your session has expired. Refresh connect.garmin.com, log in again, and re-run the script.

**`HTTP 429 Too Many Requests`**  
Garmin rate-limited your session. Wait 15–30 minutes and try again. This usually happens after repeated failed login attempts from external tools (not from this script).

**Workout uploads but shows `NaN:NaN /km` pace**  
You may be running an older version of the script. The `targetValueOne`/`targetValueTwo` fields must be at the step level, not nested inside `targetType`. Pull the latest version.

**Build error: "Unknown step type"**  
A step in your plan uses a `type` that isn't supported. Valid values: `easy`, `tempo`, `intervals`, `strides`, `recovery`.

---

## Limitations

- Must be logged in at connect.garmin.com when running the script
- CSRF token is detected automatically — just make sure you are logged in when running the script
- Garmin's internal API is undocumented and may change without notice
- One workout per day per week — Garmin doesn't support multiple scheduled workouts on the same date

---

## Contributing

PRs welcome. The step compiler (`compileStep`) and Garmin primitives (`GS`, `repeatGroup`) are generic — they can support any running plan structure, not just the one included here.

---

## License

MIT
