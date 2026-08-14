import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { ApiError } from '../common/api-error.js';

interface BodyParserError extends SyntaxError {
  status?: number;
  type?: string;
}

function validationDetails(error: ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'request',
    code: issue.code,
    message: issue.message,
  }));
}

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
    requestId: response.locals.requestId as string,
  });
};

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  if (response.headersSent) {
    _next(error);
    return;
  }

  void _next;
  const requestId = response.locals.requestId as string;

  if (error instanceof ZodError) {
    response.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: validationDetails(error),
      },
      requestId,
    });
    return;
  }

  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      },
      requestId,
    });
    return;
  }

  const parserError = error as BodyParserError;
  if (parserError.type === 'entity.too.large') {
    response.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' },
      requestId,
    });
    return;
  }

  if (parserError.type === 'entity.parse.failed' || parserError.status === 400) {
    response.status(400).json({
      error: { code: 'MALFORMED_JSON', message: 'Request body is not valid JSON' },
      requestId,
    });
    return;
  }

  response.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
    requestId,
  });
};
