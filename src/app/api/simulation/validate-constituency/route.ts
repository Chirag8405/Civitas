import { NextRequest, NextResponse } from "next/server";
import type { LatLng } from "@/types";
import { z } from "zod";
import { MAX_BOOTH_DISTANCE_KM } from "@/lib/constants";

const latLngSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const requestSchema = z.object({
  boundary: z.array(latLngSchema).min(3),
  booths: z.array(z.object({
    id: z.string(),
    location: latLngSchema,
    name: z.string(),
  })).min(3),
  zones: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).min(1),
});

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const intersect = (polygon[i].lat > point.lat) !== (polygon[j].lat > point.lat) &&
      point.lng < ((polygon[j].lng - polygon[i].lng) * (point.lat - polygon[i].lat)) / (polygon[j].lat - polygon[i].lat) + polygon[i].lng;
    if (intersect) inside = !inside;
  }
  return inside;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const bodyJson = await req.json();
    const result = requestSchema.safeParse(bodyJson);

    if (!result.success) {
      return NextResponse.json({ valid: false, errors: result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
    }

    const { boundary, booths } = result.data;
    const errors: string[] = [];

    const checkPoints = [...boundary]; 
    const farPoints = checkPoints.filter((pt) => {
      const nearest = Math.min(...booths.map((b) => haversineKm(pt, b.location)));
      return nearest > MAX_BOOTH_DISTANCE_KM;
    });

    if (farPoints.length > 0) {
      errors.push(`${farPoints.length} point(s) are >${MAX_BOOTH_DISTANCE_KM} km from the nearest booth.`);
    }

    const boothsOutside = booths.filter((b) => !pointInPolygon(b.location, boundary));
    if (boothsOutside.length > 0) {
      errors.push(`${boothsOutside.length} booth(s) are outside the boundary.`);
    }

    return NextResponse.json({ valid: errors.length === 0, errors });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[validate-constituency] error:', message);
    return NextResponse.json({ valid: false, error: message }, { status: 500 });
  }
}
