import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Security headers (HSTS, X-Frame-Options: DENY, X-Content-Type-Options:
  // nosniff, etc.). This is a JSON API consumed cross-origin by the PWAs, so
  // we disable Helmet's CSP/COEP (they govern document/asset loading, which
  // this server never serves) to avoid interfering with the browser fetch/CORS
  // flow already configured below.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Raw body parser for /uploads PUT requests so file uploads are read directly as Buffer
  app.use('/uploads', require('express').raw({ type: '*/*', limit: '25mb' }));

  // Increase JSON body limit for base64 image uploads (OCR test endpoint).
  // A 5 MB image → ~7 MB base64; 15 MB gives comfortable headroom.
  app.use(require('express').json({ limit: '15mb' }));

  // eZee Autosync webhooks POST application/xml. Express's default JSON
  // parser leaves req.body undefined for non-JSON content-types, so register
  // a text parser for XML so the inbound webhook handler can read the body.
  app.use(
    require('express').text({
      type: ['application/xml', 'text/xml'],
      limit: '5mb',
    }),
  );

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  // CORS allowlist: both brands' production + dev hosts, plus localhost for
  // developer machines. Server-to-server calls (webhooks, ECS-internal) are
  // unaffected since CORS only applies to browser-originated requests.
  const allowedOrigins = new Set([
    // The Daily Social (property 60765)
    'https://www.thedailysocial.co.in',
    'https://thedailysocial.co.in',
    // Buteak Suites (property 55402) — prod, dev, and apex
    'https://www.buteak.in',
    'https://buteak.in',
    'https://dev.buteak.in',
    'https://www.dev.buteak.in',
    // Admin panel — multi-property admin console
    'https://admin.thedailysocial.co.in',
    'https://www.admin.thedailysocial.co.in',
    // Local development
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3005',
    'http://localhost:8000',
    'http://localhost:8080',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:8000',
  ]);

  app.enableCors({
    origin: (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => {
      // Allow non-browser requests (curl, Postman, server-to-server) which
      // omit the Origin header. Browser requests always set it.
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL.replace(/\/+$/, '')) {
        return cb(null, true);
      }
      if (process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()).includes(origin)) {
        return cb(null, true);
      }
      // Allow Netlify & Render preview/production domains as well as local development origins
      if (
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
        /\.netlify\.app$/.test(origin) ||
        /\.onrender\.com$/.test(origin)
      ) {
        return cb(null, true);
      }
      return cb(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  console.log(`The Daily Social API running on http://localhost:${port}`);
}
bootstrap();
