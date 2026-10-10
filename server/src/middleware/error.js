import { ApiError } from '../utils/apiError.js';
import { fail } from '../utils/apiResponse.js';

export function notFoundHandler(req, res) {
  return fail(res, 404, `Route not found: ${req.method} ${req.originalUrl}`);
}

// Centralized error handler — must have 4 args for Express to treat it as error middleware
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return fail(res, err.statusCode, err.message, err.details);
  }
  console.error('Unhandled error:', err);
  return fail(res, 500, 'Internal server error');
}