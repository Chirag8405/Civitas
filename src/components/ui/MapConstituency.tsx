"use client";

import * as React from "react";
import { Loader } from "@googlemaps/js-api-loader";

import type { LatLng, PollingBooth, Zone } from "@/types";

declare const google: any;

export interface MapConstituencyProps {
  onBoundaryChange?: (path: LatLng[]) => void;
  onBoothPlace?: (location: LatLng) => void;
  booths: PollingBooth[];
  zones: Zone[];
}

const monochromeStyles = [
  {
    elementType: "geometry",
    stylers: [{ color: "#F5F0E8" }, { saturation: -80 }, { lightness: 20 }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#666666" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#F5F0E8" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#D0CCC2" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#E9E2D7" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
];

const ballotBoxSvg =
  "data:image/svg+xml;charset=UTF-8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'>" +
      "<rect x='6' y='10' width='24' height='18' fill='#F5F0E8' stroke='#1A1A2E' stroke-width='2'/>" +
      "<rect x='10' y='6' width='16' height='6' fill='#F5F0E8' stroke='#1A1A2E' stroke-width='2'/>" +
      "<rect x='12' y='18' width='12' height='6' fill='#C0392B'/>" +
      "</svg>"
  );

const getCenter = (path: LatLng[]) => {
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  path.forEach((point) => {
    north = Math.max(north, point.lat);
    south = Math.min(south, point.lat);
    east = Math.max(east, point.lng);
    west = Math.min(west, point.lng);
  });

  return {
    lat: (north + south) / 2,
    lng: (east + west) / 2,
  };
};

export function MapConstituency({
  onBoundaryChange,
  onBoothPlace,
  booths,
  zones,
}: MapConstituencyProps) {
  const mapNode = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const drawingRef = React.useRef<any>(null);
  const boundaryRef = React.useRef<any>(null);
  const boothMarkersRef = React.useRef<any[]>([]);
  const zoneOverlaysRef = React.useRef<Array<{ polygon: any; label: any }>>([]);
  const [isReady, setIsReady] = React.useState(false);
  const [missingKey, setMissingKey] = React.useState(false);

  React.useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
    if (!apiKey) {
      setMissingKey(true);
      return;
    }

    let isMounted = true;
    import("@googlemaps/js-api-loader").then(({ setOptions, importLibrary }) => {
      setOptions({ key: apiKey, v: "weekly" });
      Promise.all([
        importLibrary("maps"),
        importLibrary("drawing"),
      ]).then(() => {
        if (!isMounted || !mapNode.current) return;

        const g = (window as any).google;
        const map = new g.maps.Map(mapNode.current, {
        center: { lat: 20, lng: 0 },
        zoom: 3,
        styles: monochromeStyles,
        disableDefaultUI: true,
        zoomControl: false,
        backgroundColor: "#F5F0E8",
      });

      mapRef.current = map;

      const controls = document.createElement("div");
      controls.className = "flex flex-col gap-2 p-2";

      const zoomIn = document.createElement("button");
      zoomIn.type = "button";
      zoomIn.className =
        "h-9 w-9 rounded-none border-2 border-inkNavy bg-formWhite text-inkNavy";
      zoomIn.textContent = "+";
      zoomIn.addEventListener("click", () => {
        const currentZoom = map.getZoom() ?? 3;
        map.setZoom(currentZoom + 1);
      });

      const zoomOut = document.createElement("button");
      zoomOut.type = "button";
      zoomOut.className =
        "h-9 w-9 rounded-none border-2 border-inkNavy bg-formWhite text-inkNavy";
      zoomOut.textContent = "-";
      zoomOut.addEventListener("click", () => {
        const currentZoom = map.getZoom() ?? 3;
        map.setZoom(currentZoom - 1);
      });

      controls.appendChild(zoomIn);
      controls.appendChild(zoomOut);
      map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(controls);

      const drawingManager = new google.maps.drawing.DrawingManager({
        drawingControl: false,
        drawingMode: google.maps.drawing.OverlayType.POLYGON,
        polygonOptions: {
          fillColor: "#C0392B",
          fillOpacity: 0.08,
          strokeColor: "#C0392B",
          strokeWeight: 3,
        },
      });

      drawingManager.setMap(map);
      drawingRef.current = drawingManager;

      google.maps.event.addListener(
        drawingManager,
        "overlaycomplete",
        (event: any) => {
          if (event.type !== google.maps.drawing.OverlayType.POLYGON) return;

          if (boundaryRef.current) {
            boundaryRef.current.setMap(null);
          }

          const polygon = event.overlay;
          boundaryRef.current = polygon;
          drawingManager.setDrawingMode(null);

          const path = polygon
            .getPath()
            .getArray()
            .map((point: any) => ({ lat: point.lat(), lng: point.lng() }));

          onBoundaryChange?.(path);
        }
      );

      map.addListener("click", (event: any) => {
        if (!event.latLng) return;
        onBoothPlace?.({ lat: event.latLng.lat(), lng: event.latLng.lng() });
      });

      setIsReady(true);
      });
    });

    return () => {
      isMounted = false;
    };
  }, [onBoundaryChange, onBoothPlace]);

  React.useEffect(() => {
    if (!isReady || !mapRef.current) return;
    if (booths.length > 0) {
      mapRef.current.setCenter(booths[0].location);
      mapRef.current.setZoom(13);
    }
    boothMarkersRef.current.forEach((marker) => marker.setMap(null));
    boothMarkersRef.current = booths.map((booth) =>
      new google.maps.Marker({
        position: booth.location,
        map: mapRef.current ?? undefined,
        icon: {
          url: ballotBoxSvg,
          scaledSize: new google.maps.Size(36, 36),
        },
      })
    );
  }, [booths, isReady]);

  React.useEffect(() => {
    if (!isReady || !mapRef.current) return;
    zoneOverlaysRef.current.forEach((overlay) => {
      overlay.polygon.setMap(null);
      overlay.label.setMap(null);
    });
    zoneOverlaysRef.current = zones
      .filter((zone) => zone.boundary && zone.boundary.length)
      .map((zone) => {
        const path = zone.boundary ?? [];
        const polygon = new google.maps.Polygon({
          paths: path,
          fillColor: "#F5F0E8",
          fillOpacity: 0.35,
          strokeColor: "#1A1A2E",
          strokeOpacity: 0.7,
          strokeWeight: 1,
          map: mapRef.current ?? undefined,
        });
        const label = new google.maps.Marker({
          position: getCenter(path),
          map: mapRef.current ?? undefined,
          icon: {
            path: "M0 0h1v1H0z",
            fillOpacity: 0,
            strokeOpacity: 0,
          },
          label: {
            text: zone.name,
            color: "#1A1A2E",
            fontWeight: "700",
            fontSize: "12px",
          },
        });
        return { polygon, label };
      });
  }, [isReady, zones]);

  if (missingKey) {
    return (
      <div className="flex h-[520px] w-full items-center justify-center border-2 border-inkNavy bg-paperCream text-sm font-mono text-midGray">
        Google Maps API key missing.
      </div>
    );
  }

  return (
    <div
      ref={mapNode}
      className="h-[520px] w-full border-2 border-inkNavy bg-paperCream"
      aria-label="Interactive constituency map"
    />
  );
}
