/**
 * map-utils.ts
 * Client-side Turf.js helper utilities for the /map prototype.
 *
 * NOTE: All functions here run in the browser.  Do NOT import server-only
 * modules (e.g. fs, path) in this file.
 */

import * as turf from "@turf/turf";
import type { Feature, Geometry, GeoJsonProperties } from "geojson";

// ---------------------------------------------------------------------------
// Soil-type risk weight table (0-1 scale).
// Higher weight = more susceptible to movement / bearing failure.
// Replace with domain-specific values when real data is available.
// ---------------------------------------------------------------------------
const SOIL_TYPE_WEIGHTS: Record<string, number> = {
  silt: 1.0, // most susceptible
  clay: 0.8,
  sand: 0.5,
  loam: 0.2, // most stable in typical conditions
};

const DEFAULT_SOIL_WEIGHT = 0.5;

// ---------------------------------------------------------------------------
// computeRiskScore
//
// Synthetic risk score (0-100) based on:
//   - slope_pct  (0-100 clamped, weight 0.6)
//   - soil_type  weight (weight 0.4)
//
// If slope_pct is null the slope component defaults to 0.
// ---------------------------------------------------------------------------
export function computeRiskScore(properties: GeoJsonProperties): number {
  if (!properties) return 0;

  const slopePct: number | null =
    typeof properties.slope_pct === "number" ? properties.slope_pct : null;
  const soilType: string =
    typeof properties.soil_type === "string"
      ? properties.soil_type.toLowerCase()
      : "";

  // Normalise slope to 0-1 (cap at 45 % for normalisation purposes)
  const maxSlope = 45;
  const normSlope = slopePct !== null ? Math.min(slopePct, maxSlope) / maxSlope : 0;

  const soilWeight =
    SOIL_TYPE_WEIGHTS[soilType] ?? DEFAULT_SOIL_WEIGHT;

  const raw = 0.6 * normSlope + 0.4 * soilWeight;
  return Math.round(raw * 100);
}

// ---------------------------------------------------------------------------
// riskColor
// Returns a hex colour for choropleth styling based on a 0-100 risk score.
// ---------------------------------------------------------------------------
export function riskColor(score: number): string {
  if (score >= 80) return "#d73027"; // critical – red
  if (score >= 60) return "#f46d43"; // high – orange-red
  if (score >= 40) return "#fdae61"; // medium – orange
  if (score >= 20) return "#a6d96a"; // low – light green
  return "#1a9641"; // very low – green
}

// ---------------------------------------------------------------------------
// riskLabel – human-readable label for the risk tier.
// ---------------------------------------------------------------------------
export function riskLabel(score: number): string {
  if (score >= 80) return "Critical";
  if (score >= 60) return "High";
  if (score >= 40) return "Medium";
  if (score >= 20) return "Low";
  return "Very Low";
}

// ---------------------------------------------------------------------------
// computeCentroid – wraps turf.centroid for a Feature with any geometry.
// Returns [lng, lat].
// ---------------------------------------------------------------------------
export function computeCentroid(
  feature: Feature<Geometry, GeoJsonProperties>
): [number, number] {
  const c = turf.centroid(feature as Parameters<typeof turf.centroid>[0]);
  const [lng, lat] = c.geometry.coordinates;
  return [lng, lat];
}

// ---------------------------------------------------------------------------
// computeAreaHa – returns the area of a polygon feature in hectares.
// Returns null for Point/LineString features.
// ---------------------------------------------------------------------------
export function computeAreaHa(
  feature: Feature<Geometry, GeoJsonProperties>
): number | null {
  if (
    feature.geometry.type !== "Polygon" &&
    feature.geometry.type !== "MultiPolygon"
  ) {
    return null;
  }
  const areaSqM = turf.area(feature as Parameters<typeof turf.area>[0]);
  return Math.round((areaSqM / 10000) * 100) / 100;
}

// ---------------------------------------------------------------------------
// enrichFeatures
// Iterates over a FeatureCollection, computes risk_score from properties,
// and returns a new FeatureCollection with updated risk_score values.
// ---------------------------------------------------------------------------
export function enrichFeatures(
  collection: GeoJSON.FeatureCollection
): GeoJSON.FeatureCollection {
  return {
    ...collection,
    features: collection.features.map((f) => ({
      ...f,
      properties: {
        ...f.properties,
        risk_score: computeRiskScore(f.properties),
        _area_ha: computeAreaHa(f as Feature<Geometry, GeoJsonProperties>),
      },
    })),
  };
}
