/**
 * SPEC §8.9 — Seed script with realistic demo data.
 * Creates: 1 admin, 5 doctors (different specializations), 10 patients,
 * pre-filled availability, leave days, and sample appointments.
 *
 * Run: npm run seed
 * Default password for all demo accounts: Demo@1234
 */

import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo@1234';
const SALT_ROUNDS = 12;

async function hash(pw: string): Promise<string> {
  return bcrypt.hash(pw, SALT_ROUNDS);
}

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Clean existing demo data ──────────────────────────────────────────────
  await prisma.notificationLog.deleteMany();
  await prisma.medicationReminder.deleteMany();
  await prisma.visitNote.deleteMany();
  await prisma.symptom.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.noShowFollowUp.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorLeave.deleteMany();
  await prisma.doctorAvailability.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // ─── Admin ────────────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: 'admin@clinic.com',
      passwordHash: await hash(DEMO_PASSWORD),
      role: Role.admin,
      name: 'System Administrator',
      phone: '+1-555-000-0001',
    },
  });
  console.log(`✅ Admin: ${admin.email}`);

  // ─── Doctors ──────────────────────────────────────────────────────────────
  const doctorData = [
    {
      email: 'dr.sarah.chen@clinic.com',
      name: 'Dr. Sarah Chen',
      phone: '+1-555-100-0001',
      specialization: 'Cardiology',
      bio: 'Board-certified cardiologist with 15 years of experience in interventional cardiology.',
      slotDurationMinutes: 30,
      timezone: 'America/New_York',
    },
    {
      email: 'dr.james.okafor@clinic.com',
      name: 'Dr. James Okafor',
      phone: '+1-555-100-0002',
      specialization: 'General Practice',
      bio: 'Family medicine physician focused on preventive care and chronic disease management.',
      slotDurationMinutes: 20,
      timezone: 'America/New_York',
    },
    {
      email: 'dr.priya.sharma@clinic.com',
      name: 'Dr. Priya Sharma',
      phone: '+1-555-100-0003',
      specialization: 'Neurology',
      bio: 'Neurologist specializing in migraines, epilepsy, and neurodegenerative disorders.',
      slotDurationMinutes: 45,
      timezone: 'America/Chicago',
    },
    {
      email: 'dr.michael.torres@clinic.com',
      name: 'Dr. Michael Torres',
      phone: '+1-555-100-0004',
      specialization: 'Orthopedics',
      bio: 'Orthopedic surgeon specializing in sports injuries and joint replacement.',
      slotDurationMinutes: 30,
      timezone: 'America/Los_Angeles',
    },
    {
      email: 'dr.emily.watson@clinic.com',
      name: 'Dr. Emily Watson',
      phone: '+1-555-100-0005',
      specialization: 'Pediatrics',
      bio: 'Pediatrician with expertise in childhood development and adolescent health.',
      slotDurationMinutes: 25,
      timezone: 'America/New_York',
    },
  ];

  const doctors = [];
  for (const d of doctorData) {
    const user = await prisma.user.create({
      data: {
        email: d.email,
        passwordHash: await hash(DEMO_PASSWORD),
        role: Role.doctor,
        name: d.name,
        phone: d.phone,
        doctorProfile: {
          create: {
            specialization: d.specialization,
            bio: d.bio,
            slotDurationMinutes: d.slotDurationMinutes,
            timezone: d.timezone,
          },
        },
      },
      include: { doctorProfile: true },
    });
    doctors.push(user);
    console.log(`✅ Doctor: ${user.email} (${d.specialization})`);
  }

  // ─── Doctor Availability ──────────────────────────────────────────────────
  // Mon-Fri 9am-5pm for all doctors
  for (const doctor of doctors) {
    const profileId = doctor.doctorProfile!.id;
    for (let day = 1; day <= 5; day++) {
      await prisma.doctorAvailability.create({
        data: {
          doctorId: profileId,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
        },
      });
    }
  }
  console.log('✅ Doctor availability set (Mon-Fri 9am-5pm for all doctors)');

  // ─── Doctor Leaves ────────────────────────────────────────────────────────
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(15);

  await prisma.doctorLeave.create({
    data: {
      doctorId: doctors[0].doctorProfile!.id,
      date: nextMonth,
      reason: 'Medical conference',
    },
  });
  console.log(`✅ Leave added for Dr. Sarah Chen on ${nextMonth.toDateString()}`);

  // ─── Patients ─────────────────────────────────────────────────────────────
  const patientData = [
    { email: 'alice.johnson@email.com', name: 'Alice Johnson', phone: '+1-555-200-0001' },
    { email: 'bob.smith@email.com', name: 'Bob Smith', phone: '+1-555-200-0002' },
    { email: 'carol.white@email.com', name: 'Carol White', phone: '+1-555-200-0003' },
    { email: 'david.brown@email.com', name: 'David Brown', phone: '+1-555-200-0004' },
    { email: 'eva.garcia@email.com', name: 'Eva Garcia', phone: '+1-555-200-0005' },
    { email: 'frank.miller@email.com', name: 'Frank Miller', phone: '+1-555-200-0006' },
    { email: 'grace.lee@email.com', name: 'Grace Lee', phone: '+1-555-200-0007' },
    { email: 'henry.wilson@email.com', name: 'Henry Wilson', phone: '+1-555-200-0008' },
    { email: 'iris.martinez@email.com', name: 'Iris Martinez', phone: '+1-555-200-0009' },
    { email: 'jack.taylor@email.com', name: 'Jack Taylor', phone: '+1-555-200-0010' },
  ];

  const patients = [];
  for (const p of patientData) {
    const user = await prisma.user.create({
      data: {
        email: p.email,
        passwordHash: await hash(DEMO_PASSWORD),
        role: Role.patient,
        name: p.name,
        phone: p.phone,
      },
    });
    patients.push(user);
  }
  console.log(`✅ ${patients.length} patient accounts created`);

  // ─── Sample Appointments ──────────────────────────────────────────────────
  // Create confirmed appointments over the next 2 weeks
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setUTCHours(9, 0, 0, 0);

  const appointmentSlots = [
    { patientIdx: 0, doctorIdx: 0, daysAhead: 1, hourOffset: 0 },
    { patientIdx: 1, doctorIdx: 0, daysAhead: 1, hourOffset: 1 },
    { patientIdx: 2, doctorIdx: 1, daysAhead: 2, hourOffset: 0 },
    { patientIdx: 3, doctorIdx: 2, daysAhead: 3, hourOffset: 2 },
    { patientIdx: 4, doctorIdx: 3, daysAhead: 5, hourOffset: 1 },
    { patientIdx: 5, doctorIdx: 4, daysAhead: 7, hourOffset: 3 },
    { patientIdx: 6, doctorIdx: 1, daysAhead: 10, hourOffset: 0 },
  ];

  for (const slot of appointmentSlots) {
    const start = new Date();
    start.setDate(start.getDate() + slot.daysAhead);
    // Skip weekends
    if (start.getDay() === 0) start.setDate(start.getDate() + 1);
    if (start.getDay() === 6) start.setDate(start.getDate() + 2);
    start.setUTCHours(9 + slot.hourOffset, 0, 0, 0);

    const doctor = doctors[slot.doctorIdx];
    const slotDuration = doctor.doctorProfile!.slotDurationMinutes;
    const end = new Date(start.getTime() + slotDuration * 60 * 1000);

    try {
      await prisma.appointment.create({
        data: {
          patientId: patients[slot.patientIdx].id,
          doctorId: doctor.doctorProfile!.id,
          slotStart: start,
          slotEnd: end,
          status: 'confirmed',
        },
      });
    } catch (err: any) {
      // Skip if slot conflict (e.g. running seed multiple times)
      if (err?.code !== 'P2002') throw err;
    }
  }
  console.log('✅ Sample confirmed appointments created');

  // ─── One Completed Appointment with Notes ─────────────────────────────────
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 3);
  pastDate.setUTCHours(10, 0, 0, 0);

  const completedAppt = await prisma.appointment.create({
    data: {
      patientId: patients[0].id,
      doctorId: doctors[1].doctorProfile!.id,
      slotStart: pastDate,
      slotEnd: new Date(pastDate.getTime() + 20 * 60 * 1000),
      status: 'completed',
    },
  });

  await prisma.symptom.create({
    data: {
      appointmentId: completedAppt.id,
      rawText: 'Persistent headache for 3 days, mild fever, fatigue',
      aiSummaryJson: {
        urgency_level: 'Medium',
        chief_complaint: 'Persistent headache with fever',
        suggested_questions: [
          'How would you rate your headache on a scale of 1-10?',
          'Have you taken any over-the-counter medications?',
          'Do you have any associated symptoms like stiff neck or light sensitivity?',
        ],
      },
      urgencyLevel: 'Medium',
      aiGenerated: true,
    },
  });

  const visitNote = await prisma.visitNote.create({
    data: {
      appointmentId: completedAppt.id,
      doctorNotes: 'Patient presents with tension headache and mild viral illness. No signs of meningitis. BP 120/80. Temp 37.8°C.',
      prescriptionJson: [
        { medication: 'Ibuprofen', dosage: '400mg', frequency: 'three times daily', duration: '5 days' },
        { medication: 'Paracetamol', dosage: '500mg', frequency: 'twice daily', duration: '3 days' },
      ],
      aiPatientSummary: JSON.stringify({
        summary: "You have a tension headache with a mild viral infection. Your blood pressure is normal and there are no concerning signs. Rest and the prescribed medications should help you feel better within a few days.",
        medication_schedule: [
          { medication: 'Ibuprofen 400mg', dosage: '400mg', frequency: 'Three times daily', duration: '5 days' },
          { medication: 'Paracetamol 500mg', dosage: '500mg', frequency: 'Twice daily', duration: '3 days' },
        ],
        follow_up_steps: ['Rest and stay hydrated', 'Return if symptoms worsen or fever exceeds 39°C'],
      }),
      aiGenerated: true,
    },
  });

  // Create medication reminders
  const in6h = new Date(Date.now() + 6 * 60 * 60 * 1000);
  await prisma.medicationReminder.createMany({
    data: [
      { visitNoteId: visitNote.id, medicationName: 'Ibuprofen 400mg', frequency: 'three times daily', nextTriggerAt: in6h },
    ],
  });

  console.log('✅ Completed appointment with symptoms, visit note, and medication reminders created');

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log('\n📊 Seed Summary:');
  console.log(`  Admin: admin@clinic.com`);
  console.log(`  Doctors: ${doctors.length} (dr.sarah.chen, dr.james.okafor, dr.priya.sharma, dr.michael.torres, dr.emily.watson @clinic.com)`);
  console.log(`  Patients: ${patients.length} (alice.johnson, bob.smith, etc. @email.com)`);
  console.log(`  Default password for ALL accounts: ${DEMO_PASSWORD}`);
  console.log('\n✅ Database seeded successfully!');
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
