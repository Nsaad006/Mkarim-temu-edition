import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Increase warning limit (our app is large but we'll split it)
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Manual code splitting: separate vendor libraries from app code
        // This allows browsers to cache vendor code independently
        manualChunks: {
          // Core React runtime
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // UI & animation libraries
          "vendor-ui": ["framer-motion", "lucide-react", "@radix-ui/react-dialog", "@radix-ui/react-slot"],
          // Data fetching
          "vendor-query": ["@tanstack/react-query"],
          // Carousel
          "vendor-carousel": ["embla-carousel-react", "embla-carousel-autoplay"],
          // Heavy utilities (html2canvas, dompurify)
          "vendor-utils": ["dompurify", "html2canvas"],
        },
      },
    },
  },
}));
