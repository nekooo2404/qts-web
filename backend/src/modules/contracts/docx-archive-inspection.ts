import { inflateRawSync } from 'node:zlib';

const LOCAL_FILE_HEADER = 0x04034b50;
const DATA_DESCRIPTOR = 0x08074b50;
const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const END_RECORD_BYTES = 22;
const CENTRAL_ENTRY_BYTES = 46;
const LOCAL_HEADER_BYTES = 30;
const MAX_ZIP_COMMENT_BYTES = 65_535;
const ZIP64_UINT16 = 0xffff;
const ZIP64_UINT32 = 0xffffffff;
const ENCRYPTED_FLAG = 0x0001;
const DATA_DESCRIPTOR_FLAG = 0x0008;
const ALLOWED_COMPRESSION_METHODS = new Set([0, 8]);

export class DocxArchiveInvalidError extends Error {
  constructor() {
    super('DOCX archive structure is invalid');
    this.name = 'DocxArchiveInvalidError';
  }
}

export class DocxArchiveLimitError extends Error {
  constructor() {
    super('DOCX archive exceeds configured expansion limits');
    this.name = 'DocxArchiveLimitError';
  }
}

export interface DocxArchiveLimits {
  maxEntries: number;
  maxUncompressedBytes: number;
}

function invalid(): never {
  throw new DocxArchiveInvalidError();
}

