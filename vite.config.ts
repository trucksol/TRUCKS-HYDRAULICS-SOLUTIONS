import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  // Capture the key from any possible source during build
  const GEMINI_KEY = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "";

  console.log('--- Build Environment Check ---');
  console.log('VITE_GEMINI_API_KEY found in env:', !!env.VITE_GEMINI_API_KEY);
  console.log('GEMINI_API_KEY found in env:', !!env.GEMINI_API_KEY);
  console.log('VITE_GEMINI_API_KEY found in process.env:', !!process.env.VITE_GEMINI_API_KEY);
  console.log('GEMINI_API_KEY found in process.env:', !!process.env.GEMINI_API_KEY);
  console.log('Final GEMINI_KEY length:', GEMINI_KEY.length);
  console.log('-------------------------------');

  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(GEMINI_KEY),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(GEMINI_KEY),
      '__GEMINI_API_KEY__': JSON.stringify(GEMINI_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
