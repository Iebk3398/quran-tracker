/**
 * @file Routes d'authentification
 * @description Better Auth handler — toutes les routes /api/auth/*
 */
import { Hono } from 'hono'
import { auth } from '../lib/auth.ts'

export const authRoutes = new Hono()

/** Délègue tout à Better Auth */
authRoutes.all('/*', (c) => auth.handler(c.req.raw))
