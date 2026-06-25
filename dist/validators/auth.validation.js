"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.register = void 0;
const zod_1 = require("zod");
exports.register = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z
            .string()
            .min(2, "First name is required"),
        lastName: zod_1.z
            .string()
            .min(2, "Last name is required"),
        email: zod_1.z
            .string()
            .email("Invalid email"),
        password: zod_1.z
            .string()
            .min(8, "Password must be at least 8 characters"),
        role: zod_1.z.enum([
            "ADMIN",
            "MANAGER",
            "STAFF",
        ]),
    }),
});
exports.login = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string(),
    }),
});
