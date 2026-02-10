import { cron } from "@utils";



// ============================================>
// ## List of cron jobs.
// ============================================>
// eslint-disable-next-line no-console
cron.add("1 * * * *", () => console.log('example cron job...'), 'example');