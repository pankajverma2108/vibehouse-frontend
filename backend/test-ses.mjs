/**
 * Quick SES diagnostic — run with:
 *   node test-ses.mjs
 * from the backend directory.
 *
 * Tries to send a 2FA test email to TEST_EMAIL using each credential pair
 * and reports the exact AWS error so we know what's blocking production.
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv dependency needed)
const envPath = resolve(__dirname, '.env');
const env = {};
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  env[key] = val;
}

const REGION       = env.AWS_REGION       ?? 'ap-south-1';
const FROM         = env.SES_FROM_EMAIL   ?? 'noreply@thedailysocial.co.in';
const TO           = env.TEST_EMAIL       ?? 'build91dev2@gmail.com';

const CRED_SETS = [
  {
    label: 'Main AWS creds (AKIA6K2ZSSWWWAXIZXWM — used by S3/SQS)',
    accessKeyId:     env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  {
    label: 'Admin AWS creds (TDS_ADMIN_ACCESS_KEY_ID)',
    accessKeyId:     env.TDS_ADMIN_ACCESS_KEY_ID,
    secretAccessKey: env.TDS_ADMIN_SECRET_ACCESS_KEY,
  },
];

async function trySend(label, accessKeyId, secretAccessKey) {
  console.log(`\n──────────────────────────────────────`);
  console.log(`Testing: ${label}`);
  console.log(`  Key:    ${accessKeyId}`);
  console.log(`  From:   ${FROM}`);
  console.log(`  To:     ${TO}`);
  console.log(`  Region: ${REGION}`);

  if (!accessKeyId || !secretAccessKey) {
    console.log('  ✗ SKIP — credentials not set in .env');
    return;
  }

  const ses = new SESClient({
    region: REGION,
    credentials: { accessKeyId, secretAccessKey },
  });

  const command = new SendEmailCommand({
    Source: `TheDailySocial <${FROM}>`,
    Destination: { ToAddresses: [TO] },
    Message: {
      Subject: { Data: '🔐 TheDailySocial — 2FA Test (SES Diagnostic)', Charset: 'UTF-8' },
      Body: {
        Text: {
          Data: `This is a test email from the SES diagnostic script.\n\nYour test 2FA OTP is: 123456\nValid for 10 minutes.\n\nIf you received this, SES is working correctly.`,
          Charset: 'UTF-8',
        },
      },
    },
  });

  try {
    const result = await ses.send(command);
    console.log(`  ✓ SUCCESS — MessageId: ${result.MessageId}`);
    console.log(`  → Check ${TO} inbox (and spam folder)`);
  } catch (err) {
    console.log(`  ✗ FAILED`);
    console.log(`  Error name:    ${err.name}`);
    console.log(`  Error message: ${err.message}`);
    if (err.name === 'MessageRejected') {
      console.log('  → Domain or sender email not verified in SES');
    } else if (err.name === 'AccessDenied' || err.name === 'AuthFailure') {
      console.log('  → IAM user lacks ses:SendEmail permission');
    } else if (err.name === 'MailFromDomainNotVerifiedException') {
      console.log('  → MAIL FROM domain not verified');
    } else if (err.message?.includes('sandbox')) {
      console.log('  → SES is in sandbox mode — recipient must be verified');
    }
  }
}

console.log('=== SES Diagnostic ===');
console.log(`Sending test 2FA email to: ${TO}`);

for (const { label, accessKeyId, secretAccessKey } of CRED_SETS) {
  await trySend(label, accessKeyId, secretAccessKey);
}

console.log('\n──────────────────────────────────────');
console.log('Done.');
