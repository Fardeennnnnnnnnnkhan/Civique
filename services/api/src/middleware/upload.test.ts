import assert from 'assert';
import sharp from 'sharp';
import { normalizeImageBuffer, validateImageBuffer } from './upload';

async function run() {
  const jpeg = await sharp({ create: { width: 320, height: 240, channels: 3, background: '#d9661f' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
  const normalized = await normalizeImageBuffer(jpeg, 'image/jpeg');
  assert.strictEqual(normalized.mimeType, 'image/webp');
  assert.strictEqual(normalized.width, 240);
  assert.strictEqual(normalized.height, 320);
  assert.strictEqual(normalized.original.width, 320);
  assert.strictEqual(normalized.original.height, 240);
  assert.notStrictEqual(normalized.sha256, normalized.original.sha256);
  const derivativeMetadata = await sharp(normalized.buffer).metadata();
  assert.strictEqual(derivativeMetadata.exif, undefined, 'Normalized derivatives must not retain EXIF metadata');

  assert.throws(() => validateImageBuffer(jpeg, 'image/png'), /INVALID_IMAGE_CONTENT/);
  await assert.rejects(() => normalizeImageBuffer(Buffer.from('not an image'), 'image/jpeg'));
  const tiny = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#000' } }).png().toBuffer();
  await assert.rejects(() => normalizeImageBuffer(tiny, 'image/png'), /IMAGE_DIMENSIONS_TOO_SMALL/);
}

run().then(() => console.log('Secure upload normalization checks passed.')).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
