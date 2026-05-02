/** @jest-environment node */
import 'isomorphic-fetch';
import { getServerSession } from 'next-auth';

jest.mock('next-auth');
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(body),
    }),
  },
}));

describe('API /api/google/translate', () => {
  let POST: any;

  const mockRequest = (body: any) => {
    return {
      json: () => Promise.resolve(body),
    } as any;
  };

  beforeEach(() => {
    jest.isolateModules(() => {
      POST = require('../google/translate/route').POST;
    });
    process.env.GOOGLE_TRANSLATION_API_KEY = 'test-key';
    jest.clearAllMocks();
    
    // Silence console.error for expected errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Default fetch mock to prevent real network calls
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: { translations: [{ translatedText: 'translated' }] } }),
    } as Response);
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
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } });
    const res = await POST(mockRequest({ targetLanguage: 'es' }));
    expect(res.status).toBe(400);
  });

  it('returns 200 with empty translations when texts object is empty', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } });
    
    // Override default mock which returns 1 translation
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { translations: [] } }),
    } as any);

    const res = await POST(mockRequest({ texts: {}, targetLanguage: 'es' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.translations).toEqual({});
  });

  it('returns 400 when targetLanguage is missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } });
    const res = await POST(mockRequest({ texts: { t1: 'h' } }));
    expect(res.status).toBe(400);
  });

  it('returns translated text map on success', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } });
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          translations: [{ translatedText: 'Hello' }, { translatedText: 'World' }]
        }
      }),
    } as any);

    const res = await POST(mockRequest({
      texts: { f1: 'H', f2: 'W' },
      targetLanguage: 'es'
    }));
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.translations).toEqual({ f1: 'Hello', f2: 'World' });
  });

  it('returns 500 on Translation API failure', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } });
    
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'API Error' }),
    } as any);

    const res = await POST(mockRequest({
      texts: { f1: 'H' },
      targetLanguage: 'es'
    }));
    
    expect(res.status).toBe(500);
  });
});
