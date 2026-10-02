'use strict';
/**
 * @copyright 2026 - present, Heniseeyou, LLC
 * @license Apache-2.0
 * @author Hiep Nguyen
 *
 */

import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    httpMethod: req.method,
    message: 'GET /auth/ ',
  });
});

router.post('/', (req, res) => {
  res.status(200).json({
    httpMethod: req.method,
    message: 'POST /auth/',
  });
});

router.put('/', (req, res) => {
  res.status(200).json({
    httpMethod: req.method,
    message: 'PUT /auth/',
  });
});

router.delete('/', (req, res) => {
  res.status(200).json({
    httpMethod: req.method,
    message: 'DELETE /auth/',
  });
});

export default router;
