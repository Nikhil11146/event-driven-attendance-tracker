import { useState } from "react";
import Modal from "./Modal.jsx";
import { useSubject } from "../context/SubjectContext.jsx";
import { toLocalDateKey } from "../utils/attendanceUtils.js";

export default function AttendanceLogModal({
    onClose,
    onSaved,
    fixedSubjectId = null,
    subjects = [],
    initialDateKey = null,
    existingLog = null
}) {
    const isEditMode = Boolean(existingLog);
    const { logAttendance, updateAttendanceLog } = useSubject();

    const [subjectId, setSubjectId] = useState(
        existingLog?.subject?._id || existingLog?.subject || fixedSubjectId || subjects[0]?._id || ""
    );
    const [attended, setAttended] = useState(existingLog ? existingLog.attended : true);
    const [date, setDate] = useState(
        existingLog?.date
            ? toLocalDateKey(existingLog.date)
            : initialDateKey || toLocalDateKey(new Date())
    );
    const [eventType, setEventType] = useState(existingLog?.eventType || "regular");
    const [notes, setNotes] = useState(existingLog?.notes || "");
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState(null);

    async function handleSubmit(e) {
        e.preventDefault();
        setApiError(null);

        if (!isEditMode && !subjectId) {
            setApiError("Please select a subject");
            return;
        }

        if (!date) {
            setApiError("Please select a valid date");
            return;
        }

        setSubmitting(true);
        try {
            // Preserve local midday timestamp so timezone offsets do not shift the selected calendar day
            const isoDate = new Date(`${date}T12:00:00`).toISOString();
            const payload = {
                attended,
                date: isoDate,
                eventType,
                notes: notes.trim()
            };

            let result;
            if (isEditMode) {
                result = await updateAttendanceLog(existingLog._id, payload);
            } else {
                result = await logAttendance({
                    ...payload,
                    subject: subjectId
                });
            }

            if (onSaved) {
                onSaved(result);
            }
            onClose();
        } catch (error) {
            setApiError(error.response?.data?.message || "Failed to save attendance log");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Modal onClose={onClose}>
            <h2 className="modal-title">
                {isEditMode ? "Edit Attendance Log" : "Log Attendance"}
            </h2>
            <form className="create-subject-form" onSubmit={handleSubmit}>
                {!isEditMode && !fixedSubjectId && (
                    <select
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                        required
                    >
                        <option value="">Select Subject...</option>
                        {subjects.map((subj) => (
                            <option key={subj._id} value={subj._id}>
                                {subj.name}
                            </option>
                        ))}
                    </select>
                )}

                <div className="segmented-toggle" role="group" aria-label="Attendance status">
                    <button
                        type="button"
                        className={`toggle-option ${attended ? "active-attended" : ""}`}
                        onClick={() => setAttended(true)}
                    >
                        Attended
                    </button>
                    <button
                        type="button"
                        className={`toggle-option ${!attended ? "active-missed" : ""}`}
                        onClick={() => setAttended(false)}
                    >
                        Missed
                    </button>
                </div>

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
                        <select
                            value={eventType}
                            onChange={(e) => setEventType(e.target.value)}
                        >
                            <option value="regular">Regular Class</option>
                            <option value="extra">Extra Class</option>
                            <option value="initial">Initial Seed</option>
                        </select>
                    </label>
                </div>

                <label className="form-field-label">
                    <span>Notes (Optional)</span>
                    <input
                        type="text"
                        maxLength={200}
                        placeholder="Lecture topic or reason..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                    />
                </label>

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
                        disabled={submitting}
                    >
                        {submitting ? "Saving..." : isEditMode ? "Update Log" : "Save Log"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
