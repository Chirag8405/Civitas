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

  it('returns 200 on success and check response format', async () => {
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
    expect(data.advisoryRef).toMatch(/^CE-\d{4}$/);
    mockFetch.mockRestore();
  });

  it('returns 429 when rate limit exceeded', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'ratelimit@test.com' } });
    
    // Call 10 times (limit is 10)
    for (let i = 0; i < 10; i++) {
        await POST(mockRequest({ messages: [{ role: 'user', content: 'h' }] }));
    }
    
    // 11th call
    const res = await POST(mockRequest({ messages: [{ role: 'user', content: 'h' }] }));
    expect(res.status).toBe(429);
  });

  it('passes context correctly to Gemini prompt', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'context@test.com' } });
    
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        candidates: [{ content: { parts: [{ text: 'OK' }] } }] 
      })
    } as any);

    await POST(mockRequest({ 
      messages: [{ role: 'user', content: 'hello' }],
      context: { phase: 'polling', constituency: 'Mumbai' }
    }));

    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.systemInstruction.parts[0].text).toContain('polling');
    expect(body.systemInstruction.parts[0].text).toContain('Mumbai');
    
    mockFetch.mockRestore();
  });

  it('returns 500 when API key missing', async () => {
    delete process.env.GEMINI_API_KEY;
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'nokey@test.com' } });
    const res = await POST(mockRequest({ messages: [{ role: 'user', content: 'h' }] }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Server misconfiguration');
  });
});
