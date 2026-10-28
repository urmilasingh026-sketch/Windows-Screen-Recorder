# FrameCapture for Windows

FrameCapture is a local Windows desktop app. Screen video and audio stay on the
computer; there is no recording upload service. MP4 export uses FFmpeg 6.1.1;
the installer includes its license and build information.

## Build the Windows installer

Run from a Windows x64 machine with Node.js and pnpm installed:

```sh
pnpm install
pnpm --filter @workspace/framecapture run desktop:win
```

The NSIS installer is written to `artifacts/framecapture/release/`. It installs
FrameCapture with a Start menu entry and an optional desktop shortcut. The
installer is x64; an unsigned build may show a Windows SmartScreen warning.
The build downloads a pinned Windows FFmpeg binary and verifies its SHA-256
before including it.

To build a portable executable instead, run:

```sh
pnpm --filter @workspace/framecapture run desktop:portable
```

The portable executable can be launched without installing the app.

FFmpeg license and build details are installed beside the application. The
corresponding FFmpeg source and build project are published at
https://github.com/eugeneware/ffmpeg-static and https://ffmpeg.org/download.html.

The capture presets request up to the selected resolution and frame rate.
Actual output depends on the captured display/window and the PC's recording and
encoding capacity. System-audio loopback is supported on Windows; microphone
capture requires a connected microphone and Windows permission.
