import * as satellite from "satellite.js";
import "dotenv/config";
import { getCachedTle, upsertTle } from "./db.js";

const CELESTRAK_BASE_URL = process.env.CELESTRAK_BASE_URL!;
const TTL = Number(process.env.TLE_CACHE_TTL_SECONDS ?? 3600);

async function fetchTleFromCelestrak(noradId: string): Promise<{ line1: string; line2: string }> {
  const url = `${CELESTRAK_BASE_URL}?CATNR=${noradId}&FORMAT=TLE`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Celestrak fetch failed: ${res.status}`);
  const text = await res.text();
  const lines = text.trim().split("\n").map((l) => l.trim());
  // lines[0] = name, lines[1] = line1, lines[2] = line2
  if (lines.length < 3) throw new Error(`Unexpected TLE format for NORAD ${noradId}`);
  return { line1: lines[1], line2: lines[2] };
}

export async function getTle(noradId: string) {
  const cached = await getCachedTle(noradId);
  if (cached) return { line1: cached.tle_line1, line2: cached.tle_line2 };

  const fresh = await fetchTleFromCelestrak(noradId);
  await upsertTle(noradId, fresh.line1, fresh.line2, TTL);
  return fresh;
}

/**
 * Minimum distance (km) between two satellites over the next `windowMinutes`,
 * sampled every `stepSeconds`. This is a first-pass proximity screen, not a
 * full conjunction-assessment covariance model — good enough for an MVP risk
 * score, flag for refinement before any real safety claim.
 */
export async function assessCollisionRisk(
  noradIdA: string,
  noradIdB: string,
  windowMinutes = 1440,
  stepSeconds = 60
) {
  const [tleA, tleB] = await Promise.all([getTle(noradIdA), getTle(noradIdB)]);
  const satA = satellite.twoline2satrec(tleA.line1, tleA.line2);
  const satB = satellite.twoline2satrec(tleB.line1, tleB.line2);

  let minDistanceKm = Infinity;
  let minAt: Date | null = null;
  const now = new Date();

  for (let t = 0; t <= windowMinutes * 60; t += stepSeconds) {
    const time = new Date(now.getTime() + t * 1000);
    const posA = satellite.propagate(satA, time);
    const posB = satellite.propagate(satB, time);
    if (!posA.position || !posB.position) continue;

    const dx = (posA.position as satellite.EciVec3<number>).x - (posB.position as satellite.EciVec3<number>).x;
    const dy = (posA.position as satellite.EciVec3<number>).y - (posB.position as satellite.EciVec3<number>).y;
    const dz = (posA.position as satellite.EciVec3<number>).z - (posB.position as satellite.EciVec3<number>).z;
    const distanceKm = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distanceKm < minDistanceKm) {
      minDistanceKm = distanceKm;
      minAt = time;
    }
  }

  const riskLevel = minDistanceKm < 1 ? "critical" : minDistanceKm < 5 ? "high" : minDistanceKm < 25 ? "moderate" : "low";

  return {
    noradIdA,
    noradIdB,
    minDistanceKm,
    closestApproach: minAt,
    riskLevel,
    windowMinutes,
  };
}