function findEndRecord(buffer: Buffer): number {
  const firstPossibleOffset = Math.max(
    0,
    buffer.length - END_RECORD_BYTES - MAX_ZIP_COMMENT_BYTES,
  );
  for (
    let offset = buffer.length - END_RECORD_BYTES;
    offset >= firstPossibleOffset;
    offset -= 1
  ) {
    if (buffer.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  return invalid();
}

interface EntryRange {
  start: number;
  end: number;
}

function assertNonOverlappingRanges(ranges: EntryRange[]): void {
  ranges.sort((left, right) => left.start - right.start);
  for (let index = 1; index < ranges.length; index += 1) {
    const previous = ranges[index - 1];
    const current = ranges[index];
    if (!previous || !current || current.start < previous.end) invalid();
  }
}

function expandedSize(
  compressedData: Buffer,
  compressionMethod: number,
  remainingBudget: number,
): number {
  if (compressionMethod === 0) return compressedData.length;
  try {
    return inflateRawSync(compressedData, {
      maxOutputLength: remainingBudget + 1,
    }).length;
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ERR_BUFFER_TOO_LARGE'
    ) {
      throw new DocxArchiveLimitError();
    }
    invalid();
  }
}

export function assertSafeDocxArchive(
  buffer: Buffer,
  limits: DocxArchiveLimits,
): void {
  if (
    !Number.isSafeInteger(limits.maxEntries) ||
    limits.maxEntries <= 0 ||
    !Number.isSafeInteger(limits.maxUncompressedBytes) ||
    limits.maxUncompressedBytes <= 0
  ) {
    throw new TypeError('DOCX archive limits must be positive safe integers');
  }
  if (buffer.length < END_RECORD_BYTES) invalid();

  const endOffset = findEndRecord(buffer);
  const diskNumber = buffer.readUInt16LE(endOffset + 4);
  const centralDirectoryDisk = buffer.readUInt16LE(endOffset + 6);
  const entriesOnDisk = buffer.readUInt16LE(endOffset + 8);
  const totalEntries = buffer.readUInt16LE(endOffset + 10);
  const centralDirectoryBytes = buffer.readUInt32LE(endOffset + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(endOffset + 16);
  const commentBytes = buffer.readUInt16LE(endOffset + 20);

  if (
    diskNumber !== 0 ||
    centralDirectoryDisk !== 0 ||
    entriesOnDisk !== totalEntries ||
    totalEntries === ZIP64_UINT16 ||
    centralDirectoryBytes === ZIP64_UINT32 ||
    centralDirectoryOffset === ZIP64_UINT32 ||
    endOffset + END_RECORD_BYTES + commentBytes !== buffer.length ||
    centralDirectoryOffset + centralDirectoryBytes !== endOffset
  ) {
    invalid();
  }
  if (totalEntries > limits.maxEntries) throw new DocxArchiveLimitError();

  let offset = centralDirectoryOffset;
  let totalUncompressedBytes = 0;
  const entryRanges: EntryRange[] = [];
  for (let entryIndex = 0; entryIndex < totalEntries; entryIndex += 1) {
    if (
      offset + CENTRAL_ENTRY_BYTES > endOffset ||
      buffer.readUInt32LE(offset) !== CENTRAL_DIRECTORY_ENTRY
    ) {
      invalid();
    }

    const flags = buffer.readUInt16LE(offset + 8);
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedBytes = buffer.readUInt32LE(offset + 20);
    const uncompressedBytes = buffer.readUInt32LE(offset + 24);
    const filenameBytes = buffer.readUInt16LE(offset + 28);
    const extraBytes = buffer.readUInt16LE(offset + 30);
    const entryCommentBytes = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const entryBytes =
      CENTRAL_ENTRY_BYTES + filenameBytes + extraBytes + entryCommentBytes;

    if (
      (flags & ENCRYPTED_FLAG) !== 0 ||
      !ALLOWED_COMPRESSION_METHODS.has(compressionMethod) ||
      compressedBytes === ZIP64_UINT32 ||
      uncompressedBytes === ZIP64_UINT32 ||
      localHeaderOffset === ZIP64_UINT32 ||
      offset + entryBytes > endOffset
    ) {
      invalid();
    }

    if (
      localHeaderOffset + LOCAL_HEADER_BYTES > centralDirectoryOffset ||
      buffer.readUInt32LE(localHeaderOffset) !== LOCAL_FILE_HEADER
    ) {
      invalid();
    }
    const localFlags = buffer.readUInt16LE(localHeaderOffset + 6);
    const localCompressionMethod = buffer.readUInt16LE(localHeaderOffset + 8);
    const localCrc32 = buffer.readUInt32LE(localHeaderOffset + 14);
    const localCompressedBytes = buffer.readUInt32LE(localHeaderOffset + 18);
    const localUncompressedBytes = buffer.readUInt32LE(localHeaderOffset + 22);
    const localFilenameBytes = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraBytes = buffer.readUInt16LE(localHeaderOffset + 28);
    const compressedDataOffset =
      localHeaderOffset + LOCAL_HEADER_BYTES + localFilenameBytes + localExtraBytes;
    const compressedDataEnd = compressedDataOffset + compressedBytes;
    if (
      localFlags !== flags ||
      localCompressionMethod !== compressionMethod ||
      compressedDataOffset > centralDirectoryOffset ||
      compressedDataEnd > centralDirectoryOffset ||
      !buffer
        .subarray(
          localHeaderOffset + LOCAL_HEADER_BYTES,
          localHeaderOffset + LOCAL_HEADER_BYTES + localFilenameBytes,
        )
        .equals(
          buffer.subarray(
            offset + CENTRAL_ENTRY_BYTES,
            offset + CENTRAL_ENTRY_BYTES + filenameBytes,
          ),
        )
    ) {
      invalid();
    }

    const usesDataDescriptor = (flags & DATA_DESCRIPTOR_FLAG) !== 0;
    if (
      !usesDataDescriptor &&
      (localCrc32 !== buffer.readUInt32LE(offset + 16) ||
        localCompressedBytes !== compressedBytes ||
        localUncompressedBytes !== uncompressedBytes)
    ) {
      invalid();
    }

    let localEntryEnd = compressedDataEnd;
    if (usesDataDescriptor) {
      const hasDescriptorSignature =
        compressedDataEnd + 4 <= centralDirectoryOffset &&
        buffer.readUInt32LE(compressedDataEnd) === DATA_DESCRIPTOR;
      const descriptorOffset = compressedDataEnd + (hasDescriptorSignature ? 4 : 0);
      if (
        descriptorOffset + 12 > centralDirectoryOffset ||
        buffer.readUInt32LE(descriptorOffset) !== buffer.readUInt32LE(offset + 16) ||
        buffer.readUInt32LE(descriptorOffset + 4) !== compressedBytes ||
        buffer.readUInt32LE(descriptorOffset + 8) !== uncompressedBytes
      ) {
        invalid();
      }
      localEntryEnd = descriptorOffset + 12;
    }

    const actualUncompressedBytes = expandedSize(
      buffer.subarray(compressedDataOffset, compressedDataEnd),
      compressionMethod,
      limits.maxUncompressedBytes - totalUncompressedBytes,
    );
    if (actualUncompressedBytes !== uncompressedBytes) invalid();
    entryRanges.push({ start: localHeaderOffset, end: localEntryEnd });

    totalUncompressedBytes += actualUncompressedBytes;
    if (
      !Number.isSafeInteger(totalUncompressedBytes) ||
      totalUncompressedBytes > limits.maxUncompressedBytes
    ) {
      throw new DocxArchiveLimitError();
    }
    offset += entryBytes;
  }

  if (offset !== endOffset) invalid();
  assertNonOverlappingRanges(entryRanges);
}
