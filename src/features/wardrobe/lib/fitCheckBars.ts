// src/features/wardrobe/lib/fitCheckBars.ts
//
// Pure, side-effect-free fit-check bar visualization helpers for Phase 16
// FitCheckCard. Imports ALTERABLE_SLACK_CM from fitScore.ts so the slack
// behavior (alterable adds 2cm of tolerance) stays in lockstep with the
// catalog's fitsMe filter and bestFit sort.
//
// NO React, NO Prisma, NO ctx, NO async. Pure functions only.

import { ALTERABLE_SLACK_CM } from "./fitScore";

export type FitBarState = "green" | "amber" | "red" | "unknown";

export interface FitBar {
  dimension: "chest" | "waist" | "hips";
  state: FitBarState;
  studentValue: number | null;
  dressMin: number | null;
  dressMax: number | null;
  /** 0..1 normalized position of the student marker along the dress range. Null when state === "unknown". */
  markerPositionPct: number | null;
}

export function computeFitBar(args: {
  dimension: "chest" | "waist" | "hips";
  studentValue: number | null | undefined;
  dressMin: number | null;
  dressMax: number | null;
  alterableSmaller: boolean;
  alterableLarger: boolean;
}): FitBar {
  const { dimension, studentValue, dressMin, dressMax, alterableSmaller, alterableLarger } = args;

  // Unknown state — caller hasn't set the measurement or dress lacks the field
  if (studentValue == null || dressMin == null || dressMax == null) {
    return {
      dimension,
      state: "unknown",
      studentValue: studentValue ?? null,
      dressMin,
      dressMax,
      markerPositionPct: null,
    };
  }

  const slackLo = alterableSmaller ? ALTERABLE_SLACK_CM : 0;
  const slackHi = alterableLarger ? ALTERABLE_SLACK_CM : 0;

  // Classify state (green first, demote on miss)
  let state: FitBarState = "green";
  if (studentValue < dressMin || studentValue > dressMax) {
    state = "amber";
  }
  if (studentValue < dressMin - slackLo || studentValue > dressMax + slackHi) {
    state = "red";
  }

  // Marker position normalized along the dress range. Fall-back || 1 avoids div-by-zero
  // when dressMin === dressMax (collapsed range listings).
  const range = dressMax - dressMin || 1;
  const markerPositionPct = Math.max(0, Math.min(1, (studentValue - dressMin) / range));

  return { dimension, state, studentValue, dressMin, dressMax, markerPositionPct };
}
