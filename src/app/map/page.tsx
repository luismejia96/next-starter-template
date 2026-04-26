"use client";

/**
 * /map – Private interactive soil/landscape map prototype.
 *
 * ACCESS CONTROL
 * ──────────────
 * On mount this page calls /api/map-auth.  Access is granted only when
 * MAP_VIEW_SECRET is set in the deployment environment AND the request carries
 * either the X-MAP-SECRET header or the map_secret cookie.
 *
 * For local testing add to .env.local:
 *   MAP_VIEW_SECRET=some-strong-random-value
 * Then open the page with:
 *   curl -H "X-MAP-SECRET: some-strong-random-value" http://localhost:3000/map
 *   # or set the cookie in your browser via DevTools.
 *
 * LIBRARIES
 * ─────────
 * • Leaflet  – client-side OSM tile rendering
 * • Turf.js  – spatial helpers (risk score, centroid, area)
 *
 * DATA
 * ────
 * public/data/soil-samples.geojson – synthetic sample dataset.
 * Replace with real data (served from R2/S3) before production use.
 * Do NOT commit real sensitive geodata to the repository.
 */

import { useEffect, useRef, useState } from "react";
import "./map.css";

// Turf helpers are imported dynamically together with Leaflet so they are
// only ever loaded in the browser (both are purely client-side).
import type * as L from "leaflet";
import type { FeatureCollection, Feature } from "geojson";
import { computeRiskScore, riskColor, riskLabel, enrichFeatures } from "@/lib/map-utils";

// ── Types ──────────────────────────────────────────────────────────────────

type AuthState = "pending" | "ok" | "unauthorized" | "misconfigured";

interface InspectedFeature {
  id: string;
  soil_type: string;
  slope_pct: number | null;
  slope_source: string;
  risk_score: number;
  recommended_action: string;
  last_survey_date: string;
  source: string;
  _area_ha: number | null;
  _geojson: Feature;
}

// ── Legend data ────────────────────────────────────────────────────────────

