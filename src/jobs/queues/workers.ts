import { logger, queue } from "@utils";



// ============================================>
// ## Run of queue workers.
// ============================================>
queue.worker("example", async (payload, id) => {
    console.log(`Start job ${id}`)

    if (Math.random() < 0.5) {
        console.log(`Job ${id} intentionally failed`)
        throw new Error(`Random failure for job ${id}`)
    }

    const wait = () => new Promise((resolve) =>
        setTimeout(() => {
            console.log("Payload date:", payload?.date)
            resolve("")
        }, 5000)
    )
    
    await wait()

    console.log(`Finish job ${id}`)
});



logger.start(`Queue job workers is running!`)