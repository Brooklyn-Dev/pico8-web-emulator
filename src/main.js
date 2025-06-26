import { loadP8PNG } from "./cartridge";

async function start() {
  const cartridge = await loadP8PNG("/assets/celeste.p8.png");
  console.log("Loaded cartridge:", cartridge);
}

start();
