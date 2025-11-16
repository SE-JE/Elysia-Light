import { logger, queue } from "@utils";



// ============================================>
// ## Run of queue workers.
// ============================================>
queue.worker("example", async () => console.log('example queue...'));
logger.start(`Queue is running`)