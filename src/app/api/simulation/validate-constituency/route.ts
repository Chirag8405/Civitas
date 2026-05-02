import { NextRequest, NextResponse } from "next/server";
import type { LatLng, PollingBooth, Zone } from "@/types";
import { z } from "zod";

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

type RequestData = z.infer<typeof requestSchema>;

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

// Point-in-polygon (ray casting)
function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Sample interior points of the polygon for coverage check
function samplePolygonPoints(boundary: LatLng[], count = 20): LatLng[] {
  const lats = boundary.map((p) => p.lat);
  const lngs = boundary.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const points: LatLng[] = [...boundary]; // include vertices
  for (let i = 0; i < count; i++) {
    const candidate: LatLng = {
      lat: minLat + Math.random() * (maxLat - minLat),
      lng: minLng + Math.random() * (maxLng - minLng),
    };
    if (pointInPolygon(candidate, boundary)) points.push(candidate);
  }
  return points;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const bodyJson = await req.json();
    const result = requestSchema.safeParse(bodyJson);

    if (!result.success) {
      return NextResponse.json(
        { valid: false, errors: result.error.issues.map(i => `${i.path.join(".")}: ${i.message}`) },
        { status: 400 }
      );
    }

    const { boundary, booths, zones } = result.data;

    const errors: string[] = [];

    // 1. Exactly 3 booths (redundant with zod but keeping logic)
    if (booths.length < 3) {
      errors.push(`At least 3 polling booths required. ${booths.length} provided.`);
    }

    // 2. Boundary has enough vertices (redundant with zod but keeping logic)
    if (boundary.length < 3) {
      errors.push("Constituency boundary must have at least 3 vertices.");
    }

    if (errors.length > 0) {
      return NextResponse.json({ valid: false, errors });
    }

    // 3. All boundary vertices + sampled interior points within 1.2km of nearest booth
    const checkPoints = samplePolygonPoints(boundary, 30);
    const farPoints = checkPoints.filter((pt) => {
      const nearest = Math.min(...booths.map((b) => haversineKm(pt, b.location)));
      return nearest > 1.2;
    });

    if (farPoints.length > 0) {
      errors.push(
        `${farPoints.length} point(s) in the constituency are >1.2 km from the nearest booth. Reposition booths for full coverage.`
      );
    }

    // 4. At least one zone defined (redundant with zod but keeping logic)
    if (zones.length === 0) {
      errors.push("At least one electoral zone must be defined.");
    }

    // 5. Booths must be inside the boundary
    const boothsOutside = booths.filter((b) => !pointInPolygon(b.location, boundary));
    if (boothsOutside.length > 0) {
      errors.push(
        `${boothsOutside.length} booth(s) are outside the constituency boundary.`
      );
    }

    return NextResponse.json({
      valid: errors.length === 0,
      errors,
      meta: {
        boothCount: booths.length,
        zoneCount: zones.length,
        vertexCount: boundary.length,
        sampledCoveragePoints: checkPoints.length,
      },
    });
  } catch (err) {
    console.error("[validate-constituency] Error:", err);
    return NextResponse.json(
      { valid: false, errors: ["Server error during validation."] },
      { status: 500 }
    );
  }
}
