/**
 * @copyright 2026 - present, Heniseeyou, LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 */

import { Router } from 'express';

import { query } from '@/database/db';
import {
  sendBadRequest,
  sendNotFound,
  sendSuccess,
} from '@/utils/response.utils';

interface Greeting {
  id: number;
  name: string;
  created_at: Date;
}

interface GreetingCount {
  total: string;
}

const router = Router();

function getQueryString(value: unknown, fallback: string): string | null {
  if (value === undefined) return fallback;
  return typeof value === 'string' ? value : null;
}

router.get('/', async (req, res) => {
  const rawLimit = getQueryString(req.query.limit, '10');
  const rawPage = getQueryString(req.query.page, '1');
  const rawOffset = getQueryString(req.query.offset, '');
  const search = getQueryString(req.query.search, '');

  if (
    rawLimit === null ||
    rawPage === null ||
    rawOffset === null ||
    search === null
  ) {
    sendBadRequest(res, 'Query parameters must be provided once');
    return;
  }

  const limit = Number(rawLimit);
  const page = Number(rawPage);
  const offset = rawOffset === '' ? (page - 1) * limit : Number(rawOffset);

  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(offset) ||
    offset < 0
  ) {
    sendBadRequest(
      res,
      'limit must be 1-100, page must be positive, and offset non-negative'
    );
    return;
  }

  if (search.length > 200) {
    sendBadRequest(res, 'search must be 200 characters or fewer');
    return;
  }

  const filter = search.trim();
  const countResult = await query<GreetingCount>(
    `SELECT COUNT(*)::text AS total
     FROM greetings
     WHERE ($1 = '' OR name ILIKE '%' || $1 || '%')`,
    [filter]
  );
  const greetings = await query<Greeting>(
    `SELECT id, name, created_at
     FROM greetings
     WHERE ($1 = '' OR name ILIKE '%' || $1 || '%')
     ORDER BY id
     LIMIT $2 OFFSET $3`,
    [filter, limit, offset]
  );

  sendSuccess(res, greetings.rows, 'Greetings retrieved', 200, {
    total: Number(countResult.rows[0]?.total ?? 0),
    limit,
    page,
    offset,
  });
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isSafeInteger(id) || id < 1) {
    sendBadRequest(res, 'id must be a positive integer');
    return;
  }

  const result = await query<Greeting>(
    'SELECT id, name, created_at FROM greetings WHERE id = $1',
    [id]
  );
  const greeting = result.rows[0];

  if (!greeting) {
    sendNotFound(res, `Greeting ${id} not found`);
    return;
  }

  sendSuccess(res, greeting, 'Greeting retrieved');
});

export default router;
