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

describe('API /api/gemini', () => {
  let POST: any;

  const mockRequest = (body: any) => {
    return {
      json: () => Promise.resolve(body),
    } as any;
  };

  beforeEach(() => {
    jest.isolateModules(() => {
      POST = require('../gemini/route').POST;
    });
    process.env.GEMINI_API_KEY = 'test-key';
    jest.clearAllMocks();
  });

  it('returns 401 without session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(mockRequest({ messages: [] }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when body invalid', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'gemini@test.com' } });
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 500 when Gemini API fails', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'gemini@test.com' } });
    
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: { message: 'API Error' } })
    } as any);

    const res = await POST(mockRequest({ 
      messages: [{ role: 'user', content: 'hello' }] 
    }));
    expect(res.status).toBe(500);
    mockFetch.mockRestore();
  });

  it('returns 200 on success', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'gemini@test.com' } });
    
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        candidates: [{ content: { parts: [{ text: 'AI Response' }] } }] 
      })
    } as any);

    const res = await POST(mockRequest({ 
      messages: [{ role: 'user', content: 'hello' }] 
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.content).toBe('AI Response');
    mockFetch.mockRestore();
  });
});
