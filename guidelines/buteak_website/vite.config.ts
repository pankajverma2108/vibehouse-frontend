import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { componentTagger } from 'lovable-tagger';

export default defineConfig(({ mode }) => {

  // 1️ Load .env, .env.<mode>, AND pull only vars starting with VITE_
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    // 2 Put your builds in distinct folders per mode
    build: {
      outDir: `build`,  // e.g. build-development, build-production, etc.
      rollupOptions: {
        input: path.resolve(__dirname, 'index.html'),
      },
    },

    server: {
      host: '::',
      port: 8080,
      strictPort: true,
      proxy: {
        '/api/prices': {
          target: 'https://live.ipms247.com/pmsinterface/getdataAPI.php',
          changeOrigin: true,
          // rewrite: (path) => path.replace(/^\/api\/prices/, '/pmsinterface/getdataAPI.php'),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              console.log('🔄 Proxying request to:', proxyReq.path);
            });
          }
        }
      }
    },

    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),

    // 3️⃣ Make your env vars available under import.meta.env
    define: {
      // Vite automatically injects these into import.meta.env
      'process.env': { ...env },
    },

    // Base public path, default to root
    base: env.VITE_BASE_URL || '/',

    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
