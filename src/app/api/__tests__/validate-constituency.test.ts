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

  // Small area (~100m x 100m)
  const validBoundary = [
    { lat: 10.000, lng: 76.000 },
    { lat: 10.001, lng: 76.000 },
    { lat: 10.001, lng: 76.001 },
    { lat: 10.000, lng: 76.001 }
  ];

  const validZones = [{ id: 'z1', name: 'Zone 1' }];

  it('returns valid:false when fewer than 3 booths via Zod', async () => {
    const res = await POST(mockRequest({
      boundary: validBoundary,
      booths: [validBooth('1', 10.0005, 76.0005), validBooth('2', 10.0006, 76.0006)],
      zones: validZones
    }));
    expect(res.status).toBe(400);
  });

  it('returns valid:true with 3 booths and valid small boundary', async () => {
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
    if (!data.valid) {
        console.log('Errors:', data.errors);
    }
    expect(data.valid).toBe(true);
  });
});
