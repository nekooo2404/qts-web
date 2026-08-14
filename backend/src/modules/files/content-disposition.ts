import { basename } from 'node:path';

function isControlCharacter(character: string): boolean {
  const codePoint = character.codePointAt(0) ?? 0;
  return codePoint <= 0x1f || codePoint === 0x7f;
}

function stripControlCharacters(value: string): string {
  return [...value].filter((character) => !isControlCharacter(character)).join('');
}

export function sanitizeDownloadFilename(
  proposedFilename: string,
  fallbackFilename: string,
  requiredExtension: string,
): string {
  const normalizedExtension = requiredExtension.toLowerCase();
  const platformNeutralBasename = basename(
    stripControlCharacters(proposedFilename).replace(/\\/gu, '/'),
  );
  let filename = platformNeutralBasename
    .replace(/[\\/:*?"<>|]/gu, '_')
    .trim()
    .replace(/[. ]+$/gu, '')
    .slice(0, 180);

  if (filename.length === 0) filename = fallbackFilename;
  if (!filename.toLowerCase().endsWith(normalizedExtension)) {
    filename = `${filename.replace(/\.[^.]*$/u, '')}${normalizedExtension}`;
  }
  return filename;
}

function encodeRfc5987(filename: string): string {
  return encodeURIComponent(filename).replace(/[!'()*]/gu, (character) =>
    `%${character.codePointAt(0)?.toString(16).toUpperCase() ?? ''}`,
  );
}

export function attachmentContentDisposition(filename: string): string {
  const asciiFallback = [...filename]
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 0x20 && codePoint <= 0x7e ? character : '_';
    })
    .join('')
    .replace(/["\\]/gu, '_');
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodeRfc5987(filename)}`;
}
