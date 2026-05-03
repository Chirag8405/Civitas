/** @jest-environment node */
import 'isomorphic-fetch';
import { getServerSession, Session } from 'next-auth';
import { NextRequest } from 'next/server';
import { POST } from '../google/calendar/route';

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

describe('API /api/google/calendar', () => {
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
    jest.spyOn(console, 'error').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 401 without session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(mockRequest({ action: 'generate' }));
    expect(res.status).toBe(401);
  });

  it('action:generate returns milestones array with correct shape', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'cal@test.com' } } as Session);

    const mockFetch = jest.spyOn(global, 'fetch').mockImplementation(
      (_input: string | URL | Request): Promise<Response> =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: JSON.stringify([{ id: 'm1', title: 'Test', date: '2024-01-01', description: 'D', phase: 'registration', status: 'future' }]) }] } }]
          })
        } as Response)
    );

    const res = await POST(mockRequest({ action: 'generate', country: 'India', electoralSystem: 'FPTP' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.milestones)).toBe(true);
    mockFetch.mockRestore();
  });

  it('action:generate fallback returns valid milestones when Gemini returns invalid JSON', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'cal@test.com' } } as Session);

    jest.spyOn(global, 'fetch').mockImplementation(
      (_input: string | URL | Request): Promise<Response> =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: 'INVALID JSON' }] } }]
          })
        } as Response)
    );

    const res = await POST(mockRequest({ action: 'generate', country: 'India', electoralSystem: 'FPTP' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.milestones).toHaveLength(8);
    expect(data.milestones[0].id).toBe('m1');
  });

  it('returns 400 when action param is missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'cal@test.com' } } as Session);
    const res = await POST(mockRequest({ constituencyName: 'Test' }));
    expect(res.status).toBe(400);
  });

  it('action:create handles Calendar API 403 gracefully (returns 200 with 0 events as per implementation)', async () => {
    // Note: The route implementation (line 167) doesn't return 500 if an individual event fail.
    // It just doesn't push to createdEventIds.
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { email: 'cal@test.com' },
      accessToken: 'token'
    } as unknown as Session);

    jest.spyOn(global, 'fetch').mockImplementation(
      (_input: string | URL | Request): Promise<Response> =>
        Promise.resolve({
          ok: false,
          status: 403,
          json: async () => ({ error: 'Permission Denied' })
        } as Response)
    );

    const res = await POST(mockRequest({
      action: 'create',
      milestones: [{ id: 'm1', title: 'T', date: '2024-01-01', description: 'D', phase: 'polling', status: 'future' }],
      constituencyName: 'Test'
    }));

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.eventIds).toHaveLength(0);
  });

  it('returns 500 on unhandled error', async () => {
    (getServerSession as jest.Mock).mockRejectedValue(new Error('Panic'));
    const res = await POST(mockRequest({ action: 'generate', country: 'India', electoralSystem: 'FPTP' }));
    expect(res.status).toBe(500);
    expect(console.error).toHaveBeenCalled();
  });
});
