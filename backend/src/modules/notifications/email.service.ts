import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: {
        user: env.smtp.user,
        pass: env.smtp.pass,
      },
    });
  }
  return transporter;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const transport = getTransporter();
  await transport.sendMail({
    from: `"${env.smtp.fromName}" <${env.smtp.from}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}

export async function checkEmailHealth(): Promise<boolean> {
  try {
    if (!env.smtp.user || !env.smtp.pass) return false;
    const transport = getTransporter();
    await transport.verify();
    return true;
  } catch {
    return false;
  }
}

// ─── Email Templates ──────────────────────────────────────────────────────────

export function buildConfirmationEmail(data: {
  patientName: string;
  doctorName: string;
  slotStart: Date;
  appointmentId: string;
}): EmailPayload {
  const dateStr = data.slotStart.toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  return {
    to: '', // filled by caller
    subject: `Appointment Confirmed — ${dateStr}`,
    html: `
      <h2>Appointment Confirmed</h2>
      <p>Dear ${data.patientName},</p>
      <p>Your appointment with <strong>Dr. ${data.doctorName}</strong> is confirmed for <strong>${dateStr}</strong>.</p>
      <p>Appointment ID: <code>${data.appointmentId}</code></p>
      <p>Please arrive 10 minutes early. If you need to cancel or reschedule, log in to your patient portal.</p>
      <p>Best regards,<br/>Healthcare Clinic</p>
    `,
    text: `Appointment Confirmed with Dr. ${data.doctorName} on ${dateStr}. Appointment ID: ${data.appointmentId}`,
  };
}

export function buildCancellationEmail(data: {
  patientName: string;
  doctorName: string;
  slotStart: Date;
  reason?: string;
}): EmailPayload {
  const dateStr = data.slotStart.toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  const reasonText = data.reason === 'doctor_leave' ? 'the doctor is unavailable on this day' : 'it was cancelled';
  return {
    to: '',
    subject: `Appointment Cancelled — ${dateStr}`,
    html: `
      <h2>Appointment Cancelled</h2>
      <p>Dear ${data.patientName},</p>
      <p>Your appointment with <strong>Dr. ${data.doctorName}</strong> scheduled for <strong>${dateStr}</strong> has been cancelled because ${reasonText}.</p>
      <p>You can rebook a new appointment through your patient portal.</p>
      <p>Best regards,<br/>Healthcare Clinic</p>
    `,
    text: `Appointment with Dr. ${data.doctorName} on ${dateStr} has been cancelled.`,
  };
}

export function buildReminderEmail(data: {
  patientName: string;
  doctorName: string;
  slotStart: Date;
}): EmailPayload {
  const dateStr = data.slotStart.toLocaleString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
  return {
    to: '',
    subject: `Reminder: Appointment Tomorrow — ${dateStr}`,
    html: `
      <h2>Appointment Reminder</h2>
      <p>Dear ${data.patientName},</p>
      <p>This is a reminder that you have an appointment with <strong>Dr. ${data.doctorName}</strong> on <strong>${dateStr}</strong>.</p>
      <p>Best regards,<br/>Healthcare Clinic</p>
    `,
    text: `Reminder: Appointment with Dr. ${data.doctorName} on ${dateStr}.`,
  };
}

export function buildMedicationReminderEmail(data: {
  patientName: string;
  medicationName: string;
  frequency: string;
}): EmailPayload {
  return {
    to: '',
    subject: `Medication Reminder: ${data.medicationName}`,
    html: `
      <h2>Medication Reminder</h2>
      <p>Dear ${data.patientName},</p>
      <p>Time to take your medication: <strong>${data.medicationName}</strong></p>
      <p>Frequency: ${data.frequency}</p>
      <p>Please take as prescribed by your doctor.</p>
      <p>Best regards,<br/>Healthcare Clinic</p>
    `,
    text: `Time to take ${data.medicationName}. Frequency: ${data.frequency}.`,
  };
}

export function buildNoShowEmail(data: {
  name: string;
  doctorName: string;
  slotStart: Date;
  rebookUrl: string;
}): EmailPayload {
  return {
    to: '',
    subject: `We missed you — Rebook your appointment with Dr. ${data.doctorName}`,
    html: `
      <h2>We Missed You</h2>
      <p>Dear ${data.name},</p>
      <p>It looks like you missed your appointment with <strong>Dr. ${data.doctorName}</strong> on ${data.slotStart.toDateString()}.</p>
      <p>No worries — <a href="${data.rebookUrl}">click here to rebook</a>.</p>
      <p>Best regards,<br/>Healthcare Clinic</p>
    `,
    text: `Missed appointment with Dr. ${data.doctorName}. Rebook at: ${data.rebookUrl}`,
  };
}
