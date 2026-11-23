# Templates

Story templates live in `tools/script.mjs` (`TEMPLATES`). Each template is a function returning
scene definitions with local line ids (`a`, `b`, …). Beats, shots, sfx and prop states can be anchored to
speech with `{line: 'a', off: 1.2}` so animation follows the voice no matter how long the line really is.

`templates/project.example.json` is a minimal hand-written project showing every field.
