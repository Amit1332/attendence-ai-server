import { Request, Response } from "express";
import { HTTP_STATUS_CODES } from "@simple-node/http-status-codes";
import { DocumentType } from "@prisma/client";

import catchAsync from "../utils/catchAsync";
import aiService from "../services/ai.service";
import ApiError from "../utils/ApiError";
import { getAISettings, saveAISettings } from "../utils/aiSettings";

const uploadDocument = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(HTTP_STATUS_CODES.BAD_REQUEST, "Please upload a PDF document.");
  }

  const { title, documentType } = req.body;
  if (!title || !documentType) {
    throw new ApiError(HTTP_STATUS_CODES.BAD_REQUEST, "Title and documentType are required.");
  }

  // Validate documentType enum
  if (!Object.values(DocumentType).includes(documentType as any)) {
    throw new ApiError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      `Invalid documentType. Must be one of: ${Object.values(DocumentType).join(", ")}`
    );
  }

  const result = await aiService.uploadDocument(
    req.user!.id,
    title,
    documentType as DocumentType,
    req.file.buffer,
    req.file.originalname
  );

  res.status(HTTP_STATUS_CODES.CREATED).json({
    success: true,
    message: "Document uploaded and indexed successfully.",
    data: result,
  });
});

const askPolicyQuestion = catchAsync(async (req: Request, res: Response) => {
  const { question } = req.body;
  if (!question) {
    throw new ApiError(HTTP_STATUS_CODES.BAD_REQUEST, "Question is required.");
  }

  const answer = await aiService.askPolicyQuestion(question);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: { answer },
  });
});

const askAttendanceQuestion = catchAsync(async (req: Request, res: Response) => {
  const { question } = req.body;
  if (!question) {
    throw new ApiError(HTTP_STATUS_CODES.BAD_REQUEST, "Question is required.");
  }

  const answer = await aiService.askAttendanceQuestion(question, req.user);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: { answer },
  });
});

const saveEmployeeProfile = catchAsync(async (req: Request, res: Response) => {
  const { userId, skills, experience, department } = req.body;
  if (!userId || !skills || !experience || !department) {
    throw new ApiError(
      HTTP_STATUS_CODES.BAD_REQUEST,
      "userId, skills, experience, and department are required."
    );
  }

  const result = await aiService.saveEmployeeProfileEmbedding(userId, {
    skills,
    experience,
    department,
  });

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    message: "Employee semantic profile indexed successfully.",
    data: result,
  });
});

const searchEmployees = catchAsync(async (req: Request, res: Response) => {
  const { query } = req.query;
  if (!query) {
    throw new ApiError(HTTP_STATUS_CODES.BAD_REQUEST, "Search query is required.");
  }

  const managerId = req.user!.role === "MANAGER" ? req.user!.id : undefined;
  const results = await aiService.searchEmployeesSemantically(query as string, managerId);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: results,
  });
});

const getSettings = catchAsync(async (req: Request, res: Response) => {
  const settings = getAISettings();
  
  // Mask API keys for security
  const maskedSettings = {
    provider: settings.provider,
    openaiApiKey: settings.openaiApiKey ? "••••••••••••" : "",
    groqApiKey: settings.groqApiKey ? "••••••••••••" : "",
  };

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: maskedSettings,
  });
});

const saveSettings = catchAsync(async (req: Request, res: Response) => {
  const { provider, openaiApiKey, groqApiKey } = req.body;
  
  if (!provider || !["OPENAI", "GROQ"].includes(provider)) {
    throw new ApiError(HTTP_STATUS_CODES.BAD_REQUEST, "Invalid provider. Must be OPENAI or GROQ.");
  }

  const settingsToSave: any = { provider };
  
  // Only update keys if they are not masked inputs (i.e. did not change)
  if (openaiApiKey !== "••••••••••••") {
    settingsToSave.openaiApiKey = openaiApiKey || "";
  }
  if (groqApiKey !== "••••••••••••") {
    settingsToSave.groqApiKey = groqApiKey || "";
  }

  const result = saveAISettings(settingsToSave);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    message: "AI settings saved successfully.",
    data: {
      provider: result.provider,
      openaiApiKey: result.openaiApiKey ? "••••••••••••" : "",
      groqApiKey: result.groqApiKey ? "••••••••••••" : "",
    },
  });
});

const getDocuments = catchAsync(async (req: Request, res: Response) => {
  const result = await aiService.getDocuments();

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    data: result,
  });
});

const deleteDocument = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    throw new ApiError(HTTP_STATUS_CODES.BAD_REQUEST, "Document ID is required.");
  }

  await aiService.deleteDocument(id as string);

  res.status(HTTP_STATUS_CODES.OK).json({
    success: true,
    message: "Document deleted successfully.",
  });
});

export default {
  uploadDocument,
  getDocuments,
  deleteDocument,
  askPolicyQuestion,
  askAttendanceQuestion,
  saveEmployeeProfile,
  searchEmployees,
  getSettings,
  saveSettings,
};
