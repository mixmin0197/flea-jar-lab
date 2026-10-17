# Flea Jailbreak Lab

[中文](README.md) · **English**

A flea is trapped in a jar with a net over the top. The food inside is limited; outside, it never runs out. Every jump costs energy, and every hit on the net injures the flea and shortens its life. What should it do to live as long as possible?

This project models that question as a **Markov decision process** and uses dynamic programming to compute the exact best choice in every situation, with a live demo in the browser. It starts from the popular “flea in a jar” fable, moves on to **learned helplessness** in psychology, and adds a changing net, a game between a jailer and the flea, and **tipping points** in decision making.

- **Try it online**: <https://mixmin0197.github.io/flea-jar-lab/?lang=en>
- **Interactive page**: [`index.html`](index.html), a single file you can also download and open in a browser. Switch between 中文 and English at the top right.
- **Explainer video (English)**: [`video/flea-video-en.mp4`](video/flea-video-en.mp4), 3:17, 1080p, no voice-over, with generated background music
- **Explainer video (Chinese)**: [`video/flea-video.mp4`](video/flea-video.mp4)

## What the page contains

| Section | What it shows |
|---|---|
| Live view | A flea following the optimal strategy: eating, resting, jumping, hitting the net, or escaping |
| Conditions | 11 preset scenarios, plus net density, hit damage, food, metabolism, death risks and more |
| Optimal strategy | Expected lifespan and the action sequence, compared with intuitive strategies such as “never jump”, “eat everything, then jump” and “full jump right away” |
| A changing net | The net can open once, on a schedule, at random or in bursts; the flea may or may not be able to see it |
| Jailer vs. flea | With the same amount of open time, which opening pattern makes escape hardest |
| Learned helplessness | The flea doesn’t know the net density and learns from its own hits; after the net is quietly removed, five kinds of flea are compared |
| Tipping-point scanner | Sweep any parameter from min to max and mark where lifespan jumps or behavior flips |
| Strategy map / Bellman equation | The best action in every situation; click any cell to expand its Bellman equation and keep tracing |

## The model

- **State**: energy `e` (0–20), health `h` (0–10), food left in the jar `f`, and the net state `n`.
- **Actions**: eat a portion, rest (chance to heal 1), light jump, medium jump, full jump. Every action first pays the daily metabolism.
- **Pass probability**: `1 − density^(0.8 × strength)`. Hit damage is 1×, 1.5× or 2× the base damage.
- **Death**: daily death probability = base death rate + injury factor × health lost + environmental risk (inside or outside the jar).
- **Solving**: every action reduces either the food or the energy, so the state graph has no cycles. One Bellman pass over (food, energy) from small to large gives the **exact** optimum, with no approximation.
- **Goal**: either “longest life” (maximize expected lifespan) or “best escape odds”.
- **The learning flea**: starts with a prior over net density and updates it after each hit with likelihood `d^(0.8 × strength)`; the accumulated hit strength is a sufficient statistic. Flea B also believes the net may be removed on any given day, so “days since the last hit” becomes part of its state.

## Findings

- **Under the default settings**, the best plan is to eat until energy reaches 9, then jump at full strength, and to recover after a hit before trying again. “Never jump” reaches only about 45% of the optimal lifespan.
- **Whether to jump depends mostly on the gap between daily risk inside and outside the jar**, not on how much food is left. If the jar is safe, the best plan is to eat to the last bite and only then jump.
- **When the food runs out, always jump.** “Never jump” is never optimal in any scenario.
- **The jailer**: with the same amount of open time, opening in one late block works as well as never opening at all (63.0% escape, versus 98.4% when the net opens on day 0). Hiding whether the net is open is effective when openings are frequent.
- **Learned helplessness**: a learning flea that believes “the net never changes” stops jumping after about 2 full-strength hits. After the net is removed, 63% of these fleas stay trapped. Simply believing “the world may change” brings that down to 8%. Stopping trying also stops new information (the hot-stove effect).
- **Tipping points**: resources are whole numbers and thresholds are discrete, so “one portion short” can move lifespan from 67 to 179 days. Where two choices tie, behavior flips completely while lifespan barely changes.

> About the “flea in a jar” story: it is widely told, but there is no reliable record of the original experiment; it is more of a fable. The concept of learned helplessness comes from Seligman and Maier’s 1967 experiments with dogs. In 2016 the two authors revised their explanation based on neuroscience: passivity is the default response to prolonged pain, and what has to be learned is “I have control.”

## Regenerating the videos

`video-src/` contains all the code used to make the videos. Frames are drawn on a canvas in the browser, the music is synthesized with Web Audio, and ffmpeg encodes the result.

1. `node video-src/export-data.js video-src` recomputes the data used in the video and writes `data.json`.
2. `python3 video-src/server.py <path to ffmpeg> <output.mp4>` starts a local server on port 8732 that receives frames and audio.
3. Open `http://127.0.0.1:8732/render.html` in a browser and run in the console:
   - `renderAll()`: synthesizes the music, then renders the Chinese frames on the main thread
   - `renderFast('en')` or `renderFast('zh')`: renders the frames in a Web Worker in the chosen language (run `renderAll()` once first to generate the music)

---

Built with help from [Claude Code](https://claude.com/claude-code).