const LEGEND_TIERS = [
  { label: "Critical (80-100)", color: "#d73027" },
  { label: "High (60-79)", color: "#f46d43" },
  { label: "Medium (40-59)", color: "#fdae61" },
  { label: "Low (20-39)", color: "#a6d96a" },
  { label: "Very Low (0-19)", color: "#1a9641" },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function MapPage() {
  const mapRef = useRef<L.Map | null>(null);
  const leafletRef = useRef<typeof L | null>(null);
  const soilLayerRef = useRef<L.GeoJSON | null>(null);

  const [authState, setAuthState] = useState<AuthState>("pending");
  const [showSoilLayer, setShowSoilLayer] = useState(true);
  const [inspected, setInspected] = useState<InspectedFeature | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // ── Auth check ───────────────────────────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/map-auth", {
          headers: { "X-MAP-SECRET": document.cookie
            .split("; ")
            .find(r => r.startsWith("map_secret="))
            ?.split("=")[1] ?? "" },
        });
        if (res.status === 200) {
          setAuthState("ok");
        } else if (res.status === 500) {
          setAuthState("misconfigured");
        } else {
          setAuthState("unauthorized");
        }
      } catch {
        setAuthState("unauthorized");
      }
    }
    checkAuth();
  }, []);

  // ── Leaflet init (runs only when auth passes) ────────────────────────────
  useEffect(() => {
    if (authState !== "ok") return;
    if (mapRef.current) return; // already initialised

    let map: L.Map;

    async function initMap() {
      const L = (await import("leaflet")).default;
      leafletRef.current = L;

      // Fix Leaflet's default icon image paths when bundled with webpack.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      map = L.map("map", { zoomControl: true }).setView([37.765, -122.42], 13);
      mapRef.current = map;

      // OSM tiles – free, no API key required.
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Load and display GeoJSON.
      const res = await fetch("/data/soil-samples.geojson");
      const raw: FeatureCollection = await res.json();
      const enriched = enrichFeatures(raw);

      const soilLayer = L.geoJSON(enriched as GeoJSON.GeoJsonObject, {
        style: (feature) => {
          const score: number =
            feature?.properties?.risk_score ?? computeRiskScore(feature?.properties ?? null);
          return {
            color: "#374151",
            weight: 1.5,
            fillColor: riskColor(score),
            fillOpacity: 0.65,
          };
        },
        pointToLayer: (feature, latlng) => {
          const score: number =
            feature?.properties?.risk_score ?? computeRiskScore(feature?.properties ?? null);
          return L.circleMarker(latlng, {
            radius: 10,
            fillColor: riskColor(score),
            color: "#374151",
            weight: 1.5,
            fillOpacity: 0.85,
          });
        },
        onEachFeature: (feature, layer) => {
          layer.on("click", () => {
            const p = feature.properties as Record<string, unknown>;
            setInspected({
              id: String(p.id ?? ""),
              soil_type: String(p.soil_type ?? ""),
              slope_pct: typeof p.slope_pct === "number" ? p.slope_pct : null,
              slope_source: String(p.slope_source ?? ""),
              risk_score: typeof p.risk_score === "number" ? p.risk_score : 0,
              recommended_action: String(p.recommended_action ?? ""),
              last_survey_date: String(p.last_survey_date ?? ""),
              source: String(p.source ?? ""),
              _area_ha: typeof p._area_ha === "number" ? p._area_ha : null,
              _geojson: feature,
            });
          });
        },
      }).addTo(map);

      soilLayerRef.current = soilLayer;
      map.fitBounds(soilLayer.getBounds(), { padding: [40, 40] });
      setMapReady(true);
    }

    initMap();

    return () => {
      if (map) {
        map.remove();
        mapRef.current = null;
      }
    };
  }, [authState]);

  // ── Layer toggle ─────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const layer = soilLayerRef.current;
    const L = leafletRef.current;
    if (!map || !layer || !L) return;

    if (showSoilLayer) {
      if (!map.hasLayer(layer)) layer.addTo(map);
    } else {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    }
  }, [showSoilLayer, mapReady]);

  // ── Export helper ────────────────────────────────────────────────────────
  function downloadFeature(feature: Feature) {
    const blob = new Blob([JSON.stringify(feature, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feature-${feature?.properties?.id ?? "export"}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (authState === "pending") {
    return (
      <div className="map-auth-error">
        <h2>Checking access…</h2>
      </div>
    );
  }

  if (authState === "misconfigured") {
    return (
      <div className="map-auth-error">
        <h2>🔧 Server configuration required</h2>
        <p>
          <code>MAP_VIEW_SECRET</code> is not set in the deployment environment.
        </p>
        <p>
          Add it to <code>.env.local</code> (local) or as a deployment secret
          (Cloudflare / Vercel) and restart the server. See README for details.
        </p>
      </div>
    );
  }

  if (authState === "unauthorized") {
    return (
      <div className="map-auth-error">
        <h2>🔒 Unauthorized</h2>
        <p>
          Access to this page requires the <code>X-MAP-SECRET</code> header or
          the <code>map_secret</code> cookie to be set to the value of{" "}
          <code>MAP_VIEW_SECRET</code> on the server.
        </p>
        <p>
          See README → &quot;Map prototype (private)&quot; for setup instructions.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Top bar */}
      <div className="map-topbar">
        <h1>🗺️ Soil &amp; Landscape Risk Map</h1>
        <button
          className={showSoilLayer ? "active" : ""}
          onClick={() => setShowSoilLayer((v) => !v)}
        >
          {showSoilLayer ? "Hide" : "Show"} Soil Layer
        </button>
      </div>

      {/* Map container */}
      <div className="map-wrapper">
        <div id="map" />

        {/* Legend */}
        {mapReady && (
          <div className="map-legend">
            <h4>Risk Score</h4>
            {LEGEND_TIERS.map((tier) => (
              <div className="map-legend-row" key={tier.label}>
                <span
                  className="map-legend-swatch"
                  style={{ background: tier.color }}
                />
                <span>{tier.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Inspector panel */}
        {inspected && (
          <div className="map-inspector">
            <h3>
              Feature: {inspected.id}
              <button
                className="inspector-close"
                onClick={() => setInspected(null)}
                aria-label="Close inspector"
              >
                ×
              </button>
            </h3>
            <table>
              <tbody>
                <tr>
                  <td>Soil type</td>
                  <td>{inspected.soil_type}</td>
                </tr>
                <tr>
                  <td>Slope</td>
                  <td>
                    {inspected.slope_pct !== null
                      ? `${inspected.slope_pct}% (${inspected.slope_source})`
                      : `Unknown (${inspected.slope_source})`}
                  </td>
                </tr>
                <tr>
                  <td>Risk score</td>
                  <td>
                    <span
                      className="risk-badge"
                      style={{ background: riskColor(inspected.risk_score) }}
                    >
                      {inspected.risk_score} – {riskLabel(inspected.risk_score)}
                    </span>
                  </td>
                </tr>
                {inspected._area_ha !== null && (
                  <tr>
                    <td>Area</td>
                    <td>{inspected._area_ha} ha</td>
                  </tr>
                )}
                <tr>
                  <td>Action</td>
                  <td>{inspected.recommended_action}</td>
                </tr>
                <tr>
                  <td>Last survey</td>
                  <td>{inspected.last_survey_date}</td>
                </tr>
                <tr>
                  <td>Source</td>
                  <td>{inspected.source}</td>
                </tr>
              </tbody>
            </table>
            <button
              className="inspector-export-btn"
              onClick={() => downloadFeature(inspected._geojson)}
            >
              ⬇ Download feature GeoJSON
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
