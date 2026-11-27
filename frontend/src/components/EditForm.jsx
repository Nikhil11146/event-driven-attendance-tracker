import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSubject } from "../context/SubjectContext.jsx";

export default function EditFunction({ setIsEditing, subjectDetails, onUpdated }) {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        defaultValues: {
            name: subjectDetails.name || "",
            faculty: subjectDetails.faculty || "",
            credits: subjectDetails.credits ?? "",
            dept: subjectDetails.dept || ""
        }
    });

    const { updateSubject } = useSubject();
    const [apiError, setApiError] = useState(null);

    const optionalNumber = (value) => {
        if (value === "" || value === null || value === undefined) return undefined;
        const parsed = Number(value);
        return Number.isNaN(parsed) ? undefined : parsed;
    };

    async function onSubmit(values) {
        setApiError(null);
        const payload = {
            name: values.name.trim(),
            faculty: values.faculty?.trim() || "",
            dept: values.dept || undefined,
            ...(values.credits !== undefined && { credits: values.credits })
        };

        try {
            const updated = await updateSubject(payload, subjectDetails._id);
            if (onUpdated && updated) {
                onUpdated(updated);
            }
            setIsEditing(false);
        } catch (error) {
            setApiError(error.response?.data?.message || "Failed to update subject");
        }
    }

    return (
        <div className="editing-form-container">
            <h1>Edit Subject</h1>
            <p className="edit-helper-note">
                Attendance counts are derived from event logs. Use the Calendar & Logs view to add, edit, or remove attendance entries.
            </p>
            <form className="editing-form-input" onSubmit={handleSubmit(onSubmit)}>
                <input
                    type="text"
                    placeholder="Subject Name..."
                    {...register("name", {
                        required: "Subject Name is required",
                    })}
                />
                {errors.name && <p className="error-message">{errors.name.message}</p>}

                <input
                    type="text"
                    placeholder="Faculty Name...(Optional)"
                    {...register("faculty")}
                />

                <input
                    type="number"
                    min="0"
                    placeholder="Credits...(Optional)"
                    {...register("credits", {
                        setValueAs: optionalNumber,
                        validate: (val) => val === undefined || val >= 0 || "Minimum: 0"
                    })}
                />
                {errors.credits && <p className="error-message">{errors.credits.message}</p>}

                <select {...register("dept", { setValueAs: value => value || undefined })}>
                    <option value="">Select Department..(Optional)</option>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="MECH">MECH</option>
                    <option value="CIVIL">CIVIL</option>
                    <option value="BIOTECH">BIOTECH</option>
                    <option value="CHEM">CHEM</option>
                    <option value="PE">PE</option>
                    <option value="Others">Others</option>
                </select>

                {apiError && <p className="error-message">{apiError}</p>}

                <button className="submit-create-subject-btn" type='submit' disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Save Changes"}
                </button>
                <button type='button' className="close-editing" disabled={isSubmitting} onClick={() => setIsEditing(false)}>
                    Discard
                </button>
            </form>
        </div>
    );
}
