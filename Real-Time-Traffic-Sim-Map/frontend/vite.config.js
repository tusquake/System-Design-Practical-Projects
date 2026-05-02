import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    // sockjs-client and stompjs rely on the Node.js `global` object.
    // In a browser context this doesn't exist, so we polyfill it here.
    global: 'globalThis',
  },
});
