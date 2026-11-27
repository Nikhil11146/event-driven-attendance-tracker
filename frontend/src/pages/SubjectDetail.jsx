import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useSubject } from "../context/SubjectContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";
import AttendanceCalendar from "../components/AttendanceCalendar.jsx";
import AttendanceLogModal from "../components/AttendanceLogModal.jsx";
import EditFunction from "../components/EditForm.jsx";
import Modal from "../components/Modal.jsx";
import {
    calculateAttendanceInsight,
    computeAttendanceStreak,
    formatDisplayDate,
    toLocalDateKey
} from "../utils/attendanceUtils.js";

export default function SubjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const {
        getSubjectAttendance,
        updateAttendanceLog,
        deleteAttendanceLog,
        resetSubjectAttendance
    } = useSubject();
    const { targetPercentage } = useSettings();

    const [subject, setSubject] = useState(null);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedDateKey, setSelectedDateKey] = useState(toLocalDateKey(new Date()));
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");

    const [showLogModal, setShowLogModal] = useState(false);
    const [logModalDateKey, setLogModalDateKey] = useState(null);
    const [editingLog, setEditingLog] = useState(null);
    const [isEditingSubject, setIsEditingSubject] = useState(false);
    const [isConfirmingReset, setIsConfirmingReset] = useState(false);
    const [busyLogId, setBusyLogId] = useState(null);

    const loadSubjectData = useCallback(async () => {
        try {
            const data = await getSubjectAttendance(id);
            setError(null);
            if (data) {
                setSubject(data.subject);
                setLogs(data.logs || []);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load subject attendance");
        } finally {
            setLoading(false);
        }
    }, [getSubjectAttendance, id]);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/auth", { replace: true });
            return;
        }
        let cancelled = false;
        getSubjectAttendance(id)
            .then((data) => {
                if (cancelled) return;
                setError(null);
                if (data) {
                    setSubject(data.subject);
                    setLogs(data.logs || []);
                }
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err.response?.data?.message || "Failed to load subject attendance");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, navigate, getSubjectAttendance, id]);

    const insight = useMemo(() => {
        if (!subject) return calculateAttendanceInsight(0, 0, targetPercentage);
        return calculateAttendanceInsight(
            subject.attendedClasses,
            subject.totalClasses,
            targetPercentage
        );
    }, [subject, targetPercentage]);

    const streak = useMemo(() => computeAttendanceStreak(logs), [logs]);

    const selectedDateLogs = useMemo(() => {
        if (!selectedDateKey) return [];
        return logs.filter((log) => toLocalDateKey(log.date) === selectedDateKey);
    }, [logs, selectedDateKey]);

    const filteredLogs = useMemo(() => {
        return logs.filter((log) => {
            if (statusFilter === "attended" && !log.attended) return false;
            if (statusFilter === "missed" && log.attended) return false;
            if (typeFilter !== "all" && log.eventType !== typeFilter) return false;
            return true;
        });
    }, [logs, statusFilter, typeFilter]);

    function openAddForDate(dateKey) {
        setEditingLog(null);
        setLogModalDateKey(dateKey || selectedDateKey || toLocalDateKey(new Date()));
        setShowLogModal(true);
    }

    function openEditLog(log) {
        setLogModalDateKey(null);
        setEditingLog(log);
        setShowLogModal(true);
    }

    async function handleQuickToggle(log) {
        setBusyLogId(log._id);
        try {
            await updateAttendanceLog(log._id, { attended: !log.attended });
            await loadSubjectData();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update log");
        } finally {
            setBusyLogId(null);
        }
    }

    async function handleDeleteLog(logId) {
        setBusyLogId(logId);
        try {
            await deleteAttendanceLog(logId, id);
            await loadSubjectData();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to delete log");
        } finally {
            setBusyLogId(null);
        }
    }

    async function handleResetAll() {
        try {
            await resetSubjectAttendance(id);
            setIsConfirmingReset(false);
            await loadSubjectData();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to clear logs");
        }
    }

    if (loading) {
        return (
            <div className="home-page">
                <p className="subject-alt-text">Loading subject calendar and logs...</p>
            </div>
        );
    }

    if (error && !subject) {
        return (
            <div className="home-page">
                <Link to="/home" className="back-link">&larr; Back to Home</Link>
                <p className="error-message">{error}</p>
            </div>
        );
    }

    return (
        <div className="home-page subject-detail-page">
            {showLogModal && (
                <AttendanceLogModal
                    fixedSubjectId={id}
                    initialDateKey={logModalDateKey}
                    existingLog={editingLog}
                    onClose={() => {
                        setShowLogModal(false);
                        setEditingLog(null);
                    }}
                    onSaved={loadSubjectData}
                />
            )}

            {isEditingSubject && subject && (
                <Modal onClose={() => setIsEditingSubject(false)}>
                    <EditFunction
                        setIsEditing={setIsEditingSubject}
                        subjectDetails={subject}
                        onUpdated={(updated) => setSubject(updated)}
                    />
                </Modal>
            )}

            {isConfirmingReset && (
                <Modal onClose={() => setIsConfirmingReset(false)}>
                    <div className="confirm-dialog">
                        <p className="dialog-text">
                            Clear all {logs.length} attendance logs for {subject?.name}? This will reset its count to 0 / 0.
                        </p>
                        <div className="confirm-actions">
                            <button
                                className="cancel-btn"
                                onClick={() => setIsConfirmingReset(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="confirm-btn"
                                onClick={handleResetAll}
                            >
                                Clear All Logs
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            <div className="detail-top-nav">
                <Link to="/home" className="back-link">&larr; Back to Subjects</Link>
            </div>

            <div className="home-page-header detail-header">
                <div>
                    <h1 className="heading detail-heading">{subject?.name}</h1>
                    <div className="detail-meta-row">
                        {subject?.faculty && <span>Faculty: {subject.faculty}</span>}
                        {subject?.dept && <span>Dept: {subject.dept}</span>}
                        {subject?.credits !== undefined && subject?.credits !== null && (
                            <span>Credits: {subject.credits}</span>
                        )}
                    </div>
                </div>
                <div className="home-header-actions">
                    <button
                        className="profile-btn"
                        onClick={() => setIsEditingSubject(true)}
                    >
                        Edit Subject
                    </button>
                    {logs.length > 0 && (
                        <button
                            className="profile-btn logout-btn"
                            onClick={() => setIsConfirmingReset(true)}
                        >
                            Reset Logs
                        </button>
                    )}
                    <button
                        className="create-subject-btn"
                        onClick={() => openAddForDate(selectedDateKey)}
                    >
                        + Add Attendance Log
                    </button>
                </div>
            </div>

            {error && <p className="error-message">{error}</p>}

            <div className="summary-strip detail-stats-strip">
                <div className="summary-stat-card">
                    <span className="summary-stat-label">Attendance</span>
                    <span className={`summary-stat-value status-text-${insight.status}`}>
                        {subject?.totalClasses === 0 ? "0%" : `${Math.round(insight.percentage)}%`}
                    </span>
                    <span className="summary-stat-sub">{insight.message}</span>
                </div>
                <div className="summary-stat-card">
                    <span className="summary-stat-label">Attended / Total</span>
                    <span className="summary-stat-value">
                        {subject?.attendedClasses || 0} / {subject?.totalClasses || 0}
                    </span>
                    <span className="summary-stat-sub">
                        {subject?.missedClasses || 0} missed classes
                    </span>
                </div>
                <div className="summary-stat-card">
                    <span className="summary-stat-label">Current Streak</span>
                    <span className="summary-stat-value">{streak}</span>
                    <span className="summary-stat-sub">
                        consecutive attended {streak === 1 ? "class" : "classes"}
                    </span>
                </div>
            </div>

            <div className="detail-calendar-layout">
                <AttendanceCalendar
                    logs={logs}
                    selectedDateKey={selectedDateKey}
                    onSelectDate={setSelectedDateKey}
                />

                <div className="selected-day-panel">
                    <div className="selected-day-header">
                        <div>
                            <h2 className="panel-title">
                                {selectedDateKey
                                    ? formatDisplayDate(`${selectedDateKey}T12:00:00`)
                                    : "Select a Date"}
                            </h2>
                            <p className="panel-subtitle">
                                {selectedDateLogs.length} {selectedDateLogs.length === 1 ? "entry" : "entries"} on this date
                            </p>
                        </div>
                        <button
                            className="create-subject-btn panel-add-btn"
                            onClick={() => openAddForDate(selectedDateKey)}
                        >
                            + Log
                        </button>
                    </div>

                    {selectedDateLogs.length > 0 ? (
                        <div className="day-logs-list">
                            {selectedDateLogs.map((log) => (
                                <div key={log._id} className="day-log-item">
                                    <div className="day-log-main">
                                        <span className={`log-badge ${log.attended ? "badge-attended" : "badge-missed"}`}>
                                            {log.attended ? "Attended" : "Missed"}
                                        </span>
                                        <span className="log-type-tag">{log.eventType}</span>
                                    </div>
                                    {log.notes && <p className="log-notes-text">{log.notes}</p>}
                                    <div className="log-item-actions">
                                        <button
                                            className="mini-chip-btn"
                                            disabled={busyLogId === log._id}
                                            onClick={() => handleQuickToggle(log)}
                                        >
                                            Flip
                                        </button>
                                        <button
                                            className="mini-chip-btn"
                                            disabled={busyLogId === log._id}
                                            onClick={() => openEditLog(log)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="mini-chip-btn danger-chip"
                                            disabled={busyLogId === log._id}
                                            onClick={() => handleDeleteLog(log._id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-day-state">
                            <p className="subject-alt-text">No classes logged on this day.</p>
                            <button
                                className="profile-btn"
                                onClick={() => openAddForDate(selectedDateKey)}
                            >
                                Log class for this date
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="logs-history-section">
                <div className="logs-history-header">
                    <h2 className="panel-title">All Event Logs ({filteredLogs.length})</h2>
                    <div className="logs-filter-controls">
                        <select
                            className="filter-select"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="attended">Attended Only</option>
                            <option value="missed">Missed Only</option>
                        </select>
                        <select
                            className="filter-select"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                        >
                            <option value="all">All Types</option>
                            <option value="regular">Regular</option>
                            <option value="extra">Extra</option>
                            <option value="initial">Initial</option>
                        </select>
                    </div>
                </div>

                {filteredLogs.length > 0 ? (
                    <div className="logs-table-list">
                        {filteredLogs.map((log) => (
                            <div key={log._id} className="log-row-card">
                                <div className="log-row-left">
                                    <span className={`log-badge ${log.attended ? "badge-attended" : "badge-missed"}`}>
                                        {log.attended ? "Attended" : "Missed"}
                                    </span>
                                    <div>
                                        <div className="log-row-date">
                                            {formatDisplayDate(log.date)}
                                            <span className="log-type-tag">{log.eventType}</span>
                                        </div>
                                        {log.notes && <p className="log-notes-text">{log.notes}</p>}
                                    </div>
                                </div>
                                <div className="log-item-actions">
                                    <button
                                        className="mini-chip-btn"
                                        disabled={busyLogId === log._id}
                                        onClick={() => handleQuickToggle(log)}
                                    >
                                        {log.attended ? "Mark Missed" : "Mark Attended"}
                                    </button>
                                    <button
                                        className="mini-chip-btn"
                                        disabled={busyLogId === log._id}
                                        onClick={() => openEditLog(log)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="mini-chip-btn danger-chip"
                                        disabled={busyLogId === log._id}
                                        onClick={() => handleDeleteLog(log._id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="subject-alt-text">No attendance logs match the selected filters.</p>
                )}
            </div>
        </div>
    );
}
