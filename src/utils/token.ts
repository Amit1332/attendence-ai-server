import jwt from "jsonwebtoken";
import config from "../config/config";

/**
 * Generate a JWT token
 */
export const generateToken = (
  userId: string,
  expiresInMinutesOrDays: number,
  isRefresh: boolean = false
): { token: string; expires: Date } => {
  const payload = {
    sub: userId,
  };
  const secret = config.jwt.secret;

  const expiresIn = isRefresh
    ? `${config.jwt.refreshExpirationDays}d`
    : `${config.jwt.accessExpirationMinutes}m`;

  const token = jwt.sign(payload, secret, { expiresIn: expiresIn as any });

  const ms = isRefresh
    ? config.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000
    : config.jwt.accessExpirationMinutes * 60 * 1000;

  return {
    token,
    expires: new Date(Date.now() + ms),
  };
};

/**
 * Generate access and refresh tokens for a user
 */
export const generateAuthTokens = async (userId: string) => {
  const accessToken = generateToken(userId, config.jwt.accessExpirationMinutes, false);
  const refreshToken = generateToken(userId, config.jwt.refreshExpirationDays, true);

  return {
    access: accessToken,
    refresh: refreshToken,
  };
};
