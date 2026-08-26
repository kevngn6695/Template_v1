// Index of Migration Error
export const PG_ERROR_CODE = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  UNDEFINED_TABLE: '42P01',
  UNDEFINED_COLUMN: '42703',
  DUPLICATE_TABLE: '42P07',
  DUPLICATE_COLUMN: '42701',
  INSUFFICIENT_PRIVILEGE: '42501',
  SERIALIZATION_FAILURE: '40001',
  DEADLOCK_DETECTED: '40P01',
  ADMIN_SHUTDOWN: '57P01',
  CANNOT_CONNECT_NOW: '57P03',
  INVALID_PASSWORD: '28P01',
} as const;

export type PgErrorCode = (typeof PG_ERROR_CODE)[keyof typeof PG_ERROR_CODE];

export interface PgError extends Error {
  code: string;
  detail?: string;
  constraint?: string;
  table?: string;
  column?: string;
  schema?: string;
  routine?: string;
}

export class AppError extends Error {
  readonly code: string;
  readonly cause?: unknown;

  constructor(
    message: string,
    options: { code?: string; cause?: unknown } = {}
  ) {
    super(message);
    this.name = new.target.name;
    this.code = options.code ?? 'APP_ERROR';
    this.cause = options.cause;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }
}

/** Anything that went wrong talking to Postgres. */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    options: { code?: string; cause?: unknown } = {}
  ) {
    super(message, {
      code: options.code ?? 'DATABASE_ERROR',
      cause: options.cause,
    });
  }
}

export class MigrationError extends AppError {
  readonly migration: string;
  readonly direction: 'up' | 'down';

  constructor(
    migration: string,
    direction: 'up' | 'down',
    option: { cause?: unknown } = {}
  ) {
    super(`Migration "${migration}" failed while running ${direction}`, {
      code: 'MIGRATION_FAILED',
      cause: option.cause,
    });

    this.migration = migration;
    this.direction = direction;
  }
}

export class MigrationLockError extends AppError {
  constructor(message: string, option: { cause?: unknown } = {}) {
    super(message, { code: 'MIGRATION_LOCKED', cause: option.cause });
  }
}

export function isPgError(err: unknown): err is PgError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code?: unknown }).code === 'string'
  );
}

export function isPgErrorCode(err: unknown, ...codes: string[]): boolean {
  return isPgError(err) && codes.includes(err.code);
}

export const isUniqueViolation = (err: unknown): boolean =>
  isPgErrorCode(err, PG_ERROR_CODE.UNIQUE_VIOLATION);

export const isCheckViolation = (err: unknown): boolean =>
  isPgErrorCode(err, PG_ERROR_CODE.CHECK_VIOLATION);

export const isNotNullViolation = (err: unknown): boolean =>
  isPgErrorCode(err, PG_ERROR_CODE.NOT_NULL_VIOLATION);

export const isForeignKeyViolation = (err: unknown): boolean =>
  isPgErrorCode(err, PG_ERROR_CODE.FOREIGN_KEY_VIOLATION);

export const isUndefinedTable = (err: unknown): boolean =>
  isPgErrorCode(err, PG_ERROR_CODE.UNDEFINED_TABLE);

export function isRetryableError(err: unknown): boolean {
  if (
    isPgErrorCode(
      err,
      PG_ERROR_CODE.SERIALIZATION_FAILURE,
      PG_ERROR_CODE.DEADLOCK_DETECTED
    )
  ) {
    return true;
  }
  if (
    isPgErrorCode(
      err,
      PG_ERROR_CODE.ADMIN_SHUTDOWN,
      PG_ERROR_CODE.CANNOT_CONNECT_NOW
    )
  ) {
    return true;
  }
  // Socket-level failures while the database is starting or failing over.
  return isPgErrorCode(
    err,
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'ENOTFOUND'
  );
}

export function describePgError(err: unknown): string {
  if (!isPgError(err)) return 'Unknown database error';

  const where = err.constraint ?? err.table ?? 'the database';

  switch (err.code) {
    case PG_ERROR_CODE.UNIQUE_VIOLATION:
      return `That value already exists (${where})`;
    case PG_ERROR_CODE.FOREIGN_KEY_VIOLATION:
      return `Referenced row does not exist (${where})`;
    case PG_ERROR_CODE.NOT_NULL_VIOLATION:
      return `${err.column ?? 'A required field'} cannot be null`;
    case PG_ERROR_CODE.CHECK_VIOLATION:
      return `Value failed a check constraint (${where})`;
    case PG_ERROR_CODE.UNDEFINED_TABLE:
      return 'Table does not exist — are migrations up to date?';
    case PG_ERROR_CODE.INSUFFICIENT_PRIVILEGE:
      return 'The database user lacks the required privilege';
    case PG_ERROR_CODE.INVALID_PASSWORD:
      return 'Authentication failed — check DB_USER and DB_PASSWORD';
    default:
      return err.message;
  }
}

export function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (typeof value === 'string') return new Error(value);

  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

export function serializeError(
  value: unknown,
  depth = 3
): Record<string, unknown> {
  const err = toError(value);

  const serialized: Record<string, unknown> = {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };

  if (err instanceof AppError) {
    serialized.code = err.code;
  }

  if (err instanceof MigrationError) {
    serialized.migration = err.migration;
    serialized.direction = err.direction;
  }

  if (isPgError(err)) {
    serialized.pg = {
      code: err.code,
      detail: err.detail,
      constraint: err.constraint,
      table: err.table,
      column: err.column,
      routine: err.routine,
    };
    serialized.explanation = describePgError(err);
  }

  const cause = (err as { cause?: unknown }).cause;
  if (cause !== undefined && depth > 0) {
    serialized.cause = serializeError(cause, depth - 1);
  }

  return serialized;
}
