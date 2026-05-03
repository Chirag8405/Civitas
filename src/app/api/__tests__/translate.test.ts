/** @jest-environment node */
import 'isomorphic-fetch';
import { getServerSession, Session } from 'next-auth';
import { NextRequest } from 'next/server';
import { POST } from '../google/translate/route';

jest.mock('next-auth');
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: Record<string, unknown>, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(body),
    }),
  },
  NextRequest: jest.fn().mockImplementation((url, init) => ({
    url,
    method: init?.method ?? 'POST',
    headers: new Headers(init?.headers),
    json: () => Promise.resolve(JSON.parse(init?.body ?? '{}')),
  })),
}));

describe('API /api/google/translate', () => {
  const mockRequest = (body: Record<string, unknown>): NextRequest => {
    return new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as NextRequest;
  };

  beforeEach(() => {
    process.env.GOOGLE_TRANSLATION_API_KEY = 'test-key';
    jest.clearAllMocks();
    
    // Silence console.error for expected errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Default fetch mock to prevent real network calls
    jest.spyOn(global, 'fetch').mockImplementation(
      (_input: string | URL | Request): Promise<Response> =>
        Promise.resolve({
          ok: true,
          json: async () => ({ data: { translations: [{ translatedText: 'translated' }] } }),
        } as Response)
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 without session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(mockRequest({ texts: { t1: 'h' }, targetLanguage: 'en' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when texts missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } } as Session);
    const res = await POST(mockRequest({ targetLanguage: 'es' }));
    expect(res.status).toBe(400);
  });

  it('returns 200 with empty translations when texts object is empty', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } } as Session);
    
    // Override default mock which returns 1 translation
    (global.fetch as jest.Mock).mockImplementationOnce(
      (_input: string | URL | Request): Promise<Response> =>
        Promise.resolve({
          ok: true,
          json: async () => ({ data: { translations: [] } }),
        } as Response)
    );

    const res = await POST(mockRequest({ texts: {}, targetLanguage: 'es' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.translations).toEqual({});
  });

  it('returns 400 when targetLanguage is missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } } as Session);
    const res = await POST(mockRequest({ texts: { t1: 'h' } }));
    expect(res.status).toBe(400);
  });

  it('returns translated text map on success', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } } as Session);
    
    (global.fetch as jest.Mock).mockImplementation(
      (_input: string | URL | Request): Promise<Response> =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              translations: [{ translatedText: 'Hello' }, { translatedText: 'World' }]
            }
          }),
        } as Response)
    );

    const res = await POST(mockRequest({
      texts: { f1: 'H', f2: 'W' },
      targetLanguage: 'es'
    }));
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.translations).toEqual({ f1: 'Hello', f2: 'World' });
  });

  it('returns 500 on Translation API failure', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } } as Session);
    
    (global.fetch as jest.Mock).mockImplementationOnce(
      (_input: string | URL | Request): Promise<Response> =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: 'API Error' }),
        } as Response)
    );

    const res = await POST(mockRequest({
      texts: { f1: 'H' },
      targetLanguage: 'es'
    }));
    
    expect(res.status).toBe(500);
  });
});
