import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import nodemailer from 'nodemailer';

const emailApiPlugin = (): Plugin => ({
  name: 'local-email-api',
  configureServer(server) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'hesics1@gmail.com',
        pass: 'fqvt dbtz buqf ikfn',
      },
    });

    server.middlewares.use('/api/send-email', (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Method not allowed' }));
        return;
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          const { to, subject, html, text } = data;

          if (!to || !subject || !html) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Missing required fields (to, subject, html)' }));
            return;
          }

          const info = await transporter.sendMail({
            from: '"HESICS Operations" <hesics1@gmail.com>',
            to,
            subject,
            text: text || undefined,
            html,
          });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, messageId: info.messageId }));
        } catch (err: any) {
          console.error('Local email server error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, message: err?.message || 'Email dispatch failed' }));
        }
      });
    });
  },
});

export default defineConfig({
  plugins: [react(), emailApiPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
    build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
          'vendor-ui': ['lucide-react', 'recharts', 'xlsx']
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true,
  },
});