import { NextRequest, NextResponse } from 'next/server';
import { parseRecipeWithClaude, MAX_RECIPE_TEXT_LENGTH } from '@/lib/ai/parse-recipe';
import { extractRecipeFromJsonLd, htmlToText, isAllowedImportUrl } from '@/lib/import-url';
import { checkRateLimit, AI_RATE_LIMIT } from '@/lib/rate-limit';

const FETCH_TIMEOUT_MS = 15000;
const MAX_HTML_BYTES = 3 * 1024 * 1024; // 3 MB

export async function POST(request: NextRequest) {
  try {
    const limit = checkRateLimit(request, 'ai', AI_RATE_LIMIT);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'Too many import requests. Please wait a few minutes and try again.' },
        { status: 429 }
      );
    }

    const { url } = await request.json();

    if (typeof url !== 'string' || !isAllowedImportUrl(url)) {
      return NextResponse.json(
        { error: 'Please provide a valid public http(s) URL' },
        { status: 400 }
      );
    }

    let html: string;
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          // Some recipe sites block requests without a browser-like UA
          'User-Agent':
            'Mozilla/5.0 (compatible; FamilyRecipeApp/1.0; +https://github.com/sholdensmith/recipe-app)',
          Accept: 'text/html,application/xhtml+xml',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Couldn't fetch that page (HTTP ${response.status})` },
          { status: 422 }
        );
      }

      const buffer = await response.arrayBuffer();
      if (buffer.byteLength > MAX_HTML_BYTES) {
        return NextResponse.json({ error: 'That page is too large to import' }, { status: 422 });
      }
      html = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    } catch (err) {
      const timedOut = err instanceof Error && err.name === 'TimeoutError';
      return NextResponse.json(
        { error: timedOut ? 'That page took too long to load' : 'Could not reach that URL' },
        { status: 422 }
      );
    }

    // Fast path: schema.org Recipe JSON-LD (no AI call needed)
    const structured = extractRecipeFromJsonLd(html);
    if (structured) {
      return NextResponse.json({ ...structured, source_url: url, method: 'structured-data' });
    }

    // Fallback: strip the page to text and let Claude parse it
    const text = htmlToText(html).slice(0, MAX_RECIPE_TEXT_LENGTH);
    if (text.length < 100) {
      return NextResponse.json(
        { error: "Couldn't find any recipe content on that page" },
        { status: 422 }
      );
    }

    const parsed = await parseRecipeWithClaude(text);
    return NextResponse.json({ ...parsed, source_url: url, method: 'ai' });
  } catch (error) {
    console.error('Error importing recipe from URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to import recipe' },
      { status: 500 }
    );
  }
}
