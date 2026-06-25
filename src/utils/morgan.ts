import morgan, { TokenIndexer } from "morgan";
import { Request, Response } from "express";
import config from "../config/config";

// Custom Morgan Token
morgan.token(
  "message",
  (req: Request, res: Response): string => {
    return res.locals.errorMessage || "";
  }
);

const getIpFormat = (): string => {
  return config.env === "production" ? ":remote-addr - " : "";
};

const successResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms`;

const errorResponseFormat = `${getIpFormat()}:method :url :status - :response-time ms - message: :message`;

const successHandler = morgan(successResponseFormat, {
  skip: (_req: Request, res: Response): boolean => res.statusCode >= 400,

  stream: {
    write: (message: string): void => {
      console.log(message.trim());
    },
  },
});

const errorHandler = morgan(errorResponseFormat, {
  skip: (_req: Request, res: Response): boolean => res.statusCode < 400,

  stream: {
    write: (message: string): void => {
      console.log(message.trim());
    },
  },
});

export default {
  successHandler,
  errorHandler,
};