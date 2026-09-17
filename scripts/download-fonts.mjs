import fs from 'node:fs';
import path from 'node:path';

const fonts = [
  { dir: 'public/fonts/gilroy', file: 'Gilroy-ExtraBold.woff', url: 'https://web-assets.cred.club/fonts/Gilroy-ExtraBold.woff' },
  { dir: 'public/fonts/gilroy', file: 'Gilroy-Bold.woff', url: 'https://web-assets.cred.club/fonts/Gilroy-Bold.woff' },
  { dir: 'public/fonts/gilroy', file: 'Gilroy-SemiBold.woff', url: 'https://web-assets.cred.club/fonts/Gilroy-SemiBold.woff' },
  { dir: 'public/fonts/gilroy', file: 'Gilroy-Medium.woff', url: 'https://web-assets.cred.club/fonts/Gilroy-Medium.woff' },
  { dir: 'public/fonts/gilroy', file: 'Gilroy-Regular.woff', url: 'https://web-assets.cred.club/fonts/Gilroy-Regular.woff' },
  { dir: 'public/fonts/gilroy', file: 'Gilroy-Thin.woff', url: 'https://web-assets.cred.club/fonts/Gilroy-Thin.woff' },
  { dir: 'public/fonts/cirka', file: 'PPCirka-Bold.woff', url: 'https://web-assets.cred.club/fonts/PPCirka-Bold.woff' },
  { dir: 'public/fonts/cirka', file: 'PPCirka-Light.woff', url: 'https://web-assets.cred.club/fonts/PPCirka-Light.woff' },
  { dir: 'public/fonts/cirka', file: 'PPCirka-Medium.woff', url: 'https://web-assets.cred.club/fonts/PPCirka-Medium.woff' },
  { dir: 'public/fonts/cirka', file: 'PPCirka-Regular.woff', url: 'https://web-assets.cred.club/fonts/PPCirka-Regular.woff' },
  { dir: 'public/fonts/cirka', file: 'PPCirka-Semibold.woff', url: 'https://web-assets.cred.club/fonts/PPCirka-Semibold.woff' },
];

async function main() {
  for (const font of fonts) {
    const targetDir = path.resolve(font.dir);
    fs.mkdirSync(targetDir, { recursive: true });
    const targetPath = path.join(targetDir, font.file);
    console.log(`Downloading ${font.file} from ${font.url}...`);
    const res = await fetch(font.url);
    if (!res.ok) {
      throw new Error(`Failed to download ${font.url}: HTTP ${res.status}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(targetPath, buf);
    console.log(`Saved ${targetPath} (${buf.length} bytes)`);
  }
  console.log('All fonts downloaded successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
