import rateLimit from "express-rate-limit";

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Hay demasiadas solicitudes. Esperá un momento y volvé a intentar.", code: "RATE_LIMIT" },
});

export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "El asistente recibió demasiadas solicitudes. Esperá un momento.", code: "RATE_LIMIT" },
});

export const generateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Estamos generando varios CV. Esperá un momento y reintentá.", code: "RATE_LIMIT" },
});
