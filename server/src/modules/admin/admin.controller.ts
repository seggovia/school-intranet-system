import type { Request, Response } from 'express';
import { AdminService } from './admin.service.js';

const service = new AdminService();

export class AdminController {
  summary(_req: Request, res: Response) {
    return service.summary().then((data) => res.json(data));
  }

  users(_req: Request, res: Response) {
    return service.users().then((data) => res.json(data));
  }

  createUser(req: Request, res: Response) {
    return service.createUser(req.body).then((data) => res.status(201).json(data));
  }

  updateUser(req: Request, res: Response) {
    return service.updateUser(String(req.params.id), req.body).then((data) => res.json(data));
  }

  setUserStatus(req: Request, res: Response) {
    return service.setUserStatus(String(req.params.id), req.body).then((data) => res.json(data));
  }

  resetUserPassword(req: Request, res: Response) {
    return service.resetUserPassword(String(req.params.id), req.body).then((data) => res.json(data));
  }

  students(_req: Request, res: Response) {
    return service.students().then((data) => res.json(data));
  }

  createStudent(req: Request, res: Response) {
    return service.createStudent(req.body).then((data) => res.status(201).json(data));
  }

  updateStudent(req: Request, res: Response) {
    return service.updateStudent(String(req.params.id), req.body).then((data) => res.json(data));
  }

  setStudentStatus(req: Request, res: Response) {
    return service.setStudentStatus(String(req.params.id), req.body).then((data) => res.json(data));
  }

  assignStudentSection(req: Request, res: Response) {
    return service.assignStudentSection(String(req.params.id), req.body).then((data) => res.json(data));
  }

  clearStudentSection(req: Request, res: Response) {
    return service.clearStudentSection(String(req.params.id)).then((data) => res.json(data));
  }

  teachers(_req: Request, res: Response) {
    return service.teachers().then((data) => res.json(data));
  }

  createTeacher(req: Request, res: Response) {
    return service.createTeacher(req.body).then((data) => res.status(201).json(data));
  }

  updateTeacher(req: Request, res: Response) {
    return service.updateTeacher(String(req.params.id), req.body).then((data) => res.json(data));
  }

  setTeacherStatus(req: Request, res: Response) {
    return service.setTeacherStatus(String(req.params.id), req.body).then((data) => res.json(data));
  }

  assignTeacher(req: Request, res: Response) {
    return service.assignTeacher(String(req.params.id), req.body).then((data) => res.json(data));
  }

  guardians(_req: Request, res: Response) {
    return service.guardians().then((data) => res.json(data));
  }

  createGuardian(req: Request, res: Response) {
    return service.createGuardian(req.body).then((data) => res.status(201).json(data));
  }

  updateGuardian(req: Request, res: Response) {
    return service.updateGuardian(String(req.params.id), req.body).then((data) => res.json(data));
  }

  setGuardianStatus(req: Request, res: Response) {
    return service.setGuardianStatus(String(req.params.id), req.body).then((data) => res.json(data));
  }

  linkGuardianStudents(req: Request, res: Response) {
    return service.linkGuardianStudents(String(req.params.id), req.body).then((data) => res.json(data));
  }

  courses(_req: Request, res: Response) {
    return service.courses().then((data) => res.json(data));
  }

  createCourse(req: Request, res: Response) {
    return service.createCourse(req.body).then((data) => res.status(201).json(data));
  }

  updateCourse(req: Request, res: Response) {
    return service.updateCourse(String(req.params.id), req.body).then((data) => res.json(data));
  }

  sections(_req: Request, res: Response) {
    return service.sections().then((data) => res.json(data));
  }

  createSection(req: Request, res: Response) {
    return service.createSection(req.body).then((data) => res.status(201).json(data));
  }

  updateSection(req: Request, res: Response) {
    return service.updateSection(String(req.params.id), req.body).then((data) => res.json(data));
  }

  deleteSection(req: Request, res: Response) {
    return service.deleteSection(String(req.params.id)).then((data) => res.json(data));
  }

  classrooms(_req: Request, res: Response) {
    return service.classrooms().then((data) => res.json(data));
  }

  createClassroom(req: Request, res: Response) {
    return service.createClassroom(req.body).then((data) => res.status(201).json(data));
  }

  updateClassroom(req: Request, res: Response) {
    return service.updateClassroom(String(req.params.id), req.body).then((data) => res.json(data));
  }

  deleteClassroom(req: Request, res: Response) {
    return service.deleteClassroom(String(req.params.id)).then((data) => res.json(data));
  }

  subjects(_req: Request, res: Response) {
    return service.subjects().then((data) => res.json(data));
  }

  createSubject(req: Request, res: Response) {
    return service.createSubject(req.body).then((data) => res.status(201).json(data));
  }

  updateSubject(req: Request, res: Response) {
    return service.updateSubject(String(req.params.id), req.body).then((data) => res.json(data));
  }

  assignSubjectTeacher(req: Request, res: Response) {
    return service.assignSubjectTeacher(String(req.params.id), req.body).then((data) => res.json(data));
  }

  assignments(_req: Request, res: Response) {
    return service.assignments().then((data) => res.json(data));
  }

  assignTeacherRelation(req: Request, res: Response) {
    return service.assignTeacher(String(req.body.teacherId), req.body).then((data) => res.json(data));
  }

  removeTeacherRelation(req: Request, res: Response) {
    return service.removeTeacherAssignment(req.body).then((data) => res.json(data));
  }

  assignStudentRelation(req: Request, res: Response) {
    return service.assignStudentSection(String(req.body.studentId), req.body).then((data) => res.json(data));
  }

  assignGuardianRelation(req: Request, res: Response) {
    return service.linkGuardianStudents(String(req.body.guardianId), req.body).then((data) => res.json(data));
  }

  unlinkGuardianRelation(req: Request, res: Response) {
    return service.unlinkGuardianStudent(req.body).then((data) => res.json(data));
  }
}
