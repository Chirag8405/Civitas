/** @jest-environment node */
import 'isomorphic-fetch';
import { POST } from '../google/slides/route';
import { getServerSession } from 'next-auth';

jest.mock('next-auth');
jest.mock('next-auth/next');
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(body),
    }),
  },
}));

describe('API /api/google/slides', () => {
  const mockRequest = (body: any) => {
    return {
      json: () => Promise.resolve(body),
    } as any;
  };

  it('returns 401 without session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(mockRequest({ constituencyName: 'Test', candidateCounts: [], winner: null }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when constituencyName missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com' } });
    const res = await POST(mockRequest({ candidateCounts: [], winner: null }));
    expect(res.status).toBe(400);
  });

  it('returns slidesUrl when session valid', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com' } });
    const res = await POST(mockRequest({ constituencyName: 'Test', candidateCounts: [], winner: null }));
    const data = await res.json();
    if (res.status !== 200) {
        console.log('Error data:', data);
    }
    expect(data.slidesUrl).toBeDefined();
  });
});
