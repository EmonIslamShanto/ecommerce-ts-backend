import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import ErrorHandler from "../utils/utility-class.js";
import { ControllerType } from "../types/types.js";

export const errorMiddleware: ErrorRequestHandler = async (
    err: ErrorHandler,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    if (err.name === "CastError") {
        res.status(400).json({
            success: false,
            message: "Invalid ID",
        });
    } else {
        res.status(statusCode).json({
            success: false,
            message,
        });
    }
};

export const TryCatch = (func: ControllerType) =>
    (req: Request, res: Response, next: NextFunction):Promise<any> => {
        return Promise.resolve(func(req, res, next)).catch(next);
    };

