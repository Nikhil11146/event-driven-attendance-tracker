import mongoose from "mongoose";
import Attendance from "../models/attendance.model.js";
import Subject from "../models/subject.model.js";
import ApiError from "../classes/apiError.class.js";

/**
 * Fetches formatted attendance stats for a single subject.
 */
const getStatsForSubject = async (userId, subjectId) => {
    const statsMap = await Attendance.getSubjectStats(userId, [subjectId]);
    return statsMap.get(subjectId.toString()) || Attendance.formatStats();
};

/**
 * Builds a MongoDB filter object from query parameters for attendance log lookups.
 */
const buildAttendanceFilter = (userId, query, subjectIdOverride) => {
    const filter = { user: userId };

    const subjectFilter = subjectIdOverride || query.subject;
    if (subjectFilter) {
        if (!mongoose.Types.ObjectId.isValid(subjectFilter)) {
            throw new ApiError(400, "Invalid subject ID");
        }
        filter.subject = subjectFilter;
    }

    if (query.attended !== undefined) {
        if (query.attended !== "true" && query.attended !== "false") {
            throw new ApiError(400, "attended query must be true or false");
        }
        filter.attended = query.attended === "true";
    }

    if (query.eventType !== undefined) {
        if (!['regular', 'extra', 'initial'].includes(query.eventType)) {
            throw new ApiError(400, "Invalid eventType filter");
        }
        filter.eventType = query.eventType;
    }

    if (query.startDate !== undefined || query.endDate !== undefined) {
        filter.date = {};
        if (query.startDate !== undefined) {
            if (Number.isNaN(Date.parse(query.startDate))) {
                throw new ApiError(400, "Invalid startDate format");
            }
            filter.date.$gte = new Date(query.startDate);
        }
        if (query.endDate !== undefined) {
            if (Number.isNaN(Date.parse(query.endDate))) {
                throw new ApiError(400, "Invalid endDate format");
            }
            filter.date.$lte = new Date(query.endDate);
        }
    }

    return filter;
};

export const addAttendance = async (req, res, next) => {
    try {
        const { attended, date, eventType, notes } = req.body;

        const attendanceData = {
            user: req.user.id,
            subject: req.subject._id,
            attended
        };

        if (date !== undefined) attendanceData.date = date;
        if (eventType !== undefined) attendanceData.eventType = eventType;
        if (notes !== undefined) attendanceData.notes = notes;

        const newAttendance = await Attendance.create(attendanceData);
        const stats = await getStatsForSubject(req.user.id, req.subject._id);

        res.status(201).json({
            success: true,
            message: "Attendance logged successfully",
            data: {
                attendance: newAttendance,
                stats
            }
        });
    } catch (error) {
        next(error);
    }
};

export const addBulkAttendance = async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { records } = req.body;

        const logs = records.map((record) => ({
            user: req.user.id,
            subject: record.subject || record.subjectId,
            attended: record.attended,
            ...(record.date !== undefined && { date: record.date }),
            ...(record.eventType !== undefined && { eventType: record.eventType }),
            ...(record.notes !== undefined && { notes: record.notes })
        }));

        const createdLogs = await Attendance.insertMany(logs, { session });

        await session.commitTransaction();
        session.endSession();

        const affectedSubjectIds = [...new Set(logs.map((log) => log.subject.toString()))];
        const statsMap = await Attendance.getSubjectStats(req.user.id, affectedSubjectIds);

        res.status(201).json({
            success: true,
            message: "Attendance records logged successfully",
            data: {
                count: createdLogs.length,
                records: createdLogs,
                stats: Object.fromEntries(statsMap)
            }
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
};

export const getAllAttendance = async (req, res, next) => {
    try {
        const filter = buildAttendanceFilter(req.user.id, req.query);

        let query = Attendance.find(filter)
            .populate("subject", "name faculty dept credits")
            .sort({ date: -1, createdAt: -1 });

        if (req.query.limit !== undefined) {
            const limit = Number(req.query.limit);
            const page = Number(req.query.page || 1);
            if (!Number.isInteger(limit) || limit < 1 || limit > 200 || !Number.isInteger(page) || page < 1) {
                throw new ApiError(400, "Invalid pagination parameters");
            }
            query = query.skip((page - 1) * limit).limit(limit);
        }

        const logs = await query;

        res.status(200).json({
            success: true,
            count: logs.length,
            data: logs
        });
    } catch (error) {
        next(error);
    }
};

export const getSubjectAttendance = async (req, res, next) => {
    try {
        const filter = buildAttendanceFilter(req.user.id, req.query, req.subject._id);

        const [logs, stats] = await Promise.all([
            Attendance.find(filter).sort({ date: -1, createdAt: -1 }),
            getStatsForSubject(req.user.id, req.subject._id)
        ]);

        res.status(200).json({
            success: true,
            data: {
                subject: {
                    ...req.subject.toObject(),
                    ...stats
                },
                logs
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getAttendanceSummary = async (req, res, next) => {
    try {
        const [subjects, statsMap] = await Promise.all([
            Subject.find({ user: req.user.id }),
            Attendance.getSubjectStats(req.user.id)
        ]);

        let overallTotal = 0;
        let overallAttended = 0;

        const subjectSummaries = subjects.map((subject) => {
            const stats = statsMap.get(subject._id.toString()) || Attendance.formatStats();
            overallTotal += stats.totalClasses;
            overallAttended += stats.attendedClasses;

            return {
                ...subject.toObject(),
                ...stats
            };
        });

        res.status(200).json({
            success: true,
            data: {
                overall: Attendance.formatStats({
                    totalClasses: overallTotal,
                    attendedClasses: overallAttended
                }),
                subjects: subjectSummaries
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getAttendanceById = async (req, res, next) => {
    try {
        await req.attendance.populate("subject", "name faculty dept credits");

        res.status(200).json({
            success: true,
            data: req.attendance
        });
    } catch (error) {
        next(error);
    }
};

export const updateAttendance = async (req, res, next) => {
    try {
        const { attended, date, eventType, notes } = req.body;

        if (attended !== undefined) req.attendance.attended = attended;
        if (date !== undefined) req.attendance.date = date;
        if (eventType !== undefined) req.attendance.eventType = eventType;
        if (notes !== undefined) req.attendance.notes = notes;

        await req.attendance.save();
        const stats = await getStatsForSubject(req.user.id, req.attendance.subject);

        res.status(200).json({
            success: true,
            data: {
                attendance: req.attendance,
                stats
            }
        });
    } catch (error) {
        next(error);
    }
};

export const deleteAttendance = async (req, res, next) => {
    try {
        const subjectId = req.attendance.subject;

        await Attendance.findByIdAndDelete(req.attendance._id);
        const stats = await getStatsForSubject(req.user.id, subjectId);

        res.status(200).json({
            success: true,
            message: "Attendance record deleted successfully",
            data: {
                stats
            }
        });
    } catch (error) {
        next(error);
    }
};

export const resetSubjectAttendance = async (req, res, next) => {
    try {
        const result = await Attendance.deleteMany({
            user: req.user.id,
            subject: req.subject._id
        });

        res.status(200).json({
            success: true,
            message: "Subject attendance logs cleared",
            data: {
                deletedCount: result.deletedCount,
                stats: Attendance.formatStats()
            }
        });
    } catch (error) {
        next(error);
    }
};
