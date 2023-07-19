// vite.config.js
import path from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

const isExternal = (id: string) => !id.startsWith('.') && !path.isAbsolute(id);

export default defineConfig(() => ({
  esbuild: {},
  define: {
    global: {}
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      name: 'Minswap Wallet Connect for dApp',
      fileName: format => `index.${format}.js`
    },
    minify: 'esbuild',
    rollupOptions: {
      external: isExternal
    }
  },
  plugins: [dts()]
}));
