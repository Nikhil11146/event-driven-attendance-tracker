import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name required'],
        trim: true
    },
    faculty: {
        type: String,
        trim: true
    },
    dept: {
        type: String,
        enum: ['CSE', 'ECE', 'MECH', 'CIVIL', 'CHEM', 'BIOTECH', 'PE', 'Others']
    },
    credits: {
        type: Number,
        min: [0, 'Minimum: 0']
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'userId is required'],
    }

}, {
    timestamps: true
})

const Subject = mongoose.model('Subject', subjectSchema);

export default Subject;