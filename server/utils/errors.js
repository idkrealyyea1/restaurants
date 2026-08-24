'use strict';

/**
 * Application error type + centralized Express error handling.
 * Internal details are never leaked to clients in production.
 */

class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.expose = true;
  }
}

function badRequest(message, details) {
  return new AppError(400, 'BAD_REQUEST', message, details);
}
function unauthorized(message = 'Authentication required') {
  return new AppError(401, 'UNAUTHORIZED', message);
}
function forbidden(code = 'FORBIDDEN', message = 'You do not have access to this resource') {
  return new AppError(403, code, message);
}
function notFound(message = 'Not found') {
  return new AppError(404, 'NOT_FOUND', message);
}
function conflict(code, message, details) {
  return new AppError(409, code, message, details);
}
function tooMany(message = 'Too many requests. Please slow down.') {
  return new AppError(429, 'RATE_LIMITED', message);
}

/** Wrap async route handlers so rejections reach the error middleware. */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let code = err.code && typeof err.code === 'string' ? err.code : 'INTERNAL_ERROR';
  let message = err.expose ? err.message : 'Internal server error';
  const details = err.expose ? err.details : undefined;

  if (!err.expose && err.status) status = err.status;

  // Multer upload errors → safe client messages.
  if (err.name === 'MulterError') {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    code = err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR';
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large'
        : err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Unexpected upload field'
          : 'Upload failed';
  }

  // PostgreSQL known errors → safe client messages.
  switch (err.code) {
    case '23505':
      status = 409;
      code = 'DUPLICATE';
      message = 'A record with these values already exists';
      break;
    case '23503':
      status = 400;
      code = 'INVALID_REFERENCE';
      message = 'Referenced record does not exist';
      break;
    case '23514':
      status = 400;
      code = 'CONSTRAINT_VIOLATION';
      message = 'Invalid data for one or more fields';
      break;
    case '22P02':
    case '22007':
    case '23502':
      status = 400;
      code = 'INVALID_DATA';
      message = 'Invalid data format';
      break;
    default:
      break;
  }

  if (status >= 500 || !err.expose) {
    console.error(`[error] ${req.method} ${req.originalUrl} -> ${status}`, err);
  } else {
    console.warn(`[warn] ${req.method} ${req.originalUrl} -> ${status} ${code}`);
  }

  res.status(status).json({
    error: { code, message, ...(details ? { details } : {}) },
  });
}

module.exports = { AppError, badRequest, unauthorized, forbidden, notFound, conflict, tooMany, asyncHandler, notFoundHandler, errorHandler };
