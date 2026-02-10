import { logger, queue } from "@utils";
import { activityLogQueueWorker } from "./activity-log.queue.worker";
import { accessLogQueueWorker } from "./access-log.queue.worker";
import { errorLogQueueWorker } from "./error-log.queue.worker";
import { notificationQueueWorker } from "./notification.queue.worker";



// ============================================>
// ## Run of queue workers.
// ============================================>
queue.worker("example", async (payload, id) => {
    logger.queue(`Start queue ${id}`)

    if (Math.random() < 0.5) {
        logger.queueError(`Queue ${id} intentionally failed`)
        throw new Error(`Random failure for job ${id}`)
    }

    const wait = () => new Promise((resolve) =>
        setTimeout(() => {
            logger.queue("Queue payload date:" + payload?.date)
            resolve("")
        }, 5000)
    )
    
    await wait()

    logger.queue(`Finish queue ${id}`)
});

activityLogQueueWorker()
accessLogQueueWorker()
errorLogQueueWorker()
notificationQueueWorker()


logger.start(`Queue job workers is running!`)