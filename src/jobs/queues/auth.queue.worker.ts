import { Auth, queue } from "@utils"

export const activityLogQueueWorker = () => {
  queue.worker("auth:revalidate-permission", async (payload) => {
      const userId = payload?.userId

      await Auth.revalidateUserPermissions(userId)
    }
  )
}