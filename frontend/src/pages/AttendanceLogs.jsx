import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useSubject } from "../context/SubjectContext.jsx";
import AttendanceLogModal from "../components/AttendanceLogModal.jsx";
import { formatDisplayDate } from "../utils/attendanceUtils.js";

export default function AttendanceLogs() {
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const {
        subjects,
        getSubjects,
        getAllAttendance,
        updateAttendanceLog,
        deleteAttendanceLog
    } = useSubject();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [busyLogId, setBusyLogId] = useState(null);

    const [subjectFilter, setSubjectFilter] = useState("");
    const [attendedFilter, setAttendedFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingLog, setEditingLog] = useState(null);

    const loadData = useCallback(async () => {
        try {
            const [fetchedLogs] = await Promise.all([
                getAllAttendance({
                    subject: subjectFilter || undefined,
                    attended: attendedFilter || undefined,
                    eventType: typeFilter || undefined,
                    startDate: startDate || undefined,
                    endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined
                }),
                subjects.length === 0 ? getSubjects() : Promise.resolve()
            ]);
            setError(null);
            setLogs(fetchedLogs);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load activity logs");
        } finally {
            setLoading(false);
        }
    }, [
        getAllAttendance,
        getSubjects,
        subjects.length,
        subjectFilter,
        attendedFilter,
        typeFilter,
        startDate,
        endDate
    ]);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/auth", { replace: true });
            return;
        }
        let cancelled = false;
        Promise.all([
            getAllAttendance({
                subject: subjectFilter || undefined,
                attended: attendedFilter || undefined,
                eventType: typeFilter || undefined,
                startDate: startDate || undefined,
                endDate: endDate ? `${endDate}T23:59:59.999Z` : undefined
            }),
            subjects.length === 0 ? getSubjects() : Promise.resolve()
        ])
            .then(([fetchedLogs]) => {
                if (cancelled) return;
                setError(null);
                setLogs(fetchedLogs);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(err.response?.data?.message || "Failed to load activity logs");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [
        isAuthenticated,
        navigate,
        getAllAttendance,
        getSubjects,
        subjects.length,
        subjectFilter,
        attendedFilter,
        typeFilter,
        startDate,
        endDate
    ]);

    async function handleToggle(log) {
        setBusyLogId(log._id);
        try {
            await updateAttendanceLog(log._id, { attended: !log.attended });
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update log");
        } finally {
            setBusyLogId(null);
        }
    }

    async function handleDelete(log) {
        setBusyLogId(log._id);
        try {
            const subjId = log.subject?._id || log.subject;
            await deleteAttendanceLog(log._id, subjId);
            await loadData();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to delete log");
        } finally {
            setBusyLogId(null);
        }
    }

    function clearFilters() {
        setSubjectFilter("");
        setAttendedFilter("");
        setTypeFilter("");
        setStartDate("");
        setEndDate("");
    }

    return (
        <div className="home-page">
            {(showAddModal || editingLog) && (
                <AttendanceLogModal
                    subjects={subjects}
                    existingLog={editingLog}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingLog(null);
                    }}
                    onSaved={loadData}
                />
            )}

            <div className="home-page-header">
                <div>
                    <h1 className="heading activity-heading">Activity Logs</h1>
                    <p className="panel-subtitle">Chronological attendance event stream across all subjects</p>
                </div>
                {subjects.length > 0 && (
                    <button className="create-subject-btn" onClick={() => setShowAddModal(true)}>
                        + Add Attendance Log
                    </button>
                )}
            </div>

            <div className="activity-filters-grid">
                <select
                    className="filter-select"
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                >
                    <option value="">All Subjects</option>
                    {subjects.map((subj) => (
                        <option key={subj._id} value={subj._id}>{subj.name}</option>
                    ))}
                </select>

                <select
                    className="filter-select"
                    value={attendedFilter}
                    onChange={(e) => setAttendedFilter(e.target.value)}
                >
                    <option value="">All Statuses</option>
                    <option value="true">Attended</option>
                    <option value="false">Missed</option>
                </select>

                <select
                    className="filter-select"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="">All Types</option>
                    <option value="regular">Regular</option>
                    <option value="extra">Extra</option>
                    <option value="initial">Initial</option>
                </select>

                <input
                    type="date"
                    className="filter-input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    aria-label="Start date"
                />

                <input
                    type="date"
                    className="filter-input"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    aria-label="End date"
                />

                {(subjectFilter || attendedFilter || typeFilter || startDate || endDate) && (
                    <button type="button" className="profile-btn" onClick={clearFilters}>
                        Reset Filters
                    </button>
                )}
            </div>

            {error && <p className="error-message">{error}</p>}

            {loading ? (
                <p className="subject-alt-text">Loading activity logs...</p>
            ) : logs.length > 0 ? (
                <div className="logs-table-list">
                    {logs.map((log) => {
                        const subjObj = log.subject && typeof log.subject === "object" ? log.subject : null;
                        const subjId = subjObj?._id || log.subject;

                        return (
                            <div key={log._id} className="log-row-card">
                                <div className="log-row-left">
                                    <span className={`log-badge ${log.attended ? "badge-attended" : "badge-missed"}`}>
                                        {log.attended ? "Attended" : "Missed"}
                                    </span>
                                    <div>
                                        <div className="log-row-date">
                                            {subjObj ? (
                                                <Link to={`/subjects/${subjId}`} className="log-subject-link">
                                                    {subjObj.name}
                                                </Link>
                                            ) : (
                                                <span>Subject</span>
                                            )}
                                            <span className="log-date-muted">&middot; {formatDisplayDate(log.date)}</span>
                                            <span className="log-type-tag">{log.eventType}</span>
                                        </div>
                                        {log.notes && <p className="log-notes-text">{log.notes}</p>}
                                    </div>
                                </div>
                                <div className="log-item-actions">
                                    <button
                                        className="mini-chip-btn"
                                        disabled={busyLogId === log._id}
                                        onClick={() => handleToggle(log)}
                                    >
                                        {log.attended ? "Mark Missed" : "Mark Attended"}
                                    </button>
                                    <button
                                        className="mini-chip-btn"
                                        disabled={busyLogId === log._id}
                                        onClick={() => setEditingLog(log)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="mini-chip-btn danger-chip"
                                        disabled={busyLogId === log._id}
                                        onClick={() => handleDelete(log)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="subject-alt-text">No attendance logs found.</p>
            )}
        </div>
    );
}
