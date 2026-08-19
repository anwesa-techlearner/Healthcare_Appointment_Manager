/**
 * SPEC §5.6 — Parse prescription frequency into MedicationReminder rows.
 * Converts prescriptions like "twice daily for 5 days" into discrete reminder timestamps.
 */

export interface ParsedReminder {
  medicationName: string;
  frequency: string;
  nextTriggerAt: Date;
}

interface PrescriptionItem {
  medication: string;
  dosage?: string;
  frequency: string;
  duration?: string;
}

export function parseMedicationReminders(
  prescriptionJson: any
): ParsedReminder[] {
  if (!prescriptionJson || !Array.isArray(prescriptionJson)) return [];

  const reminders: ParsedReminder[] = [];
  const now = new Date();

  for (const item of prescriptionJson as PrescriptionItem[]) {
    if (!item.medication || !item.frequency) continue;

    // Parse frequency to determine first trigger time
    // Patterns: "once daily", "twice daily", "every 8 hours", "three times daily"
    const freq = item.frequency.toLowerCase();
    const intervalHours = parseFrequencyToHours(freq);

    if (intervalHours > 0) {
      // Set first reminder at the next interval from now (min 1 hour ahead)
      const nextTrigger = new Date(now.getTime() + Math.max(intervalHours, 1) * 60 * 60 * 1000);

      reminders.push({
        medicationName: `${item.medication}${item.dosage ? ` ${item.dosage}` : ''}`,
        frequency: item.frequency,
        nextTriggerAt: nextTrigger,
      });
    }
  }

  return reminders;
}

function parseFrequencyToHours(frequency: string): number {
  if (frequency.includes('once daily') || frequency.includes('every 24')) return 24;
  if (frequency.includes('twice daily') || frequency.includes('two times') || frequency.includes('bid')) return 12;
  if (frequency.includes('three times') || frequency.includes('tid') || frequency.includes('thrice')) return 8;
  if (frequency.includes('four times') || frequency.includes('qid')) return 6;
  if (frequency.includes('every 8 hour')) return 8;
  if (frequency.includes('every 6 hour')) return 6;
  if (frequency.includes('every 12 hour')) return 12;
  if (frequency.includes('every 4 hour')) return 4;
  // Default to once daily if can't parse
  return 24;
}
