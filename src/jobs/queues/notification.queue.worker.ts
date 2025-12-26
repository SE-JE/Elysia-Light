import { queue, notification, NotificationPayload, NotificationCancelPayload } from '@utils'

export const notificationQueueWorker = () => {
  queue.worker("notifications", async (payload) => {
      if (payload?.type != "cancel") {
        notification.send(payload as NotificationPayload)
      } else {
        notification.cancel(payload as NotificationCancelPayload)
      }
  }, { concurrency: 1, interval: 50 })
}
