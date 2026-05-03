/** @jest-environment node */
import 'isomorphic-fetch';
import { getServerSession, Session } from 'next-auth';
import { NextRequest } from 'next/server';
import { POST } from '../google/sheets/route';

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

describe('API /api/google/sheets', () => {
  const mockRequest = (body: Record<string, unknown>): NextRequest => {
    return new NextRequest('http://localhost:3000/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }) as unknown as NextRequest;
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
    const res = await POST(mockRequest({ constituencyName: 'Test' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when constituencyName missing', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com' } } as Session);
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns mock response when no accessToken', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com' } } as Session);
    const res = await POST(mockRequest({ constituencyName: 'Test', zones: [{id:'z1', name:'Z1'}] }));
    const data = await res.json();
    expect(data.mock).toBe(true);
    expect(data.sheetUrl).toBeNull();
    expect(data.voterCount).toBe(200);
  });

  it('calls Google Sheets API and handles sharing step failure', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { email: 'test@test.com' },
      accessToken: 'mock-token'
    } as unknown as Session);

    jest.spyOn(global, 'fetch').mockImplementation((_input: string | URL | Request) => {
      const url = typeof _input === 'string' ? _input : (_input as Request).url || _input.toString();
      if (url.includes('/permissions')) {
        return Promise.reject(new Error('Sharing Failed'));
      }
      if (url.includes('/values/')) {
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
      }
      if (url.includes(':batchUpdate')) {
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ spreadsheetId: 'sheet123' })
      } as Response);
    });

    const res = await POST(mockRequest({ constituencyName: 'Test' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.spreadsheetId).toBe('sheet123');
    expect(data.sheetUrl).toContain('sheet123');
  });

  it('returns 500 when Sheets data write fails', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { email: 'test@test.com' },
      accessToken: 'mock-token'
    } as unknown as Session);

    jest.spyOn(global, 'fetch').mockImplementation((_input: string | URL | Request) => {
      const url = typeof _input === 'string' ? _input : (_input as Request).url || _input.toString();
      if (url.includes('/values/')) {
        return Promise.resolve({ ok: false, json: async () => ({ error: 'Write Fail' }) } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ spreadsheetId: 'sheetWriteFail' })
      } as Response);
    });

    const res = await POST(mockRequest({ constituencyName: 'Test' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe('Sheet created but data write failed');
  });

  it('returns 500 on unhandled error', async () => {
    (getServerSession as jest.Mock).mockRejectedValue(new Error('Panic'));
    const res = await POST(mockRequest({ constituencyName: 'Test' }));
    expect(res.status).toBe(500);
    expect(console.error).toHaveBeenCalledWith('[sheets] error:', expect.any(String));
  });
});
