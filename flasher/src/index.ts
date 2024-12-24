const connectButton = document.getElementById("connectButton") as HTMLButtonElement;
const disconnectButton = document.getElementById("disconnectButton") as HTMLButtonElement;
const eraseButton = document.getElementById("eraseButton") as HTMLButtonElement;
const programButton = document.getElementById("programButton");
const lblConnTo = document.getElementById("lblConnTo");
const alertDiv = document.getElementById("alertDiv");
const progressBar = document.getElementById("progressBar");
const progressBarDiv = document.getElementById("progressBarDiv");

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
programButton.style.display = "none";
progressBarDiv.style.display = "none";

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
  programButton.style.display = "initial";
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
  programButton.style.display = "none";
  progressBarDiv.style.display = "none";
  cleanUp();
};
async function parse(file) {
  const reader = new FileReader();
  reader.readAsText(file, 'utf-8');
  return await new Promise((resolve, reject) => {
    reader.onload = function(event) {
      resolve(reader.result)
    }
  })
}

async function urlToBstr(url: string)
{
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(
        `Downlading firmware ${url} failed: ${resp.status}`,
    );
  }

  const reader = new FileReader();
  const blob = await resp.blob();

  return new Promise<string>((resolve) => {
    reader.addEventListener("load", () => resolve(reader.result as string));
    reader.readAsBinaryString(blob);
  });
}

programButton.onclick = async () => {
  // Hide error message
  alertDiv.style.display = "none";

  const fileArray = [];

  const bstr = await urlToBstr("zephyr.bin")
  console.log(bstr.length)
  fileArray.push({ data: bstr, address: 0 });
  console.log(fileArray)
  progressBar.classList.remove("progress-bar-danger");
  progressBar.classList.remove("progress-bar-success");
  progressBarDiv.style.display = null;
  progressBar.textContent = "Flashing..."

  try {
    const flashOptions: FlashOptions = {
      fileArray: fileArray,
      flashSize: "keep",
      eraseAll: false,
      compress: true,
      reportProgress: (fileIndex, written, total) => {
        progressBar.style.width = String((written / total) * 100) + '%';
      },
      calculateMD5Hash: (image) => CryptoJS.MD5(CryptoJS.enc.Latin1.parse(image)),
    } as FlashOptions;
    await esploader.writeFlash(flashOptions);
    progressBar.classList.add("progress-bar-success");
    progressBar.textContent = "Flashing Completed Successfully"
  } catch (e) {
    progressBar.classList.add("progress-bar-danger");
    progressBar.textContent = "Flashing Failed"
    console.error(e);
  }
};
