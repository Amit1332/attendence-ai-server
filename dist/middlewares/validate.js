"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const zod_1 = require("zod");
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const validate = (schema) => {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const message = error.issues
                    .map((issue) => issue.message)
                    .join(", ");
                return next(new ApiError_1.default(400, message));
            }
            next(error);
        }
    };
};
exports.default = validate;
