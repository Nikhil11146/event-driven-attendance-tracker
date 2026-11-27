import { useState } from "react";
import Modal from "./Modal.jsx";
import { useSubject } from "../context/SubjectContext.jsx";
import { toLocalDateKey } from "../utils/attendanceUtils.js";

export default function BulkLogModal({ subjects = [], onClose, onSaved }) {
    const { logBulkAttendance } = useSubject();
    const [date, setDate] = useState(toLocalDateKey(new Date()));
    const [eventType, setEventType] = useState("regular");
    const [selections, setSelections] = useState(() => {
        const init = {};
        for (const subject of subjects) {
            init[subject._id] = { status: "skip", notes: "" };
        }
        return init;
    });
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);

    function setSubjectStatus(subjectId, status) {
        setSelections((prev) => ({
            ...prev,
            [subjectId]: {
                ...prev[subjectId],
                status
            }
        }));
    }

    function setSubjectNotes(subjectId, notes) {
        setSelections((prev) => ({
            ...prev,
            [subjectId]: {
                ...prev[subjectId],
                notes
            }
        }));
    }

    function markAll(status) {
        setSelections((prev) => {
            const next = {};
            for (const subject of subjects) {
                next[subject._id] = {
                    ...prev[subject._id],
                    status
                };
            }
            return next;
        });
    }

    const selectedCount = Object.values(selections).filter((s) => s.status !== "skip").length;

    async function handleSubmit(e) {
        e.preventDefault();
        setApiError(null);

        if (selectedCount === 0) {
            setApiError("Select Attended or Missed for at least one subject");
            return;
        }

        const isoDate = new Date(`${date}T12:00:00`).toISOString();
        const records = subjects
            .filter((subject) => selections[subject._id]?.status !== "skip")
            .map((subject) => {
                const entry = selections[subject._id];
                return {
                    subject: subject._id,
                    attended: entry.status === "attended",
                    date: isoDate,
                    eventType,
                    ...(entry.notes.trim() && { notes: entry.notes.trim() })
                };
            });

        setSubmitting(true);
        try {
            const result = await logBulkAttendance(records);
            if (onSaved) onSaved(result);
            onClose();
        } catch (error) {
            setApiError(error.response?.data?.message || "Failed to log bulk attendance");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Modal onClose={onClose}>
            <h2 className="modal-title">Log Daily Classes</h2>
            <form className="create-subject-form bulk-log-form" onSubmit={handleSubmit}>
                <div className="form-row-two">
                    <label className="form-field-label">
                        <span>Date</span>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </label>
                    <label className="form-field-label">
                        <span>Session Type</span>
                        <select value={eventType} onChange={(e) => setEventType(e.target.value)}>
                            <option value="regular">Regular Class</option>
                            <option value="extra">Extra Class</option>
                        </select>
                    </label>
                </div>

                <div className="bulk-quick-bar">
                    <span className="bulk-count-label">{selectedCount} selected</span>
                    <div className="bulk-quick-actions">
                        <button type="button" className="mini-chip-btn" onClick={() => markAll("attended")}>
                            All Attended
                        </button>
                        <button type="button" className="mini-chip-btn" onClick={() => markAll("missed")}>
                            All Missed
                        </button>
                        <button type="button" className="mini-chip-btn" onClick={() => markAll("skip")}>
                            Clear
                        </button>
                    </div>
                </div>

                <div className="bulk-subject-list">
                    {subjects.map((subject) => {
                        const current = selections[subject._id] || { status: "skip", notes: "" };
                        return (
                            <div key={subject._id} className="bulk-subject-row">
                                <div className="bulk-subject-top">
                                    <span className="bulk-subject-name">{subject.name}</span>
                                    <div className="bulk-status-pills">
                                        <button
                                            type="button"
                                            className={`bulk-pill ${current.status === "attended" ? "is-attended" : ""}`}
                                            onClick={() => setSubjectStatus(subject._id, "attended")}
                                        >
                                            Attended
                                        </button>
                                        <button
                                            type="button"
                                            className={`bulk-pill ${current.status === "missed" ? "is-missed" : ""}`}
                                            onClick={() => setSubjectStatus(subject._id, "missed")}
                                        >
                                            Missed
                                        </button>
                                        <button
                                            type="button"
                                            className={`bulk-pill ${current.status === "skip" ? "is-skip" : ""}`}
                                            onClick={() => setSubjectStatus(subject._id, "skip")}
                                        >
                                            Skip
                                        </button>
                                    </div>
                                </div>
                                {current.status !== "skip" && (
                                    <input
                                        type="text"
                                        className="bulk-note-input"
                                        maxLength={200}
                                        placeholder="Optional note..."
                                        value={current.notes}
                                        onChange={(e) => setSubjectNotes(subject._id, e.target.value)}
                                    />
                                )}
                            </div>
                        );
                    })}
                </div>

                {apiError && <p className="error-message">{apiError}</p>}

                <div className="modal-actions">
                    <button
                        type="button"
                        className="modal-close-btn"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="submit-create-subject-btn"
                        disabled={submitting || selectedCount === 0}
                    >
                        {submitting ? "Logging..." : `Log ${selectedCount || ""} ${selectedCount === 1 ? "Class" : "Classes"}`}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
