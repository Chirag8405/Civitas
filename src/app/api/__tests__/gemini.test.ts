/** @jest-environment node */
import 'isomorphic-fetch';
import { POST } from '../gemini/route';
import { NextRequest } from 'next/server';
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

describe('API /api/gemini', () => {
  const mockRequest = (body: any) => {
    return {
      json: () => Promise.resolve(body),
    } as unknown as NextRequest;
  };

  it('returns 401 when no session', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);
    const res = await POST(mockRequest({ messages: [] }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when messages array missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com' } });
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Invalid request body");
  });

  it('returns 400 when messages is empty array', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com' } });
    const res = await POST(mockRequest({ messages: [] }));
    expect(res.status).toBe(400);
  });
});
