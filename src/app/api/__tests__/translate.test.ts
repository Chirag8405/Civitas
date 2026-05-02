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
  });

  it('returns 401 without session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(mockRequest({ texts: {}, targetLanguage: 'en' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when texts or targetLanguage missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } });
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns translated text map on success', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } });
    
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
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
    mockFetch.mockRestore();
  });

  it('returns 500 on Translation API failure', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } });
    
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'API Error' }),
    } as any);

    const res = await POST(mockRequest({
      texts: { f1: 'H' },
      targetLanguage: 'es'
    }));
    
    expect(res.status).toBe(500);
    mockFetch.mockRestore();
  });
});
