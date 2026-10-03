export class AppError extends Error {
  statusCode: number;
  code: string;
  /** Extra machine-readable context sent to the client, e.g. which cart items failed. */
  details?: unknown;

  constructor(message: string, statusCode = 400, code = "ERROR", details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
