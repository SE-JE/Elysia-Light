import { auth, queue } from "@utils"

export const activityLogQueueWorker = () => {
  queue.worker("auth:revalidate-permission", async (payload) => {
      const userId = payload?.userId

      await auth.revalidateUserPermissions(userId)
    }
  )
}