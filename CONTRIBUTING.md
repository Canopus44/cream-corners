# Contributing

Thanks for helping. Cream Corners is a small Tauri app, so the fastest contribution path is a focused issue or a small pull request.

## Project layout

```
cream-corners/
├─ src-tauri/src/   # main, lib, settings, win32 (FFI), actions, engine, tray
├─ src/             # main.ts (UI), style.css, types.ts
├─ index.html
├─ docs/            # English pages; Spanish under docs/es/
└─ src-tauri/tauri.conf.json
```

## Prerequisites

Windows 10/11 x64 with Rust stable ≥ 1.77 (rustup), Node.js ≥ 20, and Visual Studio Build Tools with the "Desktop development with C++" workload. Details in [docs/building.md](docs/building.md).

## Commands

```bash
npm install
npm run tauri dev      # dev window with the Rust backend
npm run build          # tsc --noEmit + vite build
cd src-tauri && cargo check
npm run tauri build    # NSIS + MSI installers
```

`npm run dev` serves the UI in a browser with in-memory settings and no actions; use it for layout work only.

## Conventions

- Do not add a crate without a reason. Raw Win32 FFI declared with `extern "system"` is fine and preferred over pulling in `windows`, `winapi` or `enigo`.
- No `unwrap` or `expect` on runtime paths (settings load, action execution, IPC handlers). Return a `Result` or fall back to a default; panics belong in tests only.
- UI strings are Spanish. Keep the cream/iOS design language and the existing tone; there is no i18n layer to plug into.
- Comments explain only non-obvious reasons, in one line. Skip comments that restate the code.
- Sanitize at the boundary: settings arrive from a file and from the UI, so clamp and validate on load and on save.
- Keep the settings struct and `src/types.ts` in sync; the JSON field names are the contract.

## Adding a preset

A preset touches four places, in this order:

1. `src-tauri/src/settings.rs`: add a variant to `enum Preset` (serde uses `snake_case`) and to `Preset::ALL`, and map it in the id/`FromStr` helpers used for serialization.
2. `src-tauri/src/actions.rs`: add the arm in the preset `match` that sends keys or runs the target.
3. `src/types.ts`: add the id to the `Preset` union.
4. `src/main.ts`: add an entry to the `PRESETS` catalog with id, label, group and shortcut so it shows in the picker, and update any count shown in the UI.

Then run `cargo check`, `npm run build`, and try the preset from a zone before opening the PR.

## Commits

Conventional Commits: `feat(engine): pause on fullscreen`, `fix(settings): keep backup on failed write`, `docs(readme): add screenshots`. Types in use: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`. The body explains why, not what.

## Pull requests

- Open the PR against `main` and describe the behaviour change, how you tested it and any Windows version involved.
- Keep PRs small and single-purpose; unrelated refactors belong in their own PR.
- Never force-push `main`. Force-push your own branch is fine while the PR is open, but say so in a comment if reviewers already read a version.
- Update the English docs and the matching Spanish page under `docs/es/` in the same PR when behaviour changes. UI text stays Spanish-only; documentation is bilingual.

## License

By contributing you agree that your work is licensed under the MIT license of this project (see [LICENSE](LICENSE)), and that you have the right to submit it.
