import { Router } from "express";
import {
    adminResetPassword,
    deleteUser,
    getAllUsers,
    getImpData,
    getUserByID,
    updateUser
} from "../controllers/user.controller.js";
import { adminMiddleware } from "../middlewares/auth.middleware.js";

const userRouter = Router();

userRouter.get('/', getAllUsers);

userRouter.put('/admin/reset-password', adminMiddleware, adminResetPassword);

userRouter.put('/:id/reset-password', adminMiddleware, adminResetPassword);

userRouter.get('/imp/:id', getImpData);

userRouter.get('/:id', getUserByID);

userRouter.put('/:id', updateUser);

userRouter.delete('/:id', deleteUser);

export default userRouter;
