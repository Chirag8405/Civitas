/** @jest-environment node */
import 'isomorphic-fetch';
import { POST } from '../google/sheets/route';
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
  const mockRequest = (body: any) => {
    return {
      json: () => Promise.resolve(body),
    } as any;
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('calls Google Sheets API when accessToken present', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { email: 'test@test.com' },
      accessToken: 'mock-token'
    });

    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ spreadsheetId: 'sheet123' })
    } as any);

    const res = await POST(mockRequest({ constituencyName: 'Test' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.spreadsheetId).toBe('sheet123');
    expect(data.sheetUrl).toContain('sheet123');
    
    mockFetch.mockRestore();
  });

  it('returns 500 when Google Sheets creation fails', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ 
      user: { email: 'test@test.com' },
      accessToken: 'mock-token'
    });

    const mockFetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'API Error' })
    } as any);

    const res = await POST(mockRequest({ constituencyName: 'Test' }));
    expect(res.status).toBe(500);
    
    mockFetch.mockRestore();
  });
});
