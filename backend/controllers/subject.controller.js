import mongoose from "mongoose";
import Subject from "../models/subject.model.js";
import Attendance from "../models/attendance.model.js";
import ApiError from "../classes/apiError.class.js";

/**
 * Attaches computed attendance event statistics to a list of subject documents.
 */
const attachStatsToSubjects = async (userId, subjects) => {
    if (subjects.length === 0) {
        return [];
    }

    const statsMap = await Attendance.getSubjectStats(
        userId,
        subjects.map((subject) => subject._id)
    );

    return subjects.map((subject) => ({
        ...subject.toObject(),
        ...(statsMap.get(subject._id.toString()) || Attendance.formatStats())
    }));
};

/**
 * Finds a subject by ID and verifies ownership by the requesting user.
 */
const findOwnedSubject = async (subjectId, userId) => {
    const subject = await Subject.findById(subjectId);

    if (!subject) {
        throw new ApiError(404, "No subject found.");
    }

    if (!subject.user.equals(userId)) {
        throw new ApiError(403, "Forbidden");
    }

    return subject;
};

/**
 * Builds initial attendance event logs when a subject is created with seed counts.
 */
const buildInitialAttendanceLogs = (userId, subjectId, totalClasses, attendedClasses) => {
    const logs = [];
    for (let i = 0; i < totalClasses; i++) {
        logs.push({
            user: userId,
            subject: subjectId,
            attended: i < attendedClasses,
            eventType: 'initial'
        });
    }
    return logs;
};

export const createSubject = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { name, faculty, dept, totalClasses, attendedClasses, credits } = req.body;

        const hasInitialCounts = totalClasses !== undefined || attendedClasses !== undefined;
        const total = hasInitialCounts ? Number(totalClasses ?? 0) : 0;
        const attended = hasInitialCounts ? Number(attendedClasses ?? 0) : 0;

        if (hasInitialCounts) {
            if (!Number.isInteger(total) || total < 0 || !Number.isInteger(attended) || attended < 0) {
                throw new ApiError(400, "totalClasses and attendedClasses must be non-negative integers");
            }
            if (attended > total) {
                throw new ApiError(400, "The attended classes must be lesser than or equal to total classes");
            }
            if (total > 1000) {
                throw new ApiError(400, "Initial totalClasses cannot exceed 1000");
            }
        }

        const [newSubject] = await Subject.create(
            [{ name, faculty, dept, credits, user: req.user.id }],
            { session }
        );

        if (total > 0) {
            const initialLogs = buildInitialAttendanceLogs(req.user.id, newSubject._id, total, attended);
            await Attendance.insertMany(initialLogs, { session });
        }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            data: {
                ...newSubject.toObject(),
                ...Attendance.formatStats({ totalClasses: total, attendedClasses: attended })
            }
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

export const getAllSubjects = async (req, res, next) => {
    try {
        const allSubjects = await Subject.find({ user: req.user.id });
        const subjectsWithStats = await attachStatsToSubjects(req.user.id, allSubjects);

        res.status(200).json({
            success: true,
            data: subjectsWithStats
        });
    } catch (error) {
        next(error);
    }
};

export const updateSubject = async (req, res, next) => {
    try {
        const { name, faculty, dept, credits, totalClasses, attendedClasses } = req.body;

        if (totalClasses !== undefined || attendedClasses !== undefined) {
            throw new ApiError(400, "Attendance counts are event-driven and must be updated via /v1/api/attendance");
        }

        const subject = await findOwnedSubject(req.params.id, req.user.id);

        if (name !== undefined) subject.name = name;
        if (faculty !== undefined) subject.faculty = faculty;
        if (dept !== undefined) subject.dept = dept;
        if (credits !== undefined) subject.credits = credits;

        await subject.save();

        const [subjectWithStats] = await attachStatsToSubjects(req.user.id, [subject]);

        res.status(200).json({
            success: true,
            data: subjectWithStats
        });
    } catch (error) {
        next(error);
    }
};

export const deleteSubject = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const subject = await findOwnedSubject(req.params.id, req.user.id);

        await Attendance.deleteMany({ subject: subject._id, user: req.user.id }, { session });
        await Subject.findByIdAndDelete(req.params.id, { session });

        await session.commitTransaction();
        session.endSession();

        res.status(200).json({
            success: true,
            message: "Successfully deleted"
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

export const getSubject = async (req, res, next) => {
    try {
        const subject = await findOwnedSubject(req.params.id, req.user.id);
        const [subjectWithStats] = await attachStatsToSubjects(req.user.id, [subject]);

        res.status(200).json({
            success: true,
            data: subjectWithStats
        });
    } catch (error) {
        next(error);
    }
};
