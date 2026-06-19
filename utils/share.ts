/**
 * Share Utilities
 * Handles generating share text and managing the share flow.
 */

import * as Sharing from 'expo-sharing';
import type { AnalysisResult } from '@/constants/types';

/**
 * Generate share text for social media
 * Designed to be catchy and include the app name for organic growth.
 */
export function generateShareText(result: AnalysisResult): string {
  const scoreEmoji = getScoreEmoji(result.overallScore);

  return `${scoreEmoji} My ${result.exerciseName} form: ${result.overallScore.toFixed(1)}/10

${result.metrics.map((m) => `${getMetricEmoji(m.score)} ${m.name}: ${m.score.toFixed(1)}`).join('\n')}

Think you can beat my score? 💪
Analyzed by Kritiq — AI rates your form`;
}

function getScoreEmoji(score: number): string {
  if (score >= 9) return '🏆';
  if (score >= 7) return '🔥';
  if (score >= 5) return '💪';
  return '📈';
}

function getMetricEmoji(score: number): string {
  if (score >= 9) return '✅';
  if (score >= 7) return '🟢';
  if (score >= 5) return '🟡';
  return '🔴';
}

/**
 * Share the score card image with optional text
 */
export async function shareScoreCard(
  imageUri: string,
  result: AnalysisResult
): Promise<boolean> {
  try {
    const available = await Sharing.isAvailableAsync();
    if (!available) return false;

    await Sharing.shareAsync(imageUri, {
      mimeType: 'image/png',
      dialogTitle: `My ${result.exerciseName} form: ${result.overallScore}/10 — Kritiq`,
      UTI: 'public.png',
    });

    return true;
  } catch {
    return false;
  }
}
