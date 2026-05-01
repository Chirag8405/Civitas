"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSimulationStore } from "@/store/simulation.store";
import { OfficialCard } from "@/components/ui/OfficialCard";
import { StampBadge } from "@/components/ui/StampBadge";
import { GeminiAdvisor } from "@/components/ui/GeminiAdvisor";
import type { GeminiMessage } from "@/components/ui/GeminiAdvisor";
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

  // ── Derived state ──────────────────────────────────────────────────────────
  const activeWarnings = warnings.filter((w) => !dismissedWarnings.has(w));
  const canValidate =
    boundary.length >= 3 &&
    booths.length >= 3 &&
    activeWarnings.length === 0;

  // ── Google Maps init ───────────────────────────────────────────────────────
  React.useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
    if (!apiKey) { setMapMissing(true); return; }

    let mounted = true;
    import("@googlemaps/js-api-loader").then(({ setOptions, importLibrary }) => {
      setOptions({ key: apiKey, v: "weekly" });
      Promise.all([
        importLibrary("maps"),
        importLibrary("drawing"),
      ]).then(([mapsLib]) => {
        if (!mounted || !mapNodeRef.current) return;
        const g = (window as any).google;

        const map = new g.maps.Map(mapNodeRef.current, {
          center: { lat: 20, lng: 78 },
          zoom: 12,
          styles: MONOCHROME_STYLES,
          disableDefaultUI: true,
          backgroundColor: "#F5F0E8",
        });
        mapRef.current = map;

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
          zoomDiv.appendChild(btn);
        });
        map.controls[g.maps.ControlPosition.RIGHT_BOTTOM].push(zoomDiv);

        // Drawing manager – polygon only
        const dm = new g.maps.drawing.DrawingManager({
          drawingControl: false,
          drawingMode: g.maps.drawing.OverlayType.POLYGON,
          polygonOptions: {
            fillColor: "#C0392B",
            fillOpacity: 0.08,
            strokeColor: "#C0392B",
            strokeWeight: 3,
            editable: true,
          },
        });
        dm.setMap(map);
        drawingRef.current = dm;

        g.maps.event.addListener(dm, "overlaycomplete", (ev: any) => {
          if (ev.type !== g.maps.drawing.OverlayType.POLYGON) return;
          if (boundaryPolygonRef.current) boundaryPolygonRef.current.setMap(null);
          boundaryPolygonRef.current = ev.overlay;
          dm.setDrawingMode(null);
          const path: LatLng[] = ev.overlay
            .getPath()
            .getArray()
            .map((pt: any) => ({ lat: pt.lat(), lng: pt.lng() }));
          setBoundary(path);
        });

        map.addListener("click", (ev: any) => {
          if (!ev.latLng) return;
          const loc: LatLng = { lat: ev.latLng.lat(), lng: ev.latLng.lng() };
          if (boothModeRef.current) handleBoothPlace(loc);
        });

        setMapReady(true);
      });
    });
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ref forwarding for boothMode (closure capture fix)
  const boothModeRef = React.useRef(boothMode);
  React.useEffect(() => { boothModeRef.current = boothMode; }, [boothMode]);

  // ── Place a booth ──────────────────────────────────────────────────────────
  const handleBoothPlace = React.useCallback(
    (loc: LatLng) => {
      if (booths.length >= 3) return;
      const g = (window as any).google;
      const id = `booth-${Date.now()}`;
      const newBooth: PollingBooth = { id, name: `Booth ${booths.length + 1}`, location: loc };

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
        // Extract any flags as sidebar warnings
        if (data.content?.toLowerCase().includes("wheelchair") || data.content?.toLowerCase().includes("accessible")) {
          setWarnings((prev) => [
            ...prev.filter((w) => !w.startsWith("ACCESSIBILITY:")),
            "ACCESSIBILITY: Review wheelchair booth requirements in the advisory panel.",
          ]);
        }
      })
      .catch(() => {})
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
    <div className="flex h-screen overflow-hidden bg-paperCream">
      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <aside
        className="flex w-60 shrink-0 flex-col overflow-y-auto border-r-2 border-inkNavy bg-paperCream"
        style={{ minWidth: 240 }}
      >
        {/* Header */}
        <div className="border-b-2 border-inkNavy bg-inkNavy px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-widest text-formWhite">
            ACT I — CONSTITUENCY SETUP
          </p>
        </div>

        <div className="flex flex-col gap-0 flex-1">
          {/* CONSTITUENCY */}
          <div className="border-b-2 border-inkNavy">
            <div className="bg-inkNavy px-4 py-1.5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-formWhite">Constituency</p>
            </div>
            <div className="p-3">
              <p className="font-serif text-sm font-bold text-inkNavy leading-tight">
                {constituency.name || "—"}
              </p>
              <p className="font-mono text-[10px] text-midGray mt-0.5 uppercase">
                {constituency.country || "Country not set"}
              </p>
              <p className="font-mono text-[10px] text-midGray mt-1">
                {constituency.electoralSystemInfo?.system ?? "—"}
              </p>
            </div>
          </div>

          {/* POLLING ZONES */}
          <div className="border-b-2 border-inkNavy">
            <div className="bg-inkNavy px-4 py-1.5">
              <p className="font-mono text-[10px] uppercase tracking-widest text-formWhite">Polling Zones</p>
            </div>
            <div className="flex flex-col gap-0">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="border-b border-ruleGray px-3 py-2 flex items-center gap-2"
                >
                  <span
                    className="w-3 h-3 shrink-0 border border-inkNavy"
                    style={{ background: ZONE_COLOURS[zone.color].hex }}
                  />
                  <input
                    type="text"
                    value={zone.name}
                    onChange={(e) =>
                      setZones((prev) =>
                        prev.map((z) =>
                          z.id === zone.id ? { ...z, name: e.target.value } : z
                        )
                      )
                    }
                    className="flex-1 bg-transparent font-mono text-xs text-inkNavy border-0 outline-none border-b border-transparent focus:border-inkNavy min-w-0"
                  />
                  <span className="font-mono text-[10px] text-midGray shrink-0">
                    {booths.filter((b) => b.zoneId === zone.id).length}v
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* BOOTH PLACEMENT */}
          <div className="border-b-2 border-inkNavy">
            <div className="bg-inkNavy px-4 py-1.5 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-formWhite">Booth Placement</p>
            </div>
            <div className="p-3 space-y-2">
              <p className="font-mono text-xs text-inkNavy font-bold">
                {booths.length} of 3 booths placed
              </p>

              <div className="flex items-center gap-2">
                <button
                  id="toggle-radius"
                  onClick={() => setShowRadius((v) => !v)}
                  className={cn(
                    "h-4 w-4 border-2 border-inkNavy flex items-center justify-center shrink-0",
                    showRadius ? "bg-inkNavy" : "bg-formWhite"
                  )}
                  aria-pressed={showRadius}
                >
                  {showRadius && (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <polyline points="1,4 3,6 7,2" stroke="#F5F0E8" strokeWidth="1.5" />
                    </svg>
                  )}
                </button>
                <span className="font-mono text-[10px] text-midGray">Show 1.2 km radius</span>
              </div>

              <button
                id="toggle-booth-mode"
                onClick={() => setBoothMode((v) => !v)}
                disabled={booths.length >= 3}
                className={cn(
                  "w-full border-2 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors",
                  booths.length >= 3
                    ? "border-ruleGray text-midGray cursor-not-allowed"
                    : boothMode
                    ? "border-officialRed bg-officialRed text-formWhite"
                    : "border-inkNavy text-inkNavy hover:bg-govGold"
                )}
              >
                {boothMode ? "Click map to place →" : "Activate booth mode"}
              </button>

              {booths.length > 0 && (
                <button
                  onClick={() => {
                    boothMarkersRef.current.forEach((m) => m.setMap(null));
                    boothCirclesRef.current.forEach((c) => c.setMap(null));
                    boothMarkersRef.current = [];
                    boothCirclesRef.current = [];
                    setBooths([]);
                    setBoothMode(false);
                  }}
                  className="w-full border border-ruleGray py-1 font-mono text-[10px] text-midGray hover:text-officialRed hover:border-officialRed transition-colors"
                >
                  Clear booths
                </button>
              )}
            </div>
          </div>

          {/* WARNINGS */}
          {activeWarnings.length > 0 && (
            <div className="border-b-2 border-officialRed">
              <div className="bg-officialRed px-4 py-1.5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-formWhite">
                  ⚠ Flags to Resolve
                </p>
              </div>
              <div className="flex flex-col">
                {activeWarnings.map((w) => (
                  <div
                    key={w}
                    className="border-b border-ruleGray px-3 py-2 flex items-start gap-2"
                  >
                    <p className="font-mono text-[10px] text-officialRed flex-1 leading-tight">{w}</p>
                    <button
                      onClick={() => setDismissedWarnings((s) => new Set([...s, w]))}
                      className="shrink-0 font-mono text-[10px] text-midGray border border-ruleGray px-1 hover:border-inkNavy"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VALIDATE */}
          <div className="p-3 border-b-2 border-inkNavy">
            <button
              id="validate-boundary"
              onClick={handleValidate}
              disabled={!canValidate || validating}
              className={cn(
                "w-full border-2 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors",
                canValidate && !validating
                  ? "border-inkNavy bg-inkNavy text-formWhite hover:bg-officialRed hover:border-officialRed"
                  : "border-ruleGray text-midGray cursor-not-allowed"
              )}
            >
              {validating ? "Validating…" : "Validate Boundary →"}
            </button>
            {!canValidate && (
              <p className="mt-1.5 font-mono text-[9px] text-midGray leading-tight">
                {boundary.length < 3 && "Draw boundary on map. "}
                {booths.length < 3 && "Place 3 booths. "}
                {activeWarnings.length > 0 && "Dismiss all flags."}
              </p>
            )}
          </div>

          {/* ADVISOR TOGGLE */}
          <div className="p-3 mt-auto">
            <button
              id="map-advisor-toggle"
              onClick={() => setAdvisorOpen((v) => !v)}
              className={cn(
                "w-full border-2 py-2 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors",
                advisorOpen
                  ? "bg-officialRed border-officialRed text-formWhite"
                  : "border-inkNavy text-inkNavy hover:bg-govGold"
              )}
            >
              {advisorOpen ? "Close Advisor" : "Chief Advisor"}
            </button>
          </div>
        </div>
      </aside>

      {/* ── Map area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
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

        {/* Booth mode overlay hint */}
        {boothMode && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-inkNavy text-formWhite font-mono text-xs px-4 py-2 border-2 border-officialRed pointer-events-none">
            BOOTH MODE — Click on the map to place Booth {booths.length + 1}
          </div>
        )}

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
        <div className="fixed bottom-0 right-0 top-0 w-[400px] z-50 border-l-2 border-inkNavy">
          <GeminiAdvisor
            onSend={handleAdvisorSend}
            messages={advisorMessages}
            loading={advisorLoading}
          />
        </div>
      )}
    </div>
  );
}
