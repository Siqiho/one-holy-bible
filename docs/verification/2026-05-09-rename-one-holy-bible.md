# Rename Verification

## Scope

Renamed the project from Bible Study Reader / `bible-study-reader` to One Holy Bible / `one-holy-bible`.

## Updated Identity

- npm package name: `one-holy-bible`
- Tauri product name: `One Holy Bible`
- Tauri identifier: `com.simon.oneholybible`
- Tauri Rust crate: `one-holy-bible`
- Tauri Rust library crate: `one_holy_bible_lib`
- HTML title: `One Holy Bible`
- Layout storage key: `one-holy-bible-layout`
- Project directory: `/Users/simon/✝️/one-holy-bible`

## Verification

- Added `src/projectIdentity.test.ts` to lock the app identity.
- `npm run test` should pass with 9 test files and 21 tests.
- `npm run build` should pass after excluding test files from production TypeScript compilation.
- `cargo check` should recognize the Rust package as `one-holy-bible`.
- `npm run tauri build` should generate `One Holy Bible.app` and `One Holy Bible_0.1.0_aarch64.dmg`.

## Notes

No user content backup was required because this was a project rename and metadata update, not a destructive replacement of an existing user document or directory.
