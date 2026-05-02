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

describe('API /api/google/slides', () => {
  let POST: any;

  const mockRequest = (body: any) => {
    return {
      json: () => Promise.resolve(body),
    } as any;
  };

  const validBody = {
    constituencyName: 'Test',
    candidateCounts: [
      { id: '1', name: 'A', party: 'P', votes: 10 }
    ],
    winner: { id: '1', name: 'A', party: 'P', votes: 10 }
  };

  beforeEach(() => {
    jest.isolateModules(() => {
      POST = require('../google/slides/route').POST;
    });
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
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } });
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns mock response when no accessToken', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 't@t.com' } });
    const res = await POST(mockRequest(validBody));
    const data = await res.json();
    expect(data.mock).toBe(true);
    expect(data.slidesUrl).toContain('mock-slides-id');
  });

  it('calls Google Slides API when accessToken present', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { name: 'Test User', email: 't@t.com' },
      accessToken: 'mock-token'
    });

    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        presentationId: 'pres123',
        slides: [{ objectId: 's1' }]
      })
    } as any);

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
    });

    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        presentationId: 'presEmpty',
        slides: [{ objectId: 's1' }]
      })
    } as any);

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
    });

    const mockFetch = jest.spyOn(global, 'fetch').mockImplementation((url: any) => {
        if (url.includes(':batchUpdate')) {
            return Promise.resolve({
                ok: false,
                json: () => Promise.resolve({ error: 'Batch Failed' })
            } as any);
        }
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ 
                presentationId: 'presBatchFail',
                slides: [{ objectId: 's1' }]
            })
        } as any);
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
    });

    const mockFetch = jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network Fail'));

    const res = await POST(mockRequest(validBody));
    expect(res.status).toBe(500);
    mockFetch.mockRestore();
  });
});
