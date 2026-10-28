import { createReadStream, readFileSync, statSync } from 'node:fs';
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const appPackage = JSON.parse(
  readFileSync(path.resolve(import.meta.dirname, 'package.json'), 'utf8'),
) as { version: string };
const windowsInstallerName = `FrameCapture-Setup-${appPackage.version}.exe`;
const windowsInstallerPath = path.resolve(
  import.meta.dirname,
  'release',
  windowsInstallerName,
);

const windowsDownloadPlugin: Plugin = {
  name: 'framecapture-windows-download',
  configureServer(server) {
    server.middlewares.use((request, response, next) => {
      if (request.url?.split('?')[0] !== '/download/windows-app') {
        next();
        return;
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.statusCode = 405;
        response.setHeader('Allow', 'GET, HEAD');
        response.end();
        return;
      }

      let fileStats;
      try {
        fileStats = statSync(windowsInstallerPath);
      } catch {
        response.statusCode = 404;
        response.end('The Windows portable build is not available.');
        return;
      }
      if (!fileStats.isFile()) {
        response.statusCode = 404;
        response.end('The Windows portable build is not available.');
        return;
      }

      let start = 0;
      let end = fileStats.size - 1;
      const range = request.headers.range;
      if (range) {
        const match = range.match(/^bytes=(\d*)-(\d*)$/);
        if (!match) {
          response.statusCode = 416;
          response.setHeader('Content-Range', `bytes */${fileStats.size}`);
          response.end();
          return;
        }

        if (!match[1]) {
          const suffixLength = Number(match[2]);
          if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
            response.statusCode = 416;
            response.setHeader('Content-Range', `bytes */${fileStats.size}`);
            response.end();
            return;
          }
          start = Math.max(fileStats.size - suffixLength, 0);
        } else {
          start = Number(match[1]);
          if (match[2]) end = Math.min(Number(match[2]), end);
        }

        if (
          !Number.isSafeInteger(start) ||
          !Number.isSafeInteger(end) ||
          start >= fileStats.size ||
          start > end
        ) {
          response.statusCode = 416;
          response.setHeader('Content-Range', `bytes */${fileStats.size}`);
          response.end();
          return;
        }
        response.statusCode = 206;
        response.setHeader(
          'Content-Range',
          `bytes ${start}-${end}/${fileStats.size}`,
        );
      } else {
        response.statusCode = 200;
      }

      response.setHeader('Content-Type', 'application/octet-stream');
      response.setHeader(
        'Content-Disposition',
        `attachment; filename="${windowsInstallerName}"`,
      );
      response.setHeader('Content-Length', end - start + 1);
      response.setHeader('Accept-Ranges', 'bytes');
      response.setHeader('Cache-Control', 'private, no-store');
      response.setHeader('X-Content-Type-Options', 'nosniff');

      if (request.method === 'HEAD') {
        response.end();
        return;
      }

      createReadStream(windowsInstallerPath, { start, end })
        .on('error', (error) => {
          if (response.headersSent) response.destroy(error);
          else {
            response.statusCode = 500;
            response.end('The Windows download could not be read.');
          }
        })
        .pipe(response);
    });
  },
};

const rawPort = process.env.PORT ?? '5173';

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? '/';

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    windowsDownloadPlugin,
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
