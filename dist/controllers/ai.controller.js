"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_status_codes_1 = require("@simple-node/http-status-codes");
const client_1 = require("@prisma/client");
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const ai_service_1 = __importDefault(require("../services/ai.service"));
const ApiError_1 = __importDefault(require("../utils/ApiError"));
const aiSettings_1 = require("../utils/aiSettings");
const uploadDocument = (0, catchAsync_1.default)(async (req, res) => {
    if (!req.file) {
        throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.BAD_REQUEST, "Please upload a PDF document.");
    }
    const { title, documentType } = req.body;
    if (!title || !documentType) {
        throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.BAD_REQUEST, "Title and documentType are required.");
    }
    // Validate documentType enum
    if (!Object.values(client_1.DocumentType).includes(documentType)) {
        throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.BAD_REQUEST, `Invalid documentType. Must be one of: ${Object.values(client_1.DocumentType).join(", ")}`);
    }
    const result = await ai_service_1.default.uploadDocument(req.user.id, title, documentType, req.file.buffer, req.file.originalname);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.CREATED).json({
        success: true,
        message: "Document uploaded and indexed successfully.",
        data: result,
    });
});
const askPolicyQuestion = (0, catchAsync_1.default)(async (req, res) => {
    const { question } = req.body;
    if (!question) {
        throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.BAD_REQUEST, "Question is required.");
    }
    const answer = await ai_service_1.default.askPolicyQuestion(question);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        data: { answer },
    });
});
const askAttendanceQuestion = (0, catchAsync_1.default)(async (req, res) => {
    const { question } = req.body;
    if (!question) {
        throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.BAD_REQUEST, "Question is required.");
    }
    const answer = await ai_service_1.default.askAttendanceQuestion(question, req.user);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        data: { answer },
    });
});
const saveEmployeeProfile = (0, catchAsync_1.default)(async (req, res) => {
    const { userId, skills, experience, department } = req.body;
    if (!userId || !skills || !experience || !department) {
        throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.BAD_REQUEST, "userId, skills, experience, and department are required.");
    }
    const result = await ai_service_1.default.saveEmployeeProfileEmbedding(userId, {
        skills,
        experience,
        department,
    });
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        message: "Employee semantic profile indexed successfully.",
        data: result,
    });
});
const searchEmployees = (0, catchAsync_1.default)(async (req, res) => {
    const { query } = req.query;
    if (!query) {
        throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.BAD_REQUEST, "Search query is required.");
    }
    const managerId = req.user.role === "MANAGER" ? req.user.id : undefined;
    const results = await ai_service_1.default.searchEmployeesSemantically(query, managerId);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        data: results,
    });
});
const getSettings = (0, catchAsync_1.default)(async (req, res) => {
    const settings = (0, aiSettings_1.getAISettings)();
    // Mask API keys for security
    const maskedSettings = {
        provider: settings.provider,
        openaiApiKey: settings.openaiApiKey ? "••••••••••••" : "",
        groqApiKey: settings.groqApiKey ? "••••••••••••" : "",
    };
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        data: maskedSettings,
    });
});
const saveSettings = (0, catchAsync_1.default)(async (req, res) => {
    const { provider, openaiApiKey, groqApiKey } = req.body;
    if (!provider || !["OPENAI", "GROQ"].includes(provider)) {
        throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.BAD_REQUEST, "Invalid provider. Must be OPENAI or GROQ.");
    }
    const settingsToSave = { provider };
    // Only update keys if they are not masked inputs (i.e. did not change)
    if (openaiApiKey !== "••••••••••••") {
        settingsToSave.openaiApiKey = openaiApiKey || "";
    }
    if (groqApiKey !== "••••••••••••") {
        settingsToSave.groqApiKey = groqApiKey || "";
    }
    const result = (0, aiSettings_1.saveAISettings)(settingsToSave);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        message: "AI settings saved successfully.",
        data: {
            provider: result.provider,
            openaiApiKey: result.openaiApiKey ? "••••••••••••" : "",
            groqApiKey: result.groqApiKey ? "••••••••••••" : "",
        },
    });
});
const getDocuments = (0, catchAsync_1.default)(async (req, res) => {
    const result = await ai_service_1.default.getDocuments();
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        data: result,
    });
});
const deleteDocument = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new ApiError_1.default(http_status_codes_1.HTTP_STATUS_CODES.BAD_REQUEST, "Document ID is required.");
    }
    await ai_service_1.default.deleteDocument(id);
    res.status(http_status_codes_1.HTTP_STATUS_CODES.OK).json({
        success: true,
        message: "Document deleted successfully.",
    });
});
exports.default = {
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
