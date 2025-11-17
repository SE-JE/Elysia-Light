import { cron, logger } from "@utils";
import "./index"


// ============================================>
// ## Run of cron job worker.
// ============================================>
cron.worker();
logger.start(`All cron job workers is running!`)