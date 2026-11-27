import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import SubjectCard from "../components/SubjectCard.jsx";
import { useSubject } from "../context/SubjectContext.jsx";
import { useSettings } from "../context/SettingsContext.jsx";
import CreateWindow from "../components/CreateWindow.jsx";
import BulkLogModal from "../components/BulkLogModal.jsx";
import { calculateAttendanceInsight } from "../utils/attendanceUtils.js";

const DEPARTMENTS = ["CSE", "ECE", "MECH", "CIVIL", "CHEM", "BIOTECH", "PE", "Others"];

export default function Home() {
    const navigate = useNavigate();

    const { isAuthenticated, signOut } = useAuth();
    const { getSubjects, subjects } = useSubject();
    const { targetPercentage } = useSettings();

    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [isBulkLogging, setIsBulkLogging] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [deptFilter, setDeptFilter] = useState("");

    useEffect(() => {
        if (!isAuthenticated) {
            navigate("/auth", { replace: true });
            return;
        }

        async function getData() {
            try {
                await getSubjects();
            } catch (err) {
                setError("Something went wrong!");
                if (err.response?.status === 401) signOut();
                console.log(err);
            } finally {
                setIsLoading(false);
            }
        }
        getData();
    }, [isAuthenticated, navigate, getSubjects, signOut]);

    const summary = useMemo(() => {
        let totalClasses = 0;
        let attendedClasses = 0;
        let atRiskCount = 0;

        for (const subject of subjects) {
            const total = subject.totalClasses || 0;
            const attended = subject.attendedClasses || 0;
            totalClasses += total;
            attendedClasses += attended;
            if (total > 0 && (attended / total) * 100 < targetPercentage) {
                atRiskCount += 1;
            }
        }

        const insight = calculateAttendanceInsight(attendedClasses, totalClasses, targetPercentage);
        return {
            totalClasses,
            attendedClasses,
            missedClasses: totalClasses - attendedClasses,
            atRiskCount,
            insight
        };
    }, [subjects, targetPercentage]);

    const filteredSubjects = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return subjects.filter((subject) => {
            const matchesSearch = !query
                || subject.name?.toLowerCase().includes(query)
                || subject.faculty?.toLowerCase().includes(query);
            const matchesDept = !deptFilter || subject.dept === deptFilter;
            return matchesSearch && matchesDept;
        });
    }, [subjects, searchQuery, deptFilter]);

    return (
        <div className="home-page">
            {isCreating && (
                <CreateWindow onClose={() => setIsCreating(false)} />
            )}

            {isBulkLogging && (
                <BulkLogModal
                    subjects={subjects}
                    onClose={() => setIsBulkLogging(false)}
                />
            )}

            <div className="home-page-header">
                <h1 className="heading">Home</h1>
                <div className="home-header-actions">
                    {subjects.length > 0 && (
                        <button
                            className="profile-btn header-secondary-btn"
                            onClick={() => setIsBulkLogging(true)}
                        >
                            Log Daily Classes
                        </button>
                    )}
                    <button
                        className="create-subject-btn"
                        onClick={() => setIsCreating(true)}
                    >
                        Create new subject
                    </button>
                </div>
            </div>

            {!isLoading && !error && subjects.length > 0 && (
                <>
                    <div className="summary-strip">
                        <div className="summary-stat-card">
                            <span className="summary-stat-label">Overall Attendance</span>
                            <span className={`summary-stat-value status-text-${summary.insight.status}`}>
                                {summary.totalClasses === 0 ? "0%" : `${Math.round(summary.insight.percentage)}%`}
                            </span>
                            <span className="summary-stat-sub">Target: {targetPercentage}%</span>
                        </div>
                        <div className="summary-stat-card">
                            <span className="summary-stat-label">Classes Logged</span>
                            <span className="summary-stat-value">{summary.totalClasses}</span>
                            <span className="summary-stat-sub">
                                {summary.attendedClasses} attended &middot; {summary.missedClasses} missed
                            </span>
                        </div>
                        <div className="summary-stat-card">
                            <span className="summary-stat-label">Subjects Tracked</span>
                            <span className="summary-stat-value">{subjects.length}</span>
                            <span className="summary-stat-sub">
                                {summary.atRiskCount === 0
                                    ? "All subjects on track"
                                    : `${summary.atRiskCount} below ${targetPercentage}%`}
                            </span>
                        </div>
                    </div>

                    <div className="home-filters-bar">
                        <input
                            type="text"
                            className="filter-input"
                            placeholder="Search subjects or faculty..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <select
                            className="filter-select"
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value)}
                        >
                            <option value="">All Departments</option>
                            {DEPARTMENTS.map((dept) => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                    </div>
                </>
            )}

            <div className="subject-card-container">
                {isLoading ? (
                    <p className="subject-alt-text">Loading Data...</p>
                ) : error ? (
                    <p className="subject-alt-text">{error}</p>
                ) : filteredSubjects.length > 0 ? (
                    filteredSubjects.map((subject) => (
                        <SubjectCard key={subject._id} {...subject} />
                    ))
                ) : subjects.length > 0 ? (
                    <p className="subject-alt-text">No subjects match your current filter.</p>
                ) : (
                    <p className="subject-alt-text">No Subjects Being Tracked</p>
                )}
            </div>
        </div>
    );
}
