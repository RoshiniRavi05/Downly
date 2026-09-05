import app from './app';
import { CONFIG } from './config/index';

// Start server locally
app.listen(CONFIG.PORT, () => {
  console.log(`🚀 Downly API server running on port ${CONFIG.PORT} (${CONFIG.NODE_ENV} mode)`);
});
