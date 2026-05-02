"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSimulationStore } from "@/store/simulation.store";
import { GeminiAdvisor } from "@/components/ui/GeminiAdvisor";
import type { GeminiMessage } from "@/components/ui/GeminiAdvisor";
import { MapSidebar } from "@/components/ui/MapSidebar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import type { LatLng, PollingBooth, Zone } from "@/types";

// ─── Constants ───────────────────────────────────────────────────────────────
const ZONE_COLOURS: Record<Zone["color"], { hex: string; label: string }> = {
  navy: { hex: "#1A1A2E", label: "Zone A" },
  red: { hex: "#C0392B", label: "Zone B" },
  gold: { hex: "#D4A017", label: "Zone C" },
};

const INITIAL_ZONES: Zone[] = [
  { id: "z1", name: "Zone A", color: "navy" },
  { id: "z2", name: "Zone B", color: "red" },
  { id: "z3", name: "Zone C", color: "gold" },
];

const BALLOT_BOX_SVG =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'>
      <rect x='6' y='10' width='24' height='18' fill='#F5F0E8' stroke='#1A1A2E' stroke-width='2'/>
      <rect x='10' y='6' width='16' height='6' fill='#F5F0E8' stroke='#1A1A2E' stroke-width='2'/>
      <rect x='12' y='18' width='12' height='6' fill='#C0392B'/>
    </svg>`
  );

const MONOCHROME_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#F5F0E8" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#666666" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#F5F0E8" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#D0CCC2" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#BDBAB2" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#E2DDD5" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#C0C0B8" }] },
];

function haversineKm(a: LatLng, b: LatLng) {
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

function polygonCentroid(path: LatLng[]): LatLng {
  const lat = path.reduce((s, p) => s + p.lat, 0) / path.length;
  const lng = path.reduce((s, p) => s + p.lng, 0) / path.length;
  return { lat, lng };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MapPage() {
  const router = useRouter();
  const { constituency, updateConstituency } = useSimulationStore();

  // Local state
  const [zones, setZones] = React.useState<Zone[]>(INITIAL_ZONES);
  const [booths, setBooths] = React.useState<PollingBooth[]>(
    constituency.pollingBooths ?? []
  );
  const [boundary, setBoundary] = React.useState<LatLng[]>([]);
  const [showRadius, setShowRadius] = React.useState(true);
  const [boothMode, setBoothMode] = React.useState(false);
  const [warnings, setWarnings] = React.useState<string[]>([]);
  const [dismissedWarnings, setDismissedWarnings] = React.useState<Set<string>>(new Set());
  const [validating, setValidating] = React.useState(false);
  const [advisorOpen, setAdvisorOpen] = React.useState(false);
  const [advisorMessages, setAdvisorMessages] = React.useState<GeminiMessage[]>([]);
  const [advisorLoading, setAdvisorLoading] = React.useState(false);

  // Map refs
  const mapNodeRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const drawingRef = React.useRef<any>(null);
  const boundaryPolygonRef = React.useRef<any>(null);
  const boothMarkersRef = React.useRef<any[]>([]);
  const boothCirclesRef = React.useRef<any[]>([]);
  const warningOverlaysRef = React.useRef<any[]>([]);
  const [mapReady, setMapReady] = React.useState(false);
  const [mapMissing, setMapMissing] = React.useState(false);

  // ── Guard: constituency must be named before reaching the map ────────────────
  React.useEffect(() => {
    if (!constituency.name) {
      router.replace("/setup");
    }
  }, [constituency.name, router]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const activeWarnings = warnings.filter((w) => !dismissedWarnings.has(w));
  const canValidate =
    boundary.length >= 3 &&
    booths.length >= 3 &&
    activeWarnings.length === 0;

  const boothModeRef = React.useRef(boothMode);
  React.useEffect(() => { boothModeRef.current = boothMode; }, [boothMode]);
  const gRef = React.useRef<any>(null);
  const pathObjRef = React.useRef<any>(null);
  // ── Google Maps init ───────────────────────────────────────────────────────
  React.useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
    if (!apiKey) { setMapMissing(true); return; }

    let mounted = true;
    (window as any).__googleMapsLoaderPromise ??= (async () => {
      await (globalThis as any).google?.maps?.importLibrary?.("maps").catch(() => null);
      if (!(window as any).google?.maps) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=maps`;
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Maps failed to load"));
          document.head.appendChild(script);
        });
      }
    })();

    (window as any).__googleMapsLoaderPromise.then(() => {
      if (!mounted || !mapNodeRef.current) return;
      const g = (window as any).google;
      gRef.current = g;

      const map = new g.maps.Map(mapNodeRef.current, {
        center: constituency.center ?? { lat: 20, lng: 78 },
        zoom: constituency.center ? 14 : 12,
        styles: MONOCHROME_STYLES,
        disableDefaultUI: true,
        backgroundColor: "#F5F0E8",
      });
      mapRef.current = map;

      // Auto-center via Geocoding if not already centered
      if (!constituency.center && constituency.name) {
        const geocoder = new g.maps.Geocoder();
        geocoder.geocode(
          { address: `${constituency.name}, ${constituency.country}` },
          (results: any, status: any) => {
            if (status === "OK" && results?.[0]?.geometry?.location) {
              const loc = results[0].geometry.location;
              map.setCenter(loc);
              map.setZoom(14);
              updateConstituency({ center: { lat: loc.lat(), lng: loc.lng() } });
            } else {
              console.warn("Geocoding failed:", status);
            }
          }
        );
      }

      // Custom zoom controls
      const zoomDiv = document.createElement("div");
      zoomDiv.style.cssText = "display:flex;flex-direction:column;gap:4px;margin:8px;";
      ["＋", "－"].forEach((label, i) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = label;
        btn.style.cssText =
          "width:36px;height:36px;border:2px solid #1A1A2E;background:#F5F0E8;font-size:16px;cursor:pointer;";
        btn.addEventListener("click", () => {
          const z = map.getZoom() ?? 12;
          map.setZoom(i === 0 ? z + 1 : z - 1);
        });
        btn.setAttribute("aria-label", i === 0 ? "Zoom in" : "Zoom out");
        zoomDiv.appendChild(btn);
      });
      map.controls[g.maps.ControlPosition.RIGHT_BOTTOM].push(zoomDiv);

      // Manual polygon drawing
      const pathObj = new g.maps.MVCArray();
      pathObjRef.current = pathObj;

      const boundaryPolygon = new g.maps.Polygon({
        map: map,
        paths: [pathObj],
        fillColor: "#C0392B",
        fillOpacity: 0.08,
        strokeColor: "#C0392B",
        strokeWeight: 3,
        editable: true,
      });
      boundaryPolygonRef.current = boundaryPolygon;

      const updateBoundary = () => {
        const path = boundaryPolygon.getPath();
        if (!path) return;
        const pts: LatLng[] = path.getArray().map((pt: any) => ({ lat: pt.lat(), lng: pt.lng() }));
        setBoundary(pts);
      };

      g.maps.event.addListener(pathObj, "set_at", updateBoundary);
      g.maps.event.addListener(pathObj, "insert_at", updateBoundary);
      g.maps.event.addListener(pathObj, "remove_at", updateBoundary);

      const handleMapClick = (ev: any) => {
        if (!ev.latLng) return;
        const loc: LatLng = { lat: ev.latLng.lat(), lng: ev.latLng.lng() };

        if (boothModeRef.current) {
          handleBoothPlaceRef.current(loc);
        } else {
          // Draw mode: add vertex
          boundaryPolygon.getPath().push(ev.latLng);
          updateBoundary();
        }
      };

      map.setOptions({ draggableCursor: 'crosshair', gestureHandling: 'greedy' });
      map.addListener("click", handleMapClick);
      g.maps.event.addListener(boundaryPolygon, "click", handleMapClick);

      // Right-click on map pops the last vertex
      map.addListener("rightclick", () => {
        if (!boothModeRef.current) {
          const path = boundaryPolygon.getPath();
          if (path && path.getLength() > 0) {
            path.pop();
            updateBoundary();
          }
        }
      });

      // Right-click on polygon removes clicked vertex or pops last vertex
      g.maps.event.addListener(boundaryPolygon, "rightclick", (ev: any) => {
        if (!boothModeRef.current) {
          if (ev.vertex != null) {
            boundaryPolygon.getPath().removeAt(ev.vertex);
          } else {
            const path = boundaryPolygon.getPath();
            if (path && path.getLength() > 0) {
              path.pop();
            }
          }
          updateBoundary();
        }
      });
      setMapReady(true);
    });
    return () => {
      mounted = false;
      const g = gRef.current;
      const pathObj = pathObjRef.current;
      if (g && mapRef.current) {
        g.maps.event.clearInstanceListeners(mapRef.current);
      }
      if (g && boundaryPolygonRef.current) {
        g.maps.event.clearInstanceListeners(boundaryPolygonRef.current);
      }
      if (g && pathObj) {
        g.maps.event.clearInstanceListeners(pathObj);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ref forwarding for boothMode and handleBoothPlace (closure capture fix)
  //const boothModeRef = React.useRef(boothMode);
  //React.useEffect(() => { boothModeRef.current = boothMode; }, [boothMode]);



  // ── Place a booth ──────────────────────────────────────────────────────────
  const handleBoothPlace = React.useCallback(
    (loc: LatLng) => {
      const currentBooths = booths;
      if (currentBooths.length >= 3) return;
      const g = (window as any).google;
      const id = `booth-${Date.now()}`;
      const newBooth: PollingBooth = { id, name: `Booth ${currentBooths.length + 1}`, location: loc };

      setBooths((prev) => {
        const next = [...prev, newBooth];

        // Add marker
        const marker = new g.maps.Marker({
          position: loc,
          map: mapRef.current,
          icon: { url: BALLOT_BOX_SVG, scaledSize: new g.maps.Size(36, 36) },
          title: newBooth.name,
        });
        boothMarkersRef.current.push(marker);

        // Add 1.2km dashed circle
        const circle = new g.maps.Circle({
          map: mapRef.current,
          center: loc,
          radius: 1200,
          strokeColor: "#1A1A2E",
          strokeOpacity: 0.6,
          strokeWeight: 1.5,
          fillOpacity: 0,
          // dashed via SVG icons trick
        });
        boothCirclesRef.current.push(circle);
        circle.setVisible(showRadius);

        return next;
      });
    },
    [booths, showRadius]
  );


  const handleClearBooths = () => {
    boothMarkersRef.current.forEach((m: any) => m.setMap(null));
    boothCirclesRef.current.forEach((c: any) => c.setMap(null));
    boothMarkersRef.current = [];
    boothCirclesRef.current = [];
    setBooths([]);
    setBoothMode(false);
  };

  const handleBoothPlaceRef = React.useRef<any>(null);
  React.useEffect(() => {
    handleBoothPlaceRef.current = handleBoothPlace;
  }, [handleBoothPlace]);

  // ── Toggle radius circles ──────────────────────────────────────────────────
  React.useEffect(() => {
    boothCirclesRef.current.forEach((c) => c.setVisible(showRadius));
  }, [showRadius]);

  // ── Coverage warnings ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!mapReady || boundary.length < 3 || booths.length === 0) return;
    const uncovered = boundary.filter((pt) => {
      return booths.every((b) => haversineKm(pt, b.location) > 1.2);
    });
    const newWarnings: string[] = [];
    if (uncovered.length > 0)
      newWarnings.push(
        `${uncovered.length} boundary vertex/vertices are >1.2 km from any booth.`
      );
    setWarnings(newWarnings);

    // Clear old overlays
    warningOverlaysRef.current.forEach((m) => m.setMap(null));
    warningOverlaysRef.current = [];
    const g = (window as any).google;
    uncovered.forEach((pt) => {
      const m = new g.maps.Marker({
        position: pt,
        map: mapRef.current,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: "#C0392B",
          fillOpacity: 0.9,
          strokeWeight: 0,
        },
      });
      warningOverlaysRef.current.push(m);
    });
  }, [boundary, booths, mapReady]);

  // ── Gemini auto-query after boundary drawn ─────────────────────────────────
  React.useEffect(() => {
    if (boundary.length < 3 || !constituency.country) return;
    const area = boundary.length; // proxy for size
    const prompt = `I am configuring a constituency named "${constituency.name}" in ${constituency.country}. The boundary has ${area} points. What are the wheelchair-accessible polling booth requirements and any language-minority considerations I must address? List as bullet points, be brief.`;
    setAdvisorOpen(true);
    setAdvisorLoading(true);
    fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        context: { phase: "setup", constituency: constituency.name },
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        const msg: GeminiMessage = {
          id: Date.now().toString(),
          ref: data.advisoryRef,
          text: data.content ?? data.error ?? "No advisory available.",
        };
        setAdvisorMessages((prev) => [...prev, msg]);

      })
      .catch(() => { })
      .finally(() => setAdvisorLoading(false));
    // Run only once per boundary completion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundary.length >= 3 ? "ready" : "wait"]);

  // ── Validate + generate voter roll ────────────────────────────────────────
  const handleValidate = async () => {
    setValidating(true);
    try {
      const vRes = await fetch("/api/simulation/validate-constituency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boundary, booths, zones }),
      });
      const vData = await vRes.json();
      if (!vData.valid) {
        setWarnings(vData.errors ?? ["Validation failed."]);
        setValidating(false);
        return;
      }

      // Save to store + generate voter roll
      updateConstituency({ pollingBooths: booths, zones });
      const srRes = await fetch("/api/google/sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constituencyName: constituency.name,
          country: constituency.country,
          zones,
        }),
      });
      const srData = await srRes.json();
      if (srData.sheetUrl) updateConstituency({ voterRollUrl: srData.sheetUrl });

      router.push("/setup/voter-roll");
    } catch {
      setWarnings(["Validation request failed. Check server logs."]);
    } finally {
      setValidating(false);
    }
  };

  // ── Advisor send ──────────────────────────────────────────────────────────
  const handleAdvisorSend = React.useCallback(async (message: string) => {
    setAdvisorLoading(true);
    setAdvisorMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: message },
    ]);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: message }],
          context: { phase: "setup", constituency: constituency.name },
        }),
      });
      const data = await res.json();
      setAdvisorMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), ref: data.advisoryRef, text: data.content ?? data.error ?? "No response." },
      ]);
    } catch {
      setAdvisorMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: "Advisory unavailable." },
      ]);
    } finally {
      setAdvisorLoading(false);
    }
  }, [constituency.name]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <div className="relative flex h-screen overflow-hidden bg-paperCream">
        <MapSidebar
          constituency={constituency}
          zones={zones}
          setZones={setZones}
          booths={booths}
          showRadius={showRadius}
          setShowRadius={setShowRadius}
          activeWarnings={activeWarnings}
          setDismissedWarnings={setDismissedWarnings}
          handleValidate={handleValidate}
          validating={validating}
          canValidate={canValidate}
          advisorOpen={advisorOpen}
          setAdvisorOpen={setAdvisorOpen}
          onClearBooths={handleClearBooths}
          boundaryLength={boundary.length}
        />

        {/* ── Map area ─────────────────────────────────────────────────────── */}
        <div
          className={cn(
            "flex-1 relative transition-[margin] duration-200 ease-in-out",
            advisorOpen ? "mr-[400px]" : "mr-0"
          )}
        >
          {mapMissing ? (
            <div className="flex h-full items-center justify-center bg-paperCream">
              <div className="text-center">
                <p className="font-mono text-sm text-midGray">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not set.</p>
                <p className="font-mono text-xs text-midGray mt-1">Add it to .env.local to enable the map.</p>
              </div>
            </div>
          ) : (
            <div ref={mapNodeRef} className="h-full w-full" aria-label="Constituency map" />
          )}

          {/* Mode Toggle Overlay */}
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
            <div className="flex font-mono text-[10px] font-bold tracking-widest uppercase cursor-pointer border-2 border-inkNavy overflow-hidden shadow-sm">
              <button
                onClick={() => setBoothMode(false)}
                className={cn(
                  "px-4 py-2 transition-colors",
                  !boothMode ? "bg-inkNavy text-formWhite" : "bg-formWhite text-inkNavy hover:bg-paperCream"
                )}
              >
                DRAW BOUNDARY
              </button>
              <div className="w-0.5 bg-inkNavy" />
              <button
                onClick={() => setBoothMode(true)}
                disabled={booths.length >= 3}
                className={cn(
                  "px-4 py-2 transition-colors",
                  boothMode ? "bg-officialRed text-formWhite" : "bg-formWhite text-inkNavy hover:bg-paperCream",
                  booths.length >= 3 && "opacity-50 cursor-not-allowed"
                )}
              >
                PLACE BOOTH
              </button>
            </div>
            <span className="font-mono text-[10px] text-midGray bg-formWhite/80 px-1 w-fit">
              Left-click to add points · Right-click to remove last point
            </span>
          </div>

          {/* Boundary status pill */}
          <div className="absolute bottom-4 left-4 z-10 bg-formWhite border-2 border-inkNavy px-3 py-1.5">
            <span className="font-mono text-[10px] uppercase tracking-widest text-inkNavy">
              {boundary.length < 3
                ? "Draw polygon boundary to begin"
                : `Boundary set · ${boundary.length} vertices`}
            </span>
          </div>
        </div>

        {/* ── Gemini Advisor panel ──────────────────────────────────────────── */}
        {advisorOpen && (
          <div className="absolute bottom-0 right-0 top-0 w-[400px] z-50 border-l-2 border-inkNavy">
            <GeminiAdvisor
              onSend={handleAdvisorSend}
              messages={advisorMessages}
              loading={advisorLoading}
            />
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
