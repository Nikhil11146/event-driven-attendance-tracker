import editIcon from '../assets/edit-icon.png';
import deleteIcon from '../assets/delete-icon.png';
import { useState } from "react";
import { Link } from "react-router-dom";
import { useSubject } from "../context/SubjectContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";
import EditFunction from "./EditForm.jsx";
import Modal from './Modal.jsx';
import { calculateAttendanceInsight } from "../utils/attendanceUtils.js";

export default function SubjectCard({
    name,
    attendedClasses = 0,
    totalClasses = 0,
    faculty,
    dept,
    credits,
    _id
}) {
    const [updating, setUpdating] = useState(false);
    const [actionError, setActionError] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const { logAttendance, deleteSubject } = useSubject();
    const { targetPercentage } = useSettings();

    const insight = calculateAttendanceInsight(attendedClasses, totalClasses, targetPercentage);

    async function handleQuickLog(attended) {
        setUpdating(true);
        setActionError(null);
        try {
            await logAttendance({ subject: _id, attended });
        } catch (error) {
            setActionError(error.response?.data?.message || "Failed to log attendance");
        } finally {
            setUpdating(false);
        }
    }

    return (
        <div className="subject-card">
            {isEditing ? (
                <Modal onClose={() => setIsEditing(false)}>
                    <EditFunction
                        setIsEditing={setIsEditing}
                        subjectDetails={{ name, attendedClasses, totalClasses, faculty, dept, credits, _id }}
                    />
                </Modal>
            ) : (
                <>
                    <div className="subject-info">
                        <div className="subject-card-top">
                            <Link to={`/subjects/${_id}`} className="subject-name subject-name-link">
                                {name}
                            </Link>
                            <span className={`status-pill status-${insight.status}`}>
                                {insight.message}
                            </span>
                        </div>

                        <div className="event-info">
                            <div className={`subject-perc status-text-${insight.status}`}>
                                {totalClasses === 0 ? "0%" : `${Math.round(insight.percentage)}%`}
                            </div>
                            <div className="subject-attended">
                                {attendedClasses} / {totalClasses} classes attended
                            </div>
                        </div>

                        <div className="subject-meta-list">
                            {faculty && (<div className="subject-faculty">Faculty: {faculty}</div>)}
                            {dept && (<div className="subj-dept">Dept: {dept}</div>)}
                            {credits !== undefined && credits !== null && (<div className="subject-credits">Credits: {credits}</div>)}
                        </div>
                    </div>

                    {actionError && <p className="error-message card-error">{actionError}</p>}

                    {isDeleting ? (
                        <Modal onClose={() => setIsDeleting(false)}>
                            <div className="confirm-dialog">
                                <p className="dialog-text">
                                    Are you sure you want to delete {name}? All attendance logs for this subject will also be permanently deleted.
                                </p>

                                <div className="confirm-actions">
                                    <button
                                        className="cancel-btn"
                                        onClick={() => setIsDeleting(false)}
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        className="confirm-btn"
                                        onClick={() => deleteSubject(_id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </Modal>
                    ) : (
                        <>
                            <div className="subject-actions">
                                <button
                                    className="attended"
                                    onClick={() => handleQuickLog(true)}
                                    disabled={updating}
                                >
                                    {updating ? "Logging..." : "Attended (+)"}
                                </button>
                                <button
                                    className="missed"
                                    onClick={() => handleQuickLog(false)}
                                    disabled={updating}
                                >
                                    {updating ? "Logging..." : "Missed (-)"}
                                </button>
                                <button
                                    className="edit-subject icon-btn"
                                    title="Edit Subject"
                                    onClick={() => setIsEditing(true)}
                                    disabled={updating}
                                >
                                    <img src={editIcon} alt="edit" width="18" height="18" />
                                </button>
                                <button
                                    className="edit-subject icon-btn"
                                    title="Delete Subject"
                                    onClick={() => setIsDeleting(true)}
                                    disabled={updating}
                                >
                                    <img src={deleteIcon} alt="delete" width="18" height="15" />
                                </button>
                            </div>
                            <Link to={`/subjects/${_id}`} className="view-calendar-link">
                                View Attendance Calendar &amp; Logs &rarr;
                            </Link>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
