import { createContext, useCallback, useContext, useState } from "react";
import api from "../api/axios.js";

const SubjectContext = createContext(null);

export default function SubjectProvider({ children }) {
    const [subjects, setSubjects] = useState([]);

    const syncSubjectStats = useCallback((subjectId, stats) => {
        if (!subjectId || !stats) return;
        setSubjects((prev) =>
            prev.map((subject) =>
                subject._id === subjectId
                    ? { ...subject, ...stats }
                    : subject
            )
        );
    }, []);

    const getSubjects = useCallback(async () => {
        const { data } = await api.get('/subjects');

        if (data.success) {
            setSubjects(data.data);
            return data.data;
        }
        return [];
    }, []);

    async function updateSubject(values, _id) {
        const { data } = await api.put(`/subjects/${_id}`, values);

        if (data.success) {
            setSubjects((prev) =>
                prev.map((subject) =>
                    subject._id === _id ? data.data : subject
                )
            );
            return data.data;
        }
    }

    async function createSubject(values) {
        const { data } = await api.post("/subjects", values);

        if (data.success) {
            setSubjects((prev) => [...prev, data.data]);
            return data.data;
        }
    }

    async function deleteSubject(_id) {
        const { data } = await api.delete(`/subjects/${_id}`);

        if (data.success) {
            setSubjects((prev) => prev.filter((subject) => subject._id !== _id));
        }
    }

    async function logAttendance(payload) {
        const { data } = await api.post("/attendance", payload);

        if (data.success) {
            const subjectId = payload.subject || payload.subjectId;
            syncSubjectStats(subjectId, data.data.stats);
            return data.data;
        }
    }

    async function logBulkAttendance(records) {
        const { data } = await api.post("/attendance/bulk", { records });

        if (data.success) {
            const statsBySubject = data.data.stats || {};
            setSubjects((prev) =>
                prev.map((subject) =>
                    statsBySubject[subject._id]
                        ? { ...subject, ...statsBySubject[subject._id] }
                        : subject
                )
            );
            return data.data;
        }
    }

    const getAllAttendance = useCallback(async (params = {}) => {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
        );
        const { data } = await api.get("/attendance", { params: cleanParams });
        return data.success ? data.data : [];
    }, []);

    const getSubjectAttendance = useCallback(async (subjectId, params = {}) => {
        const cleanParams = Object.fromEntries(
            Object.entries(params).filter(([, v]) => v !== undefined && v !== "")
        );
        const { data } = await api.get(`/attendance/subject/${subjectId}`, { params: cleanParams });
        return data.success ? data.data : null;
    }, []);

    const getAttendanceSummary = useCallback(async () => {
        const { data } = await api.get("/attendance/summary");
        return data.success ? data.data : null;
    }, []);

    async function updateAttendanceLog(logId, values) {
        const { data } = await api.put(`/attendance/${logId}`, values);

        if (data.success) {
            syncSubjectStats(data.data.attendance.subject, data.data.stats);
            return data.data;
        }
    }

    async function deleteAttendanceLog(logId, subjectId) {
        const { data } = await api.delete(`/attendance/${logId}`);

        if (data.success) {
            syncSubjectStats(subjectId, data.data.stats);
            return data.data;
        }
    }

    async function resetSubjectAttendance(subjectId) {
        const { data } = await api.delete(`/attendance/subject/${subjectId}`);

        if (data.success) {
            syncSubjectStats(subjectId, data.data.stats);
            return data.data;
        }
    }

    return (
        <SubjectContext.Provider
            value={{
                subjects,
                setSubjects,
                getSubjects,
                updateSubject,
                createSubject,
                deleteSubject,
                logAttendance,
                logBulkAttendance,
                getAllAttendance,
                getSubjectAttendance,
                getAttendanceSummary,
                updateAttendanceLog,
                deleteAttendanceLog,
                resetSubjectAttendance
            }}
        >
            {children}
        </SubjectContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSubject = () => useContext(SubjectContext);
