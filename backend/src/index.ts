import { env, isLocalMode } from "./config/env.js";
import { createApp } from "./app.js";
import { logger } from "./utils/logger.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`[backend] http://localhost:${env.PORT} (localMode=${isLocalMode()})`);
  logger.info(`API lista en puerto ${env.PORT}`, { localMode: isLocalMode() });
  if (isLocalMode()) {
    logger.info("Modo local activo: sin Supabase, sesión automática y datos en memoria.");
  }
});
