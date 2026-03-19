/**
 * Content extractors — convert raw inputs (URLs, documents) into plain text
 * that can be fed to the LLM for memory extraction.
 */

import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { env } from '../config/env.js';
import { extractTextWithUnstructured, isUnstructuredConfigured } from '../lib/unstructured.js';
import { AppError } from './AppError.js';
import { extractTextWithLocalOcr } from './ocr-local.js';

// ---------------------------------------------------------------------------
// URL / Link content extraction
// ---------------------------------------------------------------------------

const FETCH_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Fetches a URL and returns the main textual content.
 *
 * We intentionally keep this simple (no headless browser) — strip HTML tags and
 * collapse whitespace. For JS‑rendered SPAs a headless approach would be needed
 * but that's out of scope for now.
 */
export async function extractTextFromUrl(url: string): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'NeuraMemory-AI/1.0 (memory extraction bot)',
        Accept: 'text/html, text/plain, application/json',
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new AppError(
        422,
        `Failed to fetch URL: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    const contentLength = Number(response.headers.get('content-length') ?? 0);

    if (contentLength > MAX_RESPONSE_SIZE) {
      throw new AppError(
        422,
        `URL content exceeds maximum allowed size of ${MAX_RESPONSE_SIZE / 1024 / 1024} MB.`,
      );
    }

    const rawText = await response.text();

    if (contentType.includes('application/json')) {
      // Pretty‑print JSON so the LLM can reason about it
      try {
        return JSON.stringify(JSON.parse(rawText), null, 2);
      } catch {
        return rawText;
      }
    }

    if (contentType.includes('text/plain')) {
      return rawText;
    }

    // Default path — strip HTML
    return stripHtml(rawText);
  } catch (err) {
    if (err instanceof AppError) throw err;

    const message =
      err instanceof Error ? err.message : 'Unknown error fetching URL';
    throw new AppError(422, `Could not extract content from URL: ${message}`);
  }
}

// ---------------------------------------------------------------------------
// Document text extraction
// ---------------------------------------------------------------------------

/**
 * Extracts text from an uploaded document buffer.
 *
 * Supported MIME types:
 *  - text/plain, text/markdown      → decode UTF‑8
 *  - application/pdf                 → basic text layer extraction
 *  - application/vnd.openxmlformats‑officedocument.wordprocessingml.document
 *                                    → extract raw text from docx XML
 */
export async function extractTextFromDocument(
  buffer: Buffer,
  mimetype: string,
  filename = 'document.pdf',
): Promise<string> {
  switch (mimetype) {
    case 'text/plain':
    case 'text/markdown':
      return buffer.toString('utf-8');

    case 'application/pdf':
      return extractTextFromPdfBuffer(buffer, filename);

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return extractTextFromDocxBuffer(buffer);

    default:
      throw new AppError(
        415,
        `Unsupported document type: ${mimetype}. Supported types: PDF, DOCX, TXT, MD.`,
      );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Minimal HTML → text converter.
 * Strips tags, decodes common entities, and collapses whitespace.
 */
function stripHtml(html: string): string {
  return html
    // Remove script / style blocks entirely
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Replace <br>, <p>, <div>, headings, <li> with newlines for readability
    .replace(/<\/?(br|p|div|h[1-6]|li|tr)[^>]*>/gi, '\n')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * PDF text extraction with OCR fallback.
 *
 * 1) Try pdfjs-dist for text-based PDFs.
 * 2) If empty, try Unstructured OCR async jobs.
 * 3) If that fails and local OCR is enabled, run tesseract on rasterized pages.
 */
async function extractTextFromPdfBuffer(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  if (!isOcrForced()) {
    try {
      const text = await extractTextWithPdfJs(buffer);
      if (text) {
        return text;
      }
    } catch (err) {
      console.warn('[PDF] pdfjs-dist extraction failed:', err);
    }
  }

  if (isUnstructuredConfigured()) {
    try {
      const text = await extractTextWithUnstructured(buffer, filename);
      if (text) {
        return normaliseExtractedPdfText(text);
      }
    } catch (err) {
      console.warn('[PDF] Unstructured OCR failed:', err);
    }
  }

  if (isLocalOcrEnabled()) {
    const lang = getLocalOcrLanguage();
    try {
      const text = await extractTextWithLocalOcr(buffer, lang);
      if (text) {
        return normaliseExtractedPdfText(text);
      }
    } catch (err) {
      console.warn('[PDF] Local OCR failed:', err);
    }
  }

  throw new AppError(
    422,
    'Could not extract text from the PDF. The file may be scanned/image-based or use an unsupported encoding.',
  );
}

async function extractTextWithPdfJs(buffer: Buffer): Promise<string> {
  pdfjs.GlobalWorkerOptions.workerSrc = '';
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data });
  const document = await loadingTask.promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const strings = content.items
      .map((item) => (item && typeof item === 'object' ? (item as { str?: string }).str : ''))
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    if (strings.length > 0) {
      pages.push(strings.join(' '));
    }
  }

  return normaliseExtractedPdfText(pages.join('\n'));
}

function isLocalOcrEnabled(): boolean {
  const raw = env.OCR_ENABLE_LOCAL_FALLBACK ?? 'true';
  const normalised = raw.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalised)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalised)) return false;
  return true;
}

function getLocalOcrLanguage(): string {
  const raw = env.OCR_TESSERACT_LANG ?? 'eng';
  return raw.trim() || 'eng';
}

function isOcrForced(): boolean {
  const raw = env.OCR_FORCE ?? 'false';
  const normalised = raw.trim().toLowerCase();
  if (['true', '1', 'yes', 'y', 'on'].includes(normalised)) return true;
  if (['false', '0', 'no', 'n', 'off'].includes(normalised)) return false;
  return false;
}

function normaliseExtractedPdfText(text: string): string {
  return text
    .replace(/\u0000/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

/**
 * Very lightweight DOCX text extraction.
 *
 * A `.docx` file is a ZIP archive. The main document text lives inside
 * `word/document.xml`. We locate that entry, extract it, strip XML tags,
 * and return the raw text content.
 *
 * Limitations:
 * - Only extracts from `word/document.xml` — headers, footers, footnotes,
 *   and embedded charts are ignored.
 * - Images are ignored.
 *
 * For production use, swap with a library like `mammoth` or `docx-parser`.
 */
function extractTextFromDocxBuffer(buffer: Buffer): string {
  // DOCX = ZIP. The ZIP local file header signature is PK\x03\x04.
  // We scan for the `word/document.xml` entry, find its data, and strip XML.
  const marker = 'word/document.xml';
  const idx = buffer.indexOf(marker);

  if (idx === -1) {
    throw new AppError(
      422,
      'The uploaded DOCX file appears to be malformed — could not locate word/document.xml.',
    );
  }

  // A quick‑and‑dirty approach: extract everything from the buffer as UTF‑8
  // and look for the XML content between `<?xml` and the end of the entry.
  const asString = buffer.toString('utf-8');

  // Find the XML portion of word/document.xml
  const xmlStart = asString.indexOf('<?xml', idx);
  if (xmlStart === -1) {
    throw new AppError(
      422,
      'Could not parse the DOCX file — no XML content found.',
    );
  }

  // Find the end of the XML: look for the next PK signature or end of buffer
  const nextPk = asString.indexOf('PK', xmlStart + 10);
  const xmlContent =
    nextPk === -1
      ? asString.slice(xmlStart)
      : asString.slice(xmlStart, nextPk);

  // Strip XML tags, decode entities, collapse whitespace
  const text = xmlContent
    .replace(/<w:p[^>]*>/g, '\n') // paragraph boundaries → newlines
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text) {
    throw new AppError(
      422,
      'Could not extract text from the DOCX file. The document may be empty.',
    );
  }

  return text;
}
