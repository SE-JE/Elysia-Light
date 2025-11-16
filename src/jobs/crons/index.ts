import { cron } from "@utils";



// ============================================>
// ## List of cron jobs.
// ============================================>
cron.add("1 * * * *", () => console.log('example cron job...'), 'example');