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

describe('API /api/google/sheets', () => {
  let POST: any;

  const mockRequest = (body: any) => {
    return {
      json: () => Promise.resolve(body),
    } as any;
  };

  beforeEach(() => {
    jest.isolateModules(() => {
      POST = require('../google/sheets/route').POST;
    });
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
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com' } });
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns mock response when no accessToken', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: 'test@example.com' } });
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
    });

    const mockFetch = jest.spyOn(global, 'fetch').mockImplementation((url: any) => {
      if (url.includes('/permissions')) {
        return Promise.reject(new Error('Sharing Failed'));
      }
      if (url.includes('/values/')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as any);
      }
      if (url.includes(':batchUpdate')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as any);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ spreadsheetId: 'sheet123' })
      } as any);
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
    });

    jest.spyOn(global, 'fetch').mockImplementation((url: any) => {
      if (url.includes('/values/')) {
        return Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'Write Fail' }) } as any);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ spreadsheetId: 'sheetWriteFail' })
      } as any);
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
