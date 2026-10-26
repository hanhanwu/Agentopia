import { portableExportPlugin } from './apps/studio/server/portable-export.ts';
import { defineConfig } from 'vite';
import { trustScorePlugin } from './apps/studio/server/trust-score-api.ts';

export default defineConfig({
  plugins: [portableExportPlugin(), trustScorePlugin()],
  optimizeDeps: {
    entries: ['index.html'],
  },
  server: {
    host: '127.0.0.1',
    port: 8678,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 8678,
    strictPort: true,
  },
});
