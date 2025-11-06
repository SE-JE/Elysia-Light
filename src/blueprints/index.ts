export type BlueprintCallable = { new (): { run: () => Promise<void> | void } };



export class BaseBlueprint {

  // =================================>
  // ## List of blueprint to run
  // =================================>
  async run(): Promise<void> {
    await this.call([

    ]);
  }



  // =================================>
  // ## Blueprint Runner
  // =================================>
  private async call(blueprints: BlueprintCallable[]): Promise<void> {
    for (const BPClass of blueprints) {
      const runner = new BPClass();
      if (typeof runner.run === "function") {
        await runner.run();
        console.log(`✅ Successfully Generated ${BPClass.name} Blueprint`);
      } else {
        console.warn(`⚠️ ${BPClass.name} does not have run() method`);
      }
    }
  }
}
