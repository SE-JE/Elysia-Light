import { queue } from "@utils";

export async function ExampleNotification(roleId: number, payload: Record<string,any>) {
  await queue.add('notification', { roleId, payload })
}