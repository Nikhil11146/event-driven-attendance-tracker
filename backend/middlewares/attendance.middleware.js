import mongoose from "mongoose";
import Attendance from "../models/attendance.model.js";
import Subject from "../models/subject.model.js";
import ApiError from "../classes/apiError.class.js";

const VALID_EVENT_TYPES = ['regular', 'extra', 'initial'];

/**
 * Validates common attendance log fields on create or update payloads.
 */
const validateAttendanceFields = (payload, { requireAttended = true } = {}) => {
    const { attended, date, eventType, notes } = payload;

    if (requireAttended || attended !== undefined) {
        if (typeof attended !== "boolean") {
            throw new ApiError(400, "Attended status must be a boolean");
        }
    }

    if (date !== undefined) {
        if (typeof date === "boolean" || Number.isNaN(Date.parse(date))) {
            throw new ApiError(400, "Invalid date format");
        }
    }

    if (eventType !== undefined && !VALID_EVENT_TYPES.includes(eventType)) {
        throw new ApiError(400, "Invalid eventType. Allowed values: regular, extra, initial");
    }

    if (notes !== undefined && notes !== null) {
        if (typeof notes !== "string") {
            throw new ApiError(400, "Notes must be a string");
        }
        if (notes.trim().length > 200) {
            throw new ApiError(400, "Notes cannot exceed 200 characters");
        }
    }
};

export const validateCreateAttendance = (req, res, next) => {
    try {
        validateAttendanceFields(req.body, { requireAttended: true });
        next();
    } catch (error) {
        next(error);
    }
};

export const validateUpdateAttendance = (req, res, next) => {
    try {
        const { attended, date, eventType, notes } = req.body;

        if (
            attended === undefined &&
            date === undefined &&
            eventType === undefined &&
            notes === undefined
        ) {
            throw new ApiError(400, "At least one field (attended, date, eventType, notes) is required");
        }

        validateAttendanceFields(req.body, { requireAttended: false });
        next();
    } catch (error) {
        next(error);
    }
};

export const validateBulkAttendance = async (req, res, next) => {
    try {
        const { records } = req.body;

        if (!Array.isArray(records) || records.length === 0) {
            throw new ApiError(400, "records must be a non-empty array");
        }

        if (records.length > 500) {
            throw new ApiError(400, "Cannot log more than 500 attendance records at once");
        }

        const uniqueSubjectIds = new Set();

        for (const record of records) {
            if (!record || typeof record !== "object") {
                throw new ApiError(400, "Each attendance record must be an object");
            }

            const subjectId = record.subject || record.subjectId;
            if (!subjectId || !mongoose.Types.ObjectId.isValid(subjectId)) {
                throw new ApiError(400, "Each record must include a valid subject ID");
            }

            validateAttendanceFields(record, { requireAttended: true });
            uniqueSubjectIds.add(subjectId.toString());
        }

        const subjectIds = [...uniqueSubjectIds];
        const subjects = await Subject.find({ _id: { $in: subjectIds } });

        if (subjects.length !== subjectIds.length) {
            throw new ApiError(404, "One or more subjects not found.");
        }

        for (const subject of subjects) {
            if (!subject.user.equals(req.user.id)) {
                throw new ApiError(403, "Forbidden");
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};

export const verifySubjectOwnership = async (req, res, next) => {
    try {
        const subjectId = req.params.subjectId || req.body.subject || req.body.subjectId;

        if (!subjectId) {
            throw new ApiError(400, "Subject ID is required");
        }

        if (!mongoose.Types.ObjectId.isValid(subjectId)) {
            throw new ApiError(400, "Invalid subject ID");
        }

        const subject = await Subject.findById(subjectId);

        if (!subject) {
            throw new ApiError(404, "No subject found.");
        }

        if (!subject.user.equals(req.user.id)) {
            throw new ApiError(403, "Forbidden");
        }

        req.subject = subject;
        next();
    } catch (error) {
        next(error);
    }
};

export const verifyAttendanceOwnership = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new ApiError(400, "Invalid attendance ID");
        }

        const attendance = await Attendance.findById(id);

        if (!attendance) {
            throw new ApiError(404, "Attendance record not found.");
        }

        if (!attendance.user.equals(req.user.id)) {
            throw new ApiError(403, "Forbidden");
        }

        req.attendance = attendance;
        next();
    } catch (error) {
        next(error);
    }
};
