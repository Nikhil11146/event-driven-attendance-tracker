import { useMemo, useState } from "react";
import { toLocalDateKey } from "../utils/attendanceUtils.js";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AttendanceCalendar({
    logs = [],
    selectedDateKey,
    onSelectDate
}) {
    const todayKey = toLocalDateKey(new Date());
    const [viewDate, setViewDate] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });

    const logsByDate = useMemo(() => {
        const grouped = new Map();
        for (const log of logs) {
            const key = toLocalDateKey(log.date);
            if (!key) continue;
            if (!grouped.has(key)) {
                grouped.set(key, []);
            }
            grouped.get(key).push(log);
        }
        return grouped;
    }, [logs]);

    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthLabel = viewDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric"
    });

    const cells = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        cells.push(day);
    }

    function prevMonth() {
        setViewDate(new Date(year, month - 1, 1));
    }

    function nextMonth() {
        setViewDate(new Date(year, month + 1, 1));
    }

    function goToday() {
        const now = new Date();
        setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
        onSelectDate(todayKey);
    }

    return (
        <div className="calendar-card">
            <div className="calendar-header">
                <h2 className="calendar-title">{monthLabel}</h2>
                <div className="calendar-nav">
                    <button type="button" className="profile-btn cal-nav-btn" onClick={prevMonth}>
                        &larr; Prev
                    </button>
                    <button type="button" className="profile-btn cal-nav-btn" onClick={goToday}>
                        Today
                    </button>
                    <button type="button" className="profile-btn cal-nav-btn" onClick={nextMonth}>
                        Next &rarr;
                    </button>
                </div>
            </div>

            <div className="calendar-weekdays">
                {WEEKDAYS.map((day) => (
                    <div key={day} className="calendar-weekday">
                        {day}
                    </div>
                ))}
            </div>

            <div className="calendar-grid">
                {cells.map((day, idx) => {
                    if (day === null) {
                        return <div key={`empty-${idx}`} className="calendar-day empty" />;
                    }

                    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const dayLogs = logsByDate.get(key) || [];
                    const attendedCount = dayLogs.filter((l) => l.attended).length;
                    const missedCount = dayLogs.length - attendedCount;

                    let dayStateClass = "";
                    if (attendedCount > 0 && missedCount > 0) {
                        dayStateClass = "day-mixed";
                    } else if (attendedCount > 0) {
                        dayStateClass = "day-attended";
                    } else if (missedCount > 0) {
                        dayStateClass = "day-missed";
                    }

                    const isSelected = selectedDateKey === key;
                    const isToday = todayKey === key;

                    return (
                        <button
                            type="button"
                            key={key}
                            onClick={() => onSelectDate(key)}
                            className={`calendar-day ${dayStateClass} ${isSelected ? "is-selected" : ""} ${isToday ? "is-today" : ""}`}
                        >
                            <span className="calendar-day-num">{day}</span>
                            {dayLogs.length > 0 && (
                                <span className="calendar-day-badges">
                                    {attendedCount > 0 && (
                                        <span className="cal-badge cal-badge-attended">+{attendedCount}</span>
                                    )}
                                    {missedCount > 0 && (
                                        <span className="cal-badge cal-badge-missed">-{missedCount}</span>
                                    )}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="calendar-legend">
                <span className="legend-item">
                    <span className="legend-dot legend-attended" /> Attended
                </span>
                <span className="legend-item">
                    <span className="legend-dot legend-missed" /> Missed
                </span>
                <span className="legend-item">
                    <span className="legend-dot legend-mixed" /> Mixed
                </span>
                <span className="legend-hint">Click any date to view or log classes</span>
            </div>
        </div>
    );
}
