/** @jest-environment node */
import 'isomorphic-fetch';
import { POST } from '../google/calendar/route';
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

describe('API /api/google/calendar', () => {
  const mockRequest = (body: any) => {
    return {
      json: () => Promise.resolve(body),
    } as any;
  };

  it('returns 401 without session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(mockRequest({ action: 'generate' }));
    expect(res.status).toBe(401);
  });
});
