/** @jest-environment node */
import 'isomorphic-fetch';
import { getServerSession, Session } from 'next-auth';
import { NextRequest } from 'next/server';
import { POST } from '../gemini/route';

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

describe('API /api/gemini', () => {
  const mockRequest = (body: Record<string, unknown>): NextRequest => {
    return new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as NextRequest;
  };

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key';
    jest.clearAllMocks();
    
    // Silence console.error for expected errors
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Default fetch mock to prevent real network calls
    jest.spyOn(global, 'fetch').mockImplementation(
      (_input: string | URL | Request): Promise<Response> =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: { message: 'API Error' } }),
        } as Response)
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 without session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(mockRequest({ messages: [] }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when body invalid', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'gemini@test.com' } } as Session);
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 500 when Gemini API fails', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'gemini@test.com' } } as Session);
    
    // Specialized mock for this test
    (global.fetch as jest.Mock).mockImplementation(
      (_input: string | URL | Request): Promise<Response> =>
        Promise.resolve({
          ok: false,
          json: async () => ({ error: { message: 'API Error' } })
        } as Response)
    );

    const res = await POST(mockRequest({ 
      messages: [{ role: 'user', content: 'hello' }] 
    }));
    expect(res.status).toBe(500);
  });

  it('returns 200 on success and check response format', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'gemini@test.com' } } as Session);
    
    (global.fetch as jest.Mock).mockImplementation(
      (_input: string | URL | Request): Promise<Response> =>
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            candidates: [{ content: { parts: [{ text: 'AI Response' }] } }] 
          })
        } as Response)
    );

    const res = await POST(mockRequest({ 
      messages: [{ role: 'user', content: 'hello' }] 
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.content).toBe('AI Response');
    expect(data.advisoryRef).toMatch(/^CE-\d{4}$/);
  });

  it('returns 429 when rate limit exceeded', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'ratelimit@test.com' } } as Session);
    
    // Call 10 times (limit is 10)
    for (let i = 0; i < 10; i++) {
        await POST(mockRequest({ messages: [{ role: 'user', content: 'h' }] }));
    }
    
    // 11th call
    const res = await POST(mockRequest({ messages: [{ role: 'user', content: 'h' }] }));
    expect(res.status).toBe(429);
  });

  it('passes context correctly to Gemini prompt', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'context@test.com' } } as Session);
    
    (global.fetch as jest.Mock).mockImplementation(
      (_input: string | URL | Request): Promise<Response> =>
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            candidates: [{ content: { parts: [{ text: 'OK' }] } }] 
          })
        } as Response)
    );

    await POST(mockRequest({ 
      messages: [{ role: 'user', content: 'hello' }],
      context: { phase: 'polling', constituency: 'Mumbai' }
    }));

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.systemInstruction.parts[0].text).toContain('polling');
    expect(body.systemInstruction.parts[0].text).toContain('Mumbai');
  });

  it('returns 500 when API key missing', async () => {
    delete process.env.GEMINI_API_KEY;
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'nokey@test.com' } } as Session);
    const res = await POST(mockRequest({ messages: [{ role: 'user', content: 'h' }] }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Server misconfiguration');
  });
});
