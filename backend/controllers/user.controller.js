import mongoose from "mongoose";
import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import Subject from "../models/subject.model.js";
import Attendance from "../models/attendance.model.js";
import ApiError from "../classes/apiError.class.js";

export const getAllUsers = async (req, res, next) => {
    try {
        if(req.user.role !== "admin") {
            return res.status(401).json({ success:false, message: 'Unauthorized' });
        }

        const userData = await User.find();

        res.status(200).json({ success: true, data: userData});
    } catch(error) {
        next(error);
    }
}

export const getUserByID = async (req, res, next) => {
    try {
        const id = req.params.id;

        const user = await User.findById(id);

        if(!user) {
            return res.status(404).json({ success:false, message: 'User not found' });
        }

        if(user.role === "admin") {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        next(error)
    }
}

export const updateUser = async (req, res, next) => {
    try {
        const id = req.params.id;
        const currUser = req.user;

        if(currUser.role !== "admin" && currUser.id !== id) {
            return res.status(401).json({ success:false, message: 'Unauthorized' });
        }

        const { password } = req.body;

        if(!password) {
            throw new ApiError(400, "Password required");
        }

        const user = await User.findById(id);

        if(!user) {
            throw new ApiError(404, "User not found");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ success: true, data: user });
    } catch(error) {
        next(error);
    }
}

export const deleteUser = async (req, res, next) => {
    try {
        const id = req.params.id;
        const currUser = req.user;

        if(currUser.role !== "admin" && currUser.id !== id) {
            return res.status(401).json({ success:false, message: 'Unauthorized' });
        }

        await Attendance.deleteMany({ user: id });
        await Subject.deleteMany({ user:id });
        await User.findByIdAndDelete(id);

        res.status(200).json({ success: true, message: 'Deleted' });
    } catch (error) {
        next(error);
    }
}

export const getImpData = async (req, res, next) => {
    try {
        const currUser = req.user;
        const reqUser = req.params.id;

        if(reqUser !== currUser.id) {
            return res.status(401).json({ success:false, message: 'Unauthorized' });
        }

        res.status(200).json({ success: true, data: currUser });
    } catch(error) {
        next(error);
    }
}

export const adminResetPassword = async (req, res, next) => {
    try {
        const { userId, name, newPassword, password } = req.body || {};
        const targetId = req.params.id || userId;
        const passwordToSet = newPassword ?? password;

        if (!targetId && (typeof name !== "string" || !name.trim())) {
            throw new ApiError(400, "User ID or username (name) is required");
        }

        if (typeof passwordToSet !== "string" || passwordToSet.length < 5) {
            throw new ApiError(400, "Password is required and must be at least 5 characters");
        }

        let user;
        if (targetId) {
            if (!mongoose.Types.ObjectId.isValid(targetId)) {
                throw new ApiError(400, "Invalid user ID");
            }
            user = await User.findById(targetId);
        } else {
            user = await User.findOne({ name: name.trim() });
        }

        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(passwordToSet, salt);

        user.password = hashedPassword;
        user.tokenVersion += 1;
        await user.save();

        res.status(200).json({
            success: true,
            message: `Password reset successfully for ${user.name}`,
            data: {
                _id: user._id,
                name: user.name,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
}