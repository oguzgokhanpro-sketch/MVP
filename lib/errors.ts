export class AppError extends Error {
  constructor(
    readonly status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, "UNAUTHORIZED", message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(403, "FORBIDDEN", message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(404, "NOT_FOUND", message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(409, "CONFLICT", message);
  }
}

export class LastAdminError extends ConflictError {
  constructor() {
    super("An organization must keep at least one active admin");
    this.code = "LAST_ADMIN";
  }
}
