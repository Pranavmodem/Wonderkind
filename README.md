# Wonderkind

Wonderkind is a learning game for kids aged 4 to 18. It teaches math, physics and chemistry in order, from counting to
calculus, AP Physics and AP Chemistry, on computers, phones and tablets. The repo started as MathCan, a Python mental-math
practice tool, which still lives here as a small CLI.

## Features
- **Wonderkind** (in `web/`): 1,669 lessons in 145 worlds across math, physics and chemistry, with a buddy who reads
  aloud and cheers kids on, a night galaxy and a day dawn look, hands-on activities, and a grown-ups area.
- **MathCan CLI** (in `math_can/`): random addition, subtraction, multiplication and division problems in the terminal,
  plus an experimental Streamlit webapp.

## Project Structure

```
wonderkind/
├── web/                         # Wonderkind (React + Vite)
│   ├── src/game/
│   │   ├── levels/              # Math age bands (+ .gen.ts generators, .test.ts checks)
│   │   ├── levels/physics/      # Physics age bands, K–12 and AP Physics 1 and 2
│   │   ├── levels/chemistry/    # Chemistry age bands, K–12 and AP Chemistry
│   │   ├── science/             # Physics and chemistry picture/activity types, checks, periodic table
│   │   ├── curriculum.ts        # Loads every subject's age bands in teaching order
│   │   ├── standards.ts         # Common Core math, NGSS physical science, AP Calculus/Physics/Chemistry topics
│   │   ├── types.ts             # Question, Visual, Activity, Level, World
│   │   ├── validate.ts          # What every generated question must satisfy
│   │   ├── buddy.ts             # The kid's buddy and colour
│   │   ├── progress.ts          # Save data, grown-up settings, unlocking
│   │   └── sound.ts             # Sound effects and read-aloud
│   ├── src/components/          # Buddy, pictures, activities, equation, keypad
│   ├── src/screens/             # Welcome, map, learn, play, done, speed drills, grown-ups
│   ├── src/vendor/buddy.js      # The buddies' renderer, from AI-Buddy
│   ├── gallery.html             # Dev-only page showing every picture and activity
│   └── lessons.html             # Dev-only page showing one question from every lesson
├── math_can/
│   ├── app.py           # MathCan CLI entry point
│   ├── webapp.py        # Experimental Streamlit webapp
│   └── operators.py     # Math operator functions
├── tests/
│   ├── test_basic.py    # Basic test
│   └── test_math_can.py # Tests for math operations
├── pyproject.toml       # Python project metadata
└── README.md
```

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Pranavmodem/math-can.git
   cd math-can
   ```
2. (Optional) Create and activate a virtual environment:
   ```bash
   python3 -m venv mathcan_env
   source mathcan_env/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   # or, for testing only:
   pip install pytest
   ```

## Usage

### Wonderkind (web, phone, tablet)

A learning game for math, physics and chemistry that teaches every concept in order, from counting at age 4
to calculus, AP Physics and AP Chemistry at 18. Kids pick a buddy (Flare the little flame, or one of eight
friends) that reads each question aloud, cheers them on and reacts to every answer.

- **Three subjects, 1,669 lessons in 145 worlds.** Switch subjects at the top of the map.
  - Math (835 lessons, 75 worlds) follows the Common Core standards from Kindergarten through high school,
    plus the AP Calculus AB and BC topics.
  - Physics (463 lessons, 39 worlds) follows the NGSS physical science standards for forces, energy and waves,
    plus every AP Physics 1 and AP Physics 2 topic.
  - Chemistry (371 lessons, 31 worlds) follows the NGSS standards for matter and its interactions, plus every
    AP Chemistry topic.

  Worlds are grouped by age; each has 9 to 13 lessons and ends with a mixed Challenge. Every lesson is tagged
  with the standards it teaches, and a test fails if any standard in any subject has no lesson. The grown-ups
  area lists every standard and the lessons that cover it.
- **Night and day.** Night is a galaxy: finished lessons light up as lanterns along a glowing trail, with
  planets, comets and stardust. Day is a lavender dawn with the same design. It follows the device, or
  grown-ups can pick one.
- **Learn, then practice.** Each lesson starts with the big idea, then a worked example shown step by step
  (the problem, a strategy, the solution), then "your turn". Practice uses pictures before symbols: objects to
  tap and count, ten-frames, base-ten blocks, number lines, fraction bars, area models, clocks, coins, rulers,
  graphs, coordinate grids, unit circles and function plots. Science lessons add force diagrams, circuits,
  waves, ray diagrams, magnets, energy bar charts, atoms, molecules, particle boxes, chemical equations, lab
  glassware, energy profiles, titration curves and the periodic table.
- **Hands-on lessons.** Skills that aren't a quiz are done by hand: fill ten-frames, build numbers from blocks,
  make change, set clocks, trace numbers, draw shapes and lines, plot points, build graphs, shade and cut
  fractions, sort and order. In science: push a cart to a target, draw force arrows, build circuits, launch
  projectiles, balance a seesaw, match a wave, test magnets, balance equations, build atoms and molecules,
  change states with a temperature slider, mix to a ratio, find the limiting reactant and measure in
  glassware.
- **Gentle feedback.** A wrong answer gets a hint and a second try; the second miss shows the worked answer.
  Lessons mix in review questions from earlier lessons, and replays avoid questions seen recently.
- **Speed rounds.** Timed drills for times tables, division, adding, taking away, make 10/100, doubles and
  halves, squares, square roots, negative numbers and percents. They focus on facts the kid misses or is slow
  on, keep best scores, and show a times-table mastery grid.
- **Grown-ups area** (behind a parent gate): set the child's age, difficulty (easier, just right, harder),
  rewards (stars and celebrations, stars only, or no rewards at all), which worlds show, whether lessons unlock
  in order, sound, read-aloud and the reading voice.
- **Read-aloud** uses the most natural voice on the device and speaks math the way people say it
  ("3/4" as "three fourths", "−2" as "negative 2").

Requires Node 20+.

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173. To try it on a phone or tablet on the same Wi-Fi, run `npm run dev:device` and open
the network URL it prints. http://localhost:5173/gallery.html shows every visual model during development, and
http://localhost:5173/lessons.html shows one question from every lesson (add `?band=16-18` for one age band).

The layout adapts to phones, tablets (portrait and landscape) and desktop. It is also an installable web app:
on a phone or tablet, open the deployed site and use **Add to Home Screen** to get a full-screen app that works
offline. Install and offline mode need a production build served over HTTPS:

```bash
npm run build     # outputs web/dist, ready for any static host
npm test          # validates every lesson's questions and checks standards coverage
```

To add a lesson, write a generator that returns a `Question` (see `src/game/types.ts`), add a `Level` with its
standards and big idea to a world in `src/game/levels/`, and run `npm test`.

### CLI (Recommended)

To run the CLI math quiz:

```bash
python -m math_can.app
```

You will be prompted to select operations and answer random math questions interactively.

### Experimental Webapp

The webapp is in an experimental stage and may have bugs or incomplete features.

To run the Streamlit webapp:

```bash
streamlit run math_can/webapp.py
```

Then open the provided local URL in your browser.

## Testing

To run all tests:

```bash
pytest
```

## License

MIT
pytest
```

## Extending

- Add new math operations in `math_can/utils/operators.py` and expose them in `__init__.py`.
- Add new problem types or logic in `math_can/jobs/math_can.py`.
- Add more tests in the `tests/` directory.

## License

MIT
