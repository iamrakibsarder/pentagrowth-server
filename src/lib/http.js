export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

export function requireAdmin(req, _res, next) {
  if (isAdminRequest(req)) {
    next();
    return;
  }

  throw new HttpError(401, "Admin authentication required.");
}

export function isAdminRequest(req) {
  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return Boolean(process.env.ADMIN_API_TOKEN && token === process.env.ADMIN_API_TOKEN);
}
