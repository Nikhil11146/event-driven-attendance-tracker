import { Router } from "express";
import {
    addAttendance,
    addBulkAttendance,
    deleteAttendance,
    getAllAttendance,
    getAttendanceById,
    getAttendanceSummary,
    getSubjectAttendance,
    resetSubjectAttendance,
    updateAttendance
} from "../controllers/attendance.controller.js";
import {
    validateBulkAttendance,
    validateCreateAttendance,
    validateUpdateAttendance,
    verifyAttendanceOwnership,
    verifySubjectOwnership
} from "../middlewares/attendance.middleware.js";

const attendanceRouter = Router();

attendanceRouter.get('/summary', getAttendanceSummary);

attendanceRouter.post('/bulk', validateBulkAttendance, addBulkAttendance);

attendanceRouter.get('/subject/:subjectId', verifySubjectOwnership, getSubjectAttendance);

attendanceRouter.delete('/subject/:subjectId', verifySubjectOwnership, resetSubjectAttendance);

attendanceRouter.get('/', getAllAttendance);

attendanceRouter.post('/', validateCreateAttendance, verifySubjectOwnership, addAttendance);

attendanceRouter.get('/:id', verifyAttendanceOwnership, getAttendanceById);

attendanceRouter.put('/:id', verifyAttendanceOwnership, validateUpdateAttendance, updateAttendance);

attendanceRouter.delete('/:id', verifyAttendanceOwnership, deleteAttendance);

export default attendanceRouter;
