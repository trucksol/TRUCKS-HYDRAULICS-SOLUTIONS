import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  // Load all env variables from the process and the .env files
  const env = loadEnv(mode, process.cwd(), '');
  
  // Try to find the key in any possible casing or prefix
  const GEMINI_KEY = 
    process.env.VITE_GEMINI_API_KEY || 
    process.env.GEMINI_API_KEY || 
    env.VITE_GEMINI_API_KEY || 
    env.GEMINI_API_KEY || 
    "";

  console.log('--- Build Environment Check ---');
  console.log('VITE_GEMINI_API_KEY found:', !!(process.env.VITE_GEMINI_API_KEY || env.VITE_GEMINI_API_KEY));
  console.log('GEMINI_API_KEY found:', !!(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY));
  console.log('Final Key Length:', GEMINI_KEY.length);
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
