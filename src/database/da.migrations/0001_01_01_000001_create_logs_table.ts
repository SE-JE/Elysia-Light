import { DAMigration } from "@utils"

export default class CreateAccessLogsTable extends DAMigration {
  async up() { 
    await this.createTable("access_logs",(table) => {
      table.uuid()
      table.string("method")
      table.string("path")
      table.int32("status")
      table.int32("latency")
      table.string("ip")
      table.string("agent")
      table.dateTime("at")
    }, {
      engine: "MergeTree",
      orderBy: ["at"],
      partitionBy: "toYYYYMM(at)",
      ttl: "at + INTERVAL 30 DAY DELETE"
    })

    await this.createTable("error_logs",(table) => {
      table.uuid()
      table.string("service")
      table.string("key")
      table.string("feature")
      table.string("error")
      table.string("reference")
      table.dateTime("at")
    }, {
      engine: "MergeTree",
      orderBy: ["at"],
      partitionBy: "toYYYYMM(at)",
      ttl: "at + INTERVAL 30 DAY DELETE"
    })
  }

  async down() { 
    await this.dropTable("access_logs")
    await this.dropTable("error_logs")
  }
}
