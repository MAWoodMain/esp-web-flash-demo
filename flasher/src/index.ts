const connectButton = document.getElementById("connectButton") as HTMLButtonElement;
const disconnectButton = document.getElementById("disconnectButton") as HTMLButtonElement;
const eraseButton = document.getElementById("eraseButton") as HTMLButtonElement;
const programButton = document.getElementById("programButton");
const lblConnTo = document.getElementById("lblConnTo");
const alertDiv = document.getElementById("alertDiv");

const debugLogging = document.getElementById("debugLogging") as HTMLInputElement;

import { ESPLoader, FlashOptions, LoaderOptions, Transport } from "esptool-js";
import { serial } from "web-serial-polyfill";

const serialLib = !navigator.serial && navigator.usb ? serial : navigator.serial;

declare let CryptoJS; // CryptoJS is imported in HTML script

let device = null;
let transport: Transport;
let chip: string = null;
let esploader: ESPLoader;

disconnectButton.style.display = "none";
eraseButton.style.display = "none";

/**
 * The built in Event object.
 * @external Event
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Event}
 */


connectButton.onclick = async () => {
  if (device === null) {
    device = await serialLib.requestPort({});
    transport = new Transport(device, true);
  }

  try {
    const flashOptions = {
      transport,
      baudrate: 115200, /* todo check */
      debugLogging: false,
    } as LoaderOptions;
    esploader = new ESPLoader(flashOptions);

    chip = await esploader.main();

    // Temporarily broken
    // await esploader.flashId();
  } catch (e) {
    console.error(e);
  }

  console.log("Settings done for :" + chip);
  lblConnTo.innerHTML = "Connected to device: " + chip;
  lblConnTo.style.display = "block";
  connectButton.style.display = "none";
  disconnectButton.style.display = "initial";
  eraseButton.style.display = "initial";
};

eraseButton.onclick = async () => {
  eraseButton.disabled = true;
  try {
    await esploader.eraseFlash();
  } catch (e) {
    console.error(e);
  } finally {
    eraseButton.disabled = false;
  }
};

/**
 * Clean devices variables on chip disconnect. Remove stale references if any.
 */
function cleanUp() {
  device = null;
  transport = null;
  chip = null;
}

disconnectButton.onclick = async () => {
  if (transport) await transport.disconnect();

  connectButton.style.display = "initial";
  disconnectButton.style.display = "none";
  eraseButton.style.display = "none";
  lblConnTo.style.display = "none";
  alertDiv.style.display = "none";
  cleanUp();
};

programButton.onclick = async () => {
  // Hide error message
  alertDiv.style.display = "none";

  const fileArray = [];

  const response = await fetch("zephyr.bin")

  fileArray.push({ data: await response.arrayBuffer(), address: 0 });

  try {
    const flashOptions: FlashOptions = {
      fileArray: fileArray,
      flashSize: "keep",
      eraseAll: false,
      compress: true,
      reportProgress: (fileIndex, written, total) => {

        console.log((written / total) * 100);
      },
      calculateMD5Hash: (image) => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)),
    } as FlashOptions;
    await esploader.writeFlash(flashOptions);
  } catch (e) {
    console.error(e);
  }
};
