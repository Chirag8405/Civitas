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
    expect(data.milestones[0]).toHaveProperty('id');
    expect(data.milestones[0]).toHaveProperty('title');
    expect(data.milestones[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    mockFetch.mockRestore();
  });

  it('action:generate returns 500 when Gemini fails', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'cal@test.com' } });
    
    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Fail' })
    } as any);

    const res = await POST(mockRequest({ action: 'generate', country: 'India', electoralSystem: 'FPTP' }));
    expect(res.status).toBe(500);
    mockFetch.mockRestore();
  });

  it('action:create returns 200 with zero events when milestones array is empty', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'cal@test.com' } });
    const res = await POST(mockRequest({ 
      action: 'create', 
      milestones: [],
      constituencyName: 'Test'
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.eventCount).toBe(0);
  });

  it('action:create returns mock when no accessToken', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'cal@test.com' } });
    const res = await POST(mockRequest({ 
      action: 'create', 
      milestones: [{ id: 'm1', title: 'T', date: '2024-01-01', description: 'D', phase: 'polling', status: 'future' }],
      constituencyName: 'Test'
    }));
    const data = await res.json();
    expect(data.mock).toBe(true);
    expect(data.eventCount).toBe(1);
  });

  it('action:create calls Calendar API and handles success', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { email: 'cal@test.com' },
      accessToken: 'token'
    });

    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'event123' })
    } as any);

    const res = await POST(mockRequest({ 
      action: 'create', 
      milestones: [{ id: 'm1', title: 'T', date: '2024-01-01', description: 'D', phase: 'polling', status: 'future' }],
      constituencyName: 'Test'
    }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.eventIds).toContain('event123');
    mockFetch.mockRestore();
  });

  it('action:create handles Calendar API failure gracefully', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { email: 'cal@test.com' },
      accessToken: 'token'
    });

    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Calendar API Fail' })
    } as any);

    const res = await POST(mockRequest({ 
      action: 'create', 
      milestones: [{ id: 'm1', title: 'T', date: '2024-01-01', description: 'D', phase: 'polling', status: 'future' }],
      constituencyName: 'Test'
    }));
    
    // The code currently doesn't return 500 if one event fails, it just logs it.
    // Let's verify it still returns 200 but with empty eventIds if all fail.
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.eventIds).toHaveLength(0);
    mockFetch.mockRestore();
  });

  it('returns 400 when body invalid or action missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'cal@test.com' } });
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
  });
});
