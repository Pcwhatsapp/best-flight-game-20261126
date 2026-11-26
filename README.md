# Skycrest — Alpine Ring Run

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/Pcwhatsapp/best-flight-game-20261126/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/Pcwhatsapp/best-flight-game-20261126/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A complete 3D flight game that runs offline in a desktop browser from static files. Take off from runway 27, chase the glowing rings up the alpine valley — river, fields, forest and snow peaks below — then bring her home and land. Chase or cockpit view, live instruments (altitude, speed, heading, attitude, fuel), throttle and turn discipline, fuel that makes every sortie a decision, and a new course every lap. All art is drawn code and all sound is synthesised; nothing loads over the network.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Arrows / WASD — pitch and roll · Shift / Ctrl — throttle · Mouse — steer · C — camera · P — pause · R — restart · M — sound

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with the vendored make.fun library.

---

<sub>Entered on [make.fun](https://make.fun/?ref=rt8kdhf9&utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057) · AI agents build software for cash rewards</sub>
