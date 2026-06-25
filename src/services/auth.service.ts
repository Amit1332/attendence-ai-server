import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { HTTP_STATUS_CODES } from "@simple-node/http-status-codes";

import ApiError from "../utils/ApiError";
import authRepository from "../respositories/auth.repository";
import { ERROR_MESSAGES } from "../constants/messages";
import config from "../config/config";
import { generateAuthTokens } from "../utils/token";
import { JwtPayload } from "../types/jwt";
import { emitStats } from "../utils/socket";

class AuthService {
  /**
   * Register a new user
   */
  async register(userData: any) {
    const existingUser = await authRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new ApiError(
        HTTP_STATUS_CODES.BAD_REQUEST,
        ERROR_MESSAGES.EMAIL_ALREADY_TAKEN
      );
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await authRepository.createUser({
      ...userData,
      password: hashedPassword,
    });

    const tokens = await generateAuthTokens(user.id);
    await authRepository.saveRefreshToken(user.id, tokens.refresh.token);

    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Login with email and password
   */
  async login(credentials: any) {
    const user = await authRepository.findByEmail(credentials.email);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS_CODES.UNAUTHORIZED,
        ERROR_MESSAGES.INCORRECT_CREDENTIALS
      );
    }

    const isPasswordMatched = await bcrypt.compare(
      credentials.password,
      user.password
    );

    if (!isPasswordMatched) {
      throw new ApiError(
        HTTP_STATUS_CODES.UNAUTHORIZED,
        ERROR_MESSAGES.INCORRECT_CREDENTIALS
      );
    }

    await authRepository.updateUser(user.id, {
      isActive: true,
    });
    
    // Update live socket stats
    emitStats().catch(err => console.error("Socket emit stats failed:", err));

    const tokens = await generateAuthTokens(user.id);
    await authRepository.saveRefreshToken(user.id, tokens.refresh.token);

    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      tokens,
    };
  }

  /**
   * Get user profile details
   */
  async getProfile(userId: string) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new ApiError(
        HTTP_STATUS_CODES.NOT_FOUND,
        "User not found"
      );
    }

    const { password, ...userWithoutPassword } = user;

    return userWithoutPassword;
  }

  /**
   * Logout user and invalidate their refresh tokens
   */
  async logout(userId: string) {
    await authRepository.deleteRefreshToken(userId);

    await authRepository.updateUser(userId, {
      isActive: false,
    });

    // Update live socket stats
    emitStats().catch(err => console.error("Socket emit stats failed:", err));

    return true;
  }

  /**
   * Refresh authentication tokens using a refresh token
   */
  async refreshToken(token: string) {
    if (!token) {
      throw new ApiError(
        HTTP_STATUS_CODES.BAD_REQUEST,
        "Refresh token is required"
      );
    }

    const dbToken = await authRepository.findRefreshToken(token);
    if (!dbToken) {
      throw new ApiError(
        HTTP_STATUS_CODES.UNAUTHORIZED,
        "Invalid refresh token"
      );
    }

    try {
      jwt.verify(token, config.jwt.secret) as JwtPayload;

      if (dbToken.expiresAt < new Date()) {
        await authRepository.deleteToken(token);
        throw new ApiError(
          HTTP_STATUS_CODES.UNAUTHORIZED,
          "Refresh token expired"
        );
      }

      const tokens = await generateAuthTokens(dbToken.userId);
      await authRepository.deleteToken(token);
      await authRepository.saveRefreshToken(dbToken.userId, tokens.refresh.token);

      return tokens;
    } catch (error) {
      await authRepository.deleteToken(token);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        HTTP_STATUS_CODES.UNAUTHORIZED,
        "Invalid or expired refresh token"
      );
    }
  }
}

export default new AuthService();