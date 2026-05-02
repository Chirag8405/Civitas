/** @jest-environment node */
import 'isomorphic-fetch';
import { POST } from '../simulation/validate-constituency/route';

jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: any) => ({
      status: init?.status ?? 200,
      json: () => Promise.resolve(body),
    }),
  },
}));

describe('API /api/validate-constituency', () => {
  const mockRequest = (body: any) => {
    return {
      json: () => Promise.resolve(body),
    } as any;
  };

  const validBooth = (id: string, lat: number, lng: number) => ({
    id,
    name: `Booth ${id}`,
    location: { lat, lng }
  });

  const validBoundary = [
    { lat: 10.000, lng: 76.000 },
    { lat: 10.001, lng: 76.000 },
    { lat: 10.001, lng: 76.001 },
    { lat: 10.000, lng: 76.001 }
  ];

  const validZones = [{ id: 'z1', name: 'Zone 1' }];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns 400 on missing or invalid body fields', async () => {
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns valid:false when booth is outside boundary', async () => {
    const res = await POST(mockRequest({
      boundary: validBoundary,
      booths: [
        validBooth('1', 10.0005, 76.0005),
        validBooth('2', 10.0005, 76.0005),
        validBooth('3', 11.000, 77.000) // Way outside
      ],
      zones: validZones
    }));
    const data = await res.json();
    expect(data.valid).toBe(false);
    expect(data.errors).toContain('1 booth(s) are outside the constituency boundary.');
  });

  it('returns valid:true with correct data', async () => {
    const res = await POST(mockRequest({
      boundary: validBoundary,
      booths: [
        validBooth('1', 10.0002, 76.0002),
        validBooth('2', 10.0005, 76.0005),
        validBooth('3', 10.0008, 76.0008)
      ],
      zones: validZones
    }));
    const data = await res.json();
    expect(data.valid).toBe(true);
  });

  it('haversine calculation coverage: points apart and identical', async () => {
    // We test this via coverage check. 
    // Two points far apart will trigger line 112 (farPoints.length > 0)
    const res = await POST(mockRequest({
      boundary: validBoundary,
      booths: [
        validBooth('1', 10.0, 76.0),
        validBooth('2', 10.0, 76.0),
        validBooth('3', 10.0, 76.0)
      ],
      zones: validZones
    }));
    const data = await res.json();
    // Since all booths are at one corner (10,76), points at (10.001, 76.001) 
    // will be > 1.2km away if we assume 0.001 deg is ~111m, so diag is ~150m.
    // Wait, 1.2km is quite a bit. Let's make them really far.
    const farBoundary = [
        { lat: 10, lng: 76 },
        { lat: 11, lng: 76 },
        { lat: 11, lng: 77 },
        { lat: 10, lng: 77 }
    ];
    const farRes = await POST(mockRequest({
        boundary: farBoundary,
        booths: [validBooth('1', 10, 76), validBooth('2', 10, 76.0001), validBooth('3', 10.0001, 76)],
        zones: validZones
    }));
    const farData = await farRes.json();
    expect(farData.errors.some((e: string) => e.includes('km from the nearest booth'))).toBe(true);
  });

  it('returns 500 on unhandled error', async () => {
    // Trigger catch block by passing something that makes req.json() throw
    const res = await POST({
        json: () => Promise.reject(new Error('JSON Error'))
    } as any);
    expect(res.status).toBe(500);
    expect(console.error).toHaveBeenCalled();
  });
});
