import type { VerificationRequest } from '../types/rentigo';
import { dbStore, emitStoreChange } from './storage';

const pendingOtpByUser = new Map<string, { email: string; code: string; expiresAt: number }>();

export function isEligibleCampusEmail(email: string): boolean {
  const lower = email.trim().toLowerCase();
  const domain = lower.split('@')[1] || '';
  return (
    domain.endsWith('.edu') ||
    domain.endsWith('.ac.in') ||
    domain.endsWith('.edu.in') ||
    domain.includes('.edu.')
  );
}

export const verificationsService = {
  async requestEmailOtp(
    userId: string,
    collegeEmail: string,
  ): Promise<{ demoCode: string; email: string }> {
    const email = collegeEmail.trim().toLowerCase();
    if (!email.includes('@') || !isEligibleCampusEmail(email)) {
      throw new Error('Enter a valid college email ending in .edu, .ac.in, or .edu.in.');
    }
    const demoCode = String(Math.floor(100000 + Math.random() * 900000));
    pendingOtpByUser.set(userId, {
      email,
      code: demoCode,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return { demoCode, email };
  },

  async verifyEmailOtp(userId: string, enteredCode: string): Promise<VerificationRequest> {
    const pending = pendingOtpByUser.get(userId);
    if (!pending) {
      throw new Error('Request an OTP first before verifying.');
    }
    if (Date.now() > pending.expiresAt) {
      pendingOtpByUser.delete(userId);
      throw new Error('OTP expired. Request a new code.');
    }
    if (enteredCode.trim() !== pending.code) {
      throw new Error('Incorrect 6-digit OTP code.');
    }
    pendingOtpByUser.delete(userId);

    const now = new Date().toISOString();
    const record: VerificationRequest = {
      id: `ver_${Date.now().toString(36)}`,
      userId,
      method: 'college_email_otp',
      collegeEmail: pending.email,
      status: 'approved',
      reviewedBy: 'system_otp',
      reviewedAt: now,
      createdAt: now,
    };

    const existing = dbStore.getVerifications();
    dbStore.saveVerifications([record, ...existing]);

    const users = dbStore.getUsers();
    dbStore.saveUsers(
      users.map((u) =>
        u.id === userId
          ? {
              ...u,
              isVerified: true,
              verificationStatus: 'verified',
              verifiedCollegeEmail: pending.email,
            }
          : u,
      ),
    );
    emitStoreChange();
    return record;
  },

  async submitIdPhotoVerification(
    userId: string,
    idPhotoUrl: string,
    studentIdNumber: string,
  ): Promise<VerificationRequest> {
    if (!idPhotoUrl.trim()) {
      throw new Error('Upload a clear photo of your student ID card.');
    }
    if (!studentIdNumber.trim()) {
      throw new Error('Enter your roll number / student ID number.');
    }

    const record: VerificationRequest = {
      id: `ver_${Date.now().toString(36)}`,
      userId,
      method: 'student_id_photo',
      idPhotoUrl: idPhotoUrl.trim(),
      studentIdNumber: studentIdNumber.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const existing = dbStore.getVerifications();
    dbStore.saveVerifications([record, ...existing]);

    const users = dbStore.getUsers();
    dbStore.saveUsers(
      users.map((u) => (u.id === userId ? { ...u, verificationStatus: 'pending' } : u)),
    );
    emitStoreChange();
    return record;
  },

  async listAll(): Promise<VerificationRequest[]> {
    return dbStore.getVerifications().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listForUser(userId: string): Promise<VerificationRequest[]> {
    return dbStore
      .getVerifications()
      .filter((v) => v.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async reviewVerification(
    verificationId: string,
    adminId: string,
    approve: boolean,
    rejectionReason?: string,
  ): Promise<VerificationRequest> {
    const admin = dbStore.getUsers().find((u) => u.id === adminId);
    if (!admin || admin.role !== 'admin') {
      throw new Error('Admin privileges required to review student IDs.');
    }

    const all = dbStore.getVerifications();
    const target = all.find((v) => v.id === verificationId);
    if (!target) throw new Error('Verification request not found.');

    const now = new Date().toISOString();
    const updated: VerificationRequest = {
      ...target,
      status: approve ? 'approved' : 'rejected',
      rejectionReason: approve ? undefined : rejectionReason?.trim() || 'Student ID unreadable.',
      reviewedBy: adminId,
      reviewedAt: now,
    };

    dbStore.saveVerifications(all.map((v) => (v.id === verificationId ? updated : v)));

    const users = dbStore.getUsers();
    dbStore.saveUsers(
      users.map((u) =>
        u.id === target.userId
          ? {
              ...u,
              isVerified: approve,
              verificationStatus: approve ? 'verified' : 'rejected',
            }
          : u,
      ),
    );
    emitStoreChange();
    return updated;
  },
};
