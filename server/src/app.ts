import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { prisma } from './config/db.js';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware.js';
import { announcementRoutes } from './modules/announcements/announcement.routes.js';
import { assessmentRoutes } from './modules/assessments/assessment.routes.js';
import { attendanceRoutes } from './modules/attendance/attendance.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { calendarRoutes } from './modules/calendar/calendar.routes.js';
import { courseRoutes } from './modules/courses/course.routes.js';
import { documentRoutes } from './modules/documents/document.routes.js';
import { gradebookRoutes, gradeRoutes } from './modules/grades/grade.routes.js';
import { meRoutes } from './modules/me/me.routes.js';
import { materialRoutes } from './modules/materials/material.routes.js';
import { notificationRoutes } from './modules/notifications/notification.routes.js';
import { requestRoutes } from './modules/requests/request.routes.js';
import { schoolRoutes } from './modules/school/school.routes.js';
import { sectionRoutes } from './modules/sections/section.routes.js';
import { assignmentReviewRoutes, subjectRoutes } from './modules/subjects/subject.routes.js';
import { userRoutes } from './modules/users/user.routes.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'available', service: 'school-intranet-system', timestamp: new Date().toISOString() });
  } catch {
    res.status(200).json({ status: 'ok', database: 'unavailable', service: 'school-intranet-system', timestamp: new Date().toISOString() });
  }
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api', auditRoutes);
app.use('/api/me', meRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/users', userRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api', assignmentReviewRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/gradebook', gradebookRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api', calendarRoutes);
app.use('/api', schoolRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
