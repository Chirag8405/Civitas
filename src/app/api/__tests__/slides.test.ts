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

    jest.spyOn(global, 'fetch').mockResolvedValue({
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
  });
});
