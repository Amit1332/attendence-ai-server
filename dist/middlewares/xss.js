"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.xssClean = void 0;
const sanitize = (text) => {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;");
};
const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== "object")
        return obj;
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const val = obj[key];
            if (typeof val === "string") {
                obj[key] = sanitize(val);
            }
            else if (typeof val === "object") {
                sanitizeObject(val);
            }
        }
    }
    return obj;
};
const xssClean = (req, res, next) => {
    if (req.body) {
        sanitizeObject(req.body);
    }
    if (req.query) {
        // In Express 5, req.query is a getter-only property. 
        // Mutating the nested properties of req.query is safe, whereas reassigning req.query throws a TypeError.
        sanitizeObject(req.query);
    }
    if (req.params) {
        // Mutate nested properties of req.params safely.
        sanitizeObject(req.params);
    }
    next();
};
exports.xssClean = xssClean;
