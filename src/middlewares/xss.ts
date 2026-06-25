import { Request, Response, NextFunction } from "express";

const sanitize = (text: string): string => {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

const sanitizeObject = (obj: any): any => {
  if (!obj || typeof obj !== "object") return obj;

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const val = obj[key];
      if (typeof val === "string") {
        obj[key] = sanitize(val);
      } else if (typeof val === "object") {
        sanitizeObject(val);
      }
    }
  }
  return obj;
};

export const xssClean = (req: Request, res: Response, next: NextFunction) => {
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
