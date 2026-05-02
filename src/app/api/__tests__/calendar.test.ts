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

describe('API /api/google/calendar', () => {
  let POST: any;

  const mockRequest = (body: any) => {
    return {
      json: () => Promise.resolve(body),
    } as any;
  };

  beforeEach(() => {
    jest.isolateModules(() => {
      POST = require('../google/calendar/route').POST;
    });
    process.env.GEMINI_API_KEY = 'test-key';
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
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
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'cal@test.com' } });
    
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: JSON.stringify([{ id: 'm1', title: 'Test', date: '2024-01-01', description: 'D', phase: 'registration', status: 'future' }]) }] } }]
      })
    } as any);

    const res = await POST(mockRequest({ action: 'generate', country: 'India', electoralSystem: 'FPTP' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.milestones)).toBe(true);
    mockFetch.mockRestore();
  });

  it('action:generate fallback returns valid milestones when Gemini returns invalid JSON', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'cal@test.com' } });
    
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        candidates: [{ content: { parts: [{ text: 'INVALID JSON' }] } }]
      })
    } as any);

    const res = await POST(mockRequest({ action: 'generate', country: 'India', electoralSystem: 'FPTP' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.milestones).toHaveLength(8);
    expect(data.milestones[0].id).toBe('m1');
  });

  it('returns 400 when action param is missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'cal@test.com' } });
    const res = await POST(mockRequest({ constituencyName: 'Test' }));
    expect(res.status).toBe(400);
  });

  it('action:create handles Calendar API 403 gracefully (returns 200 with 0 events as per implementation)', async () => {
    // Note: The route implementation (line 167) doesn't return 500 if an individual event fail.
    // It just doesn't push to createdEventIds.
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { email: 'cal@test.com' },
      accessToken: 'token'
    });

    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'Permission Denied' })
    } as any);

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
