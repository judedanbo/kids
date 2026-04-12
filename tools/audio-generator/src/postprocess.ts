import { rename, unlink } from 'node:fs/promises';
import { execa } from 'execa';

export async function assertFfmpegInstalled(): Promise<void> {
  try {
    await execa('ffmpeg', ['-version']);
  } catch {
    throw new Error(
      'ffmpeg not found on PATH. Install via `brew install ffmpeg` (macOS) ' +
        'or `apt install ffmpeg` (Debian/Ubuntu) and retry.',
    );
  }
}

/**
 * Normalises loudness to EBU R128 (-16 LUFS) and trims leading silence.
 * Re-encodes to 96 kbps mono MP3 — plenty for speech, keeps files compact.
 * Replaces `path` in place.
 */
export async function normalizeMp3(path: string): Promise<void> {
  const tmp = `${path}.norm.mp3`;
  await execa(
    'ffmpeg',
    [
      '-y',
      '-i',
      path,
      '-af',
      [
        'loudnorm=I=-16:TP=-1.5:LRA=11',
        'silenceremove=start_periods=1:start_silence=0.1:start_threshold=-50dB',
      ].join(','),
      '-codec:a',
      'libmp3lame',
      '-b:a',
      '96k',
      '-ac',
      '1',
      tmp,
    ],
    { stdio: 'pipe' },
  );
  await unlink(path);
  await rename(tmp, path);
}
