import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSubject } from "../context/SubjectContext.jsx";
import Modal from './Modal.jsx';

export default function CreateWindow({ onClose }) {
    const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm();
    const { createSubject } = useSubject();
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
            ...(values.faculty?.trim() && { faculty: values.faculty.trim() }),
            ...(values.dept && { dept: values.dept }),
            ...(values.credits !== undefined && { credits: values.credits }),
            ...(values.totalClasses !== undefined && { totalClasses: values.totalClasses }),
            ...(values.attendedClasses !== undefined && { attendedClasses: values.attendedClasses })
        };

        try {
            await createSubject(payload);
            onClose();
        } catch (error) {
            setApiError(error.response?.data?.message || "Failed to create subject");
        }
    }

    return (
        <Modal onClose={onClose}>
            <h2 className="modal-title">
                Create Subject
            </h2>
            <form className="create-subject-form" onSubmit={handleSubmit(onSubmit)}>
                <input
                    type="text"
                    placeholder="Subject Name..."
                    {...register("name", {
                        required: "Subject Name is required",
                    })}
                />
                {errors.name && <p className="error-message">{errors.name.message}</p>}

                <input
                    type="number"
                    min="0"
                    placeholder="Initial Total Classes...(Optional, defaults to 0)"
                    {...register("totalClasses", {
                        setValueAs: optionalNumber,
                        validate: (val) => {
                            if (val === undefined) return true;
                            if (!Number.isInteger(val) || val < 0) return "Must be a non-negative integer";
                            if (val > 1000) return "Cannot exceed 1000";
                            return true;
                        }
                    })}
                />
                {errors.totalClasses && <p className="error-message">{errors.totalClasses.message}</p>}

                <input
                    type="number"
                    min="0"
                    placeholder="Initial Attended Classes...(Optional, defaults to 0)"
                    {...register("attendedClasses", {
                        setValueAs: optionalNumber,
                        validate: (val) => {
                            if (val === undefined) return true;
                            if (!Number.isInteger(val) || val < 0) return "Must be a non-negative integer";
                            const total = getValues("totalClasses") ?? 0;
                            if (val > total) return "Attended classes cannot exceed total classes";
                            return true;
                        }
                    })}
                />
                {errors.attendedClasses && <p className="error-message">{errors.attendedClasses.message}</p>}

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

                {isSubmitting ? (
                    <p className="submitting-text">Creating Subject...</p>
                ) : (
                    <div className="modal-actions">
                        <button type="button" className="modal-close-btn" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </button>
                        <button className="submit-create-subject-btn" type='submit' disabled={isSubmitting}>
                            Create Subject
                        </button>
                    </div>
                )}
            </form>
        </Modal>
    );
}
