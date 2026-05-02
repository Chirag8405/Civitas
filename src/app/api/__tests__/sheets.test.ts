/** @jest-environment node */
import 'isomorphic-fetch';
import { POST } from '../google/sheets/route';
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

describe('API /api/google/sheets', () => {
  const mockRequest = (body: any) => {
    return {
      json: () => Promise.resolve(body),
    } as any;
  };

  it('returns 401 without session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(mockRequest({ constituencyName: 'Test' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when constituencyName missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com' } });
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns sheetUrl (null or defined) when session valid', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com' } });
    const res = await POST(mockRequest({ constituencyName: 'Test' }));
    const data = await res.json();
    // It returns { sheetUrl: null, ... } if no accessToken
    expect(data).toHaveProperty('sheetUrl');
  });
});
