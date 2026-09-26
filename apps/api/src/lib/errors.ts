export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'The request could not be processed.', details?: unknown) {
    super(400, 'BAD_REQUEST', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'You need to sign in to continue.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You don't have permission to access this page.") {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "We couldn't find what you were looking for.") {
    super(404, 'NOT_FOUND', message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'That action conflicts with existing data.', details?: unknown) {
    super(409, 'CONFLICT', message, details);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many attempts. Please wait a moment and try again.') {
    super(429, 'RATE_LIMITED', message);
  }
}