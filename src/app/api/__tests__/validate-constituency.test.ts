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

  it('returns 400 on missing or invalid body fields', async () => {
    const res = await POST(mockRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns valid:false with insufficient booths', async () => {
    // 0 booths
    let res = await POST(mockRequest({
      boundary: validBoundary,
      booths: [],
      zones: validZones
    }));
    expect(res.status).toBe(400);

    // 2 booths
    res = await POST(mockRequest({
      boundary: validBoundary,
      booths: [validBooth('1', 10.0005, 76.0005), validBooth('2', 10.0005, 76.0005)],
      zones: validZones
    }));
    expect(res.status).toBe(400);
  });

  it('returns valid:false when boundary has too few vertices', async () => {
    const res = await POST(mockRequest({
      boundary: [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }],
      booths: [validBooth('1', 0.5, 0.5), validBooth('2', 0.5, 0.5), validBooth('3', 0.5, 0.5)],
      zones: validZones
    }));
    expect(res.status).toBe(400);
  });

  it('returns valid:false when booth is outside boundary', async () => {
    const res = await POST(mockRequest({
      boundary: validBoundary,
      booths: [
        validBooth('1', 10.0005, 76.0005),
        validBooth('2', 10.0005, 76.0005),
        validBooth('3', 11.000, 77.000) // Outside
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
});
