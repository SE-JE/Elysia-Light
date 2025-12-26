import { DAMigration } from "@utils"

export default class CreateActivityLogsTable extends DAMigration {
  async up() {
    await this.createTable(
      "activity_logs",
      (table) => {
        table.uuid()
        table.string("feature")
        table.string("action")
        table.uint64("user_id")
        table.json("changes")
        table.dateTime("at")
      },
      {
        engine: "MergeTree",
        orderBy: ["feature", "action", "at"],
        partitionBy: "toYYYYMM(at)",
        ttl: "at + INTERVAL 90 DAY DELETE"
      }
    )
  }

  async down() {
    await this.dropTable("activity_logs")
  }
}
