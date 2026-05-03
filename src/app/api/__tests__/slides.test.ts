/** @jest-environment node */
import 'isomorphic-fetch';
import { getServerSession, Session } from 'next-auth';
import { NextRequest } from 'next/server';
import { POST } from '../google/slides/route';

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

describe('API /api/google/slides', () => {
  const mockRequest = (body: Record<string, unknown>): NextRequest => {
    return new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as NextRequest;
  };

  const validBody: Record<string, unknown> = {
    constituencyName: 'Test',
    candidateCounts: [
      { id: '1', name: 'A', party: 'P', votes: 10 }
    ],
    winner: { id: '1', name: 'A', party: 'P', votes: 10 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 without session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(mockRequest(validBody));
    expect(res.status).toBe(401);
  });

  it('returns 400 when body invalid', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } } as Session);
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns mock response when no accessToken', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } } as Session);
    const res = await POST(mockRequest(validBody));
    const data = await res.json();
    expect(data.mock).toBe(true);
    expect(data.slidesUrl).toContain('mock-slides-id');
  });

  it('calls Google Slides API when accessToken present', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { name: 'Test User', email: 't@t.com' },
      accessToken: 'mock-token'
    } as unknown as Session);

    const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(
      (_input: string | URL | Request): Promise<Response> =>
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            presentationId: 'pres123',
            slides: [{ objectId: 's1' }]
          })
        } as Response)
    );

    const res = await POST(mockRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.slidesUrl).toContain('pres123');
    mockFetch.mockRestore();
  });

  it('handles empty candidateCounts and null winner gracefully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { name: 'Test User', email: 't@t.com' },
      accessToken: 'mock-token'
    } as unknown as Session);

    const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(
      (_input: string | URL | Request): Promise<Response> =>
        Promise.resolve({
          ok: true,
          json: async () => ({ 
            presentationId: 'presEmpty',
            slides: [{ objectId: 's1' }]
          })
        } as Response)
    );

    const body = {
        ...validBody,
        candidateCounts: [],
        winner: null
    };

    const res = await POST(mockRequest(body));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.slidesUrl).toContain('presEmpty');
    mockFetch.mockRestore();
  });

  it('logs error but returns slidesUrl when batchUpdate fails', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { name: 'Test User', email: 't@t.com' },
      accessToken: 'mock-token'
    } as unknown as Session);

    const mockFetch = jest.spyOn(global, 'fetch').mockImplementation((_input: string | URL | Request) => {
        const url = typeof _input === 'string' ? _input : (_input as Request).url || _input.toString();
        if (url.includes(':batchUpdate')) {
            return Promise.resolve({
                ok: false,
                json: async () => ({ error: 'Batch Failed' })
            } as Response);
        }
        return Promise.resolve({
            ok: true,
            json: async () => ({ 
                presentationId: 'presBatchFail',
                slides: [{ objectId: 's1' }]
            })
        } as Response);
    });

    const res = await POST(mockRequest(validBody));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.slidesUrl).toContain('presBatchFail');
    expect(console.error).toHaveBeenCalled();
    mockFetch.mockRestore();
  });

  it('returns 500 when presentation creation fails', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { name: 'Test User', email: 't@t.com' },
      accessToken: 'mock-token'
    } as unknown as Session);

    const mockFetch = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network Fail'));

    const res = await POST(mockRequest(validBody));
    expect(res.status).toBe(500);
    mockFetch.mockRestore();
  });
});
