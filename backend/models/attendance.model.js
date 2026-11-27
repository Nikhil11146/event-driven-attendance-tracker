import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'userId is required'],
        index: true
    },
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: [true, 'subjectId is required'],
        index: true
    },
    attended: {
        type: Boolean,
        required: [true, 'Attended status is required']
    },
    date: {
        type: Date,
        default: Date.now,
        required: [true, 'Date is required']
    },
    eventType: {
        type: String,
        enum: ['regular', 'extra', 'initial'],
        default: 'regular'
    },
    notes: {
        type: String,
        trim: true,
        maxlength: [200, 'maxLength: 200']
    }
}, {
    timestamps: true
});

attendanceSchema.index({ user: 1, subject: 1, date: -1 });

/**
 * Formats raw aggregated class counts into consistent attendance stats.
 */
attendanceSchema.statics.formatStats = function (stat = {}) {
    const totalClasses = stat.totalClasses || 0;
    const attendedClasses = stat.attendedClasses || 0;
    const missedClasses = totalClasses - attendedClasses;
    const attendancePercentage = totalClasses > 0
        ? Number(((attendedClasses / totalClasses) * 100).toFixed(2))
        : 0;

    return {
        totalClasses,
        attendedClasses,
        missedClasses,
        attendancePercentage
    };
};

/**
 * Aggregates attendance event logs per subject for a user.
 * Returns a Map keyed by subjectId string.
 */
attendanceSchema.statics.getSubjectStats = async function (userId, subjectIds) {
    const matchStage = {
        user: new mongoose.Types.ObjectId(userId)
    };

    if (Array.isArray(subjectIds)) {
        if (subjectIds.length === 0) {
            return new Map();
        }
        matchStage.subject = {
            $in: subjectIds.map((id) => new mongoose.Types.ObjectId(id))
        };
    }

    const stats = await this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: "$subject",
                totalClasses: { $sum: 1 },
                attendedClasses: {
                    $sum: { $cond: ["$attended", 1, 0] }
                }
            }
        }
    ]);

    const statsMap = new Map();
    for (const stat of stats) {
        statsMap.set(stat._id.toString(), this.formatStats(stat));
    }

    return statsMap;
};

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
