import { Response } from 'express';
import { ApiResponse } from '../types/index.types';

/**
 *
 * @param res
 * @param data
 * @param message
 * @param statusCode
 * @param meta
 * @returns
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message = 'success',
  statusCode = 200,
  meta?: Record<string, unknown>
): Response => {
  const response: ApiResponse<T> = { success: true, message, data };
  if (meta) response.meta = meta;

  return res.status(statusCode).json({
    response,
  });
};

/**
 *
 * @param res
 * @param data
 * @param message
 * @returns
 */
export const sendCreated = <T>(
  res: Response,
  data: T,
  message = 'Created'
): Response => sendSuccess(res, data, message, 201);

/**
 *
 * @param res
 * @param message
 * @param statusCode
 * @param errors
 * @returns
 */
export const sendError = <T>(
  res: Response,
  message: string,
  statusCode = 500,
  errors?: Record<string, string[]>
): Response => {
  const response: ApiResponse<T> = { success: false, message };
  if (errors) response.errors = errors;
  return res.status(statusCode).json(response);
};

/**
 *
 * @param res
 * @param message
 * @returns
 */
export const sendUnauthorized = <T>(
  res: Response,
  message = 'Unauthorized'
): Response => sendError(res, message, 401);

/**
 *
 * @param res
 * @param message
 * @returns
 */
export const sendForbidden = <T>(
  res: Response,
  message = 'Forbidden'
): Response => sendError(res, message, 403);

/**
 *
 * @param res
 * @param message
 * @returns
 */
export const sendNotFound = <T>(
  res: Response,
  message = 'Not Found'
): Response => sendError(res, message, 404);

/**
 *
 * @param res
 * @param message
 * @param errors
 * @returns
 */
export const sendBadRequest = (
  res: Response,
  message = 'Bad Request',
  errors?: Record<string, string[]>
): Response => sendError(res, message, 400, errors);
