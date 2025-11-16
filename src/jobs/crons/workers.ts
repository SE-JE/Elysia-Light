import { cron, logger } from "@utils";
import "./index"


// ============================================>
// ## Run of cron job worker.
// ============================================>
cron.worker();
logger.start(`Cron job is running`)