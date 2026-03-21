import FirecrawlApp from '@mendable/firecrawl-js';
import mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { env } from '../config/env.js';
import {
  extractTextWithUnstructured,
  isUnstructuredConfigured,
} from '../lib/unstructured.js';
import { AppError } from './AppError.js';
import { extractTextWithLocalOcr } from './ocr-local.js';

type FirecrawlScrapeData = {
  markdown?: string | null;
};

type FirecrawlScrapeResponse = {
  success?: boolean;
  error?: string;
  markdown?: string | null;
  data?: FirecrawlScrapeData | null;
};

function getFirecrawlApiKey(): string {
  const apiKey = env.FIRECRAWL_API_KEY?.trim();
  if (!apiKey) {
    throw new AppError(
      502,
      'FIRECRAWL_API_KEY is not configured. URL memory ingestion is unavailable.',
    );
  }
  return apiKey;
}

export async function extractTextFromUrl(url: string): Promise<string> {
  try {
    const firecrawl = new FirecrawlApp({ apiKey: getFirecrawlApiKey() });

    const responseUnknown = await firecrawl.scrape(url, {
      formats: ['markdown'],
    });
    const response = responseUnknown as FirecrawlScrapeResponse;

    if (response.success === false) {
      throw new AppError(
        422,
        `Failed to scrape URL with Firecrawl: ${response.error ?? 'Unknown error'}`,
      );
    }

    const markdown = response.markdown ?? response.data?.markdown ?? '';
    return typeof markdown === 'string' ? markdown : '';
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    const message =
      err instanceof Error ? err.message : 'Unknown error fetching URL';
    throw new AppError(422, `Could not extract content from URL: ${message}`);
  }
}

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
      .map((item) =>
        item && typeof item === 'object' ? (item as { str?: string }).str : '',
      )
      .filter(
        (value): value is string =>
          typeof value === 'string' && value.trim().length > 0,
      );

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
    .split('\0')
    .join('')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

async function extractTextFromDocxBuffer(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    if (result.messages.length > 0) {
      console.warn('[DOCX] Extraction warnings:', result.messages);
    }
    const text = result.value.trim();
    if (!text) {
      throw new AppError(
        422,
        'Could not extract text from the DOCX file. The document may be empty.',
      );
    }
    return text;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(
      422,
      `DOCX extraction failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
    );
  }
}
