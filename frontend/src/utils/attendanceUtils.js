/**
 * Converts a Date or ISO string to a local YYYY-MM-DD key for calendar grouping.
 */
export function toLocalDateKey(dateInput) {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Formats a Date or ISO string into a readable date label.
 */
export function formatDisplayDate(dateInput) {
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Calculates attendance status and how many classes can be missed or must be attended
 * to satisfy the target percentage.
 */
export function calculateAttendanceInsight(attendedClasses = 0, totalClasses = 0, targetPercentage = 75) {
    const attended = Number(attendedClasses) || 0;
    const total = Number(totalClasses) || 0;
    const target = Math.min(100, Math.max(1, Number(targetPercentage) || 75));

    if (total === 0) {
        return {
            percentage: 0,
            status: 'neutral',
            message: 'No classes logged yet',
            canMiss: 0,
            mustAttend: 0
        };
    }

    const percentage = Number(((attended / total) * 100).toFixed(2));

    if (percentage >= target) {
        const canMiss = Math.max(0, Math.floor((attended * 100) / target - total));
        const status = percentage < target + 5 ? 'warning' : 'success';
        const message = canMiss > 0
            ? `Can skip ${canMiss} ${canMiss === 1 ? 'class' : 'classes'}`
            : `On target (0 skips left)`;
        return { percentage, status, message, canMiss, mustAttend: 0 };
    }

    if (target >= 100) {
        return {
            percentage,
            status: 'danger',
            message: '100% target cannot be recovered after an absence',
            canMiss: 0,
            mustAttend: Infinity
        };
    }

    const mustAttend = Math.max(1, Math.ceil((target * total - 100 * attended) / (100 - target)));
    return {
        percentage,
        status: 'danger',
        message: `Attend next ${mustAttend} ${mustAttend === 1 ? 'class' : 'classes'} for ${target}%`,
        canMiss: 0,
        mustAttend
    };
}

/**
 * Computes consecutive attended streak starting from the most recent log.
 */
export function computeAttendanceStreak(logs = []) {
    if (!logs.length) return 0;

    const sorted = [...logs].sort((a, b) => {
        const dateDiff = new Date(b.date) - new Date(a.date);
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    let streak = 0;
    for (const log of sorted) {
        if (log.attended) {
            streak += 1;
        } else {
            break;
        }
    }
    return streak;
}
