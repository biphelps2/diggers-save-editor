"use strict";

// Constants.
const originalImageWidth = 640;

// 8 slots per file, 44 bytes each.
const lengthOfFile = 352;
const numBytesPerSlot = 44;

const lengthOfSaveName = 32;
const levelCompletionOffset = 32;
const raceSelectionOffset = 37;
const capitalRaisedOffset = 38;
const availableMoneyOffset = 42;
const numLevels = 34;

const defaultFileBytes = Uint8Array.from(Array(lengthOfFile));

const diggerStatImageUrls = [
    "digger-stats-0.png",
    "digger-stats-1.png",
    "digger-stats-2.png",
    "digger-stats-3.png"
]

const flagOffsets = [
    214, 62, 131, 92, 65, 167, 64, 223, 113, 169, 177, 145, 194, 106, 184, 183,
    131, 219, 223, 222, 243, 154, 267, 122, 308, 86, 364, 76, 343, 140, 278, 191,
    279, 231, 217, 262, 282, 265, 354, 269, 329, 193, 381, 181, 399, 122, 438, 81,
    508, 74, 456, 140, 437, 187, 425, 243, 464, 278, 533, 272, 501, 236, 520, 194,
    542, 145, 573, 58
]

// References to parts of the page.
const map = document.querySelector("#map-template");
const allOriginalAreas = map.querySelectorAll("area");
const checkboxArea = document.querySelector("#checkboxes");

const areaForModifiedMap = document.querySelector("#map-section");

// Create clone of map areas, so we can modify absolute positions when image scales.
const newMap = map.cloneNode(true);
newMap.setAttribute("name", "image-map");
areaForModifiedMap.appendChild(newMap);

const allAreas = newMap.querySelectorAll("area");
const imageContainer = document.querySelector(".image-container");
const minerCheckboxes = document.querySelectorAll(".miner input");
const downloadButton = document.querySelector("#download-file");
const resetButton = document.querySelector("#reset-form");
const minerStatsImage = document.querySelector("#digger-stats-img");
const allTabs = document.querySelectorAll(".tab button");
const fieldCapital = document.querySelector("#fields-money #capital");
const fieldSavings = document.querySelector("#fields-money #savings");
const fileUploadInput = document.querySelector("#level-upload");
const newFileInputs = document.querySelectorAll(".new-file");
const slotNameInput = document.querySelector("#slotname");

// Generate all flag images, absolutely positioned.
for(let i = 0; i < flagOffsets.length; i += 2){
    const theLeft = flagOffsets[i] - 10;
    const theTop = flagOffsets[i + 1] - 21;
    imageContainer.innerHTML += "<img alt=\"\" class=\"flag\" src=\"flag.png\" style=\"left: " + theLeft + "px; top: " + theTop + "px;\">";
}
const flags = imageContainer.querySelectorAll(".flag");

// Generate all checkboxes.
checkboxArea.innerHTML = "";
for(let i = 0; i < allAreas.length; i++){

    const relevantArea = allAreas[i];
    const areaAlt = relevantArea.getAttribute("alt");
    const areaUrl = relevantArea.getAttribute("data-idx"); // todo change to data-idx.

    checkboxArea.innerHTML += "<label><input type=\"checkbox\" name=\"levelcomplete\" value=\"" + areaUrl + "\" />" + areaAlt + "</label>";
}
const allCheckboxes = checkboxArea.querySelectorAll("input");

// Variables.
let currentlySelectedSlot = 0; // 0-7.
let isEditingFile = false;
let originalFileBytes = [];
let modifiedFileBytes = [];

// Event listerns.
downloadButton.addEventListener('click', onDownload);
resetButton.addEventListener('click', onResetChanges);
fieldCapital.addEventListener('change', onCapitalChanged);
fieldSavings.addEventListener('change', onSavingsChanged);

// Set up onChange handlers for all miner checkboxes.
for(let i = 0; i < minerCheckboxes.length; i++){
    minerCheckboxes[i].addEventListener('change', (function() { SetMiner(i) }) );
}

fileUploadInput.addEventListener('input', onUpload);
for(let i = 0; i < newFileInputs.length; i++){
    newFileInputs[i].addEventListener('click', onNew);
}

slotNameInput.addEventListener('change', onSlotNameChange);

for(let i = 0; i < allTabs.length; i++){
    allTabs[i].addEventListener('click', (function () { onChangeTab(i); }));
}

allAreas.forEach(a => {
    a.addEventListener('click', onSelectMapArea);
})

for(let j = 0; j < allCheckboxes.length; j++){
    allCheckboxes[j].addEventListener('change', (function(e) { onLevelCompletionCheckboxChanged(e, j); }));
}

// Functions.
function onChangeTab(n){
    // Update currently selected slot reference.
    currentlySelectedSlot = n;

    // Update selected class.
    for(let i = 0; i < allTabs.length; i++){
        allTabs[i].classList.remove("selected");
    }
    allTabs[n].classList.add("selected");

    // Popualte form.
    if(isEditingFile){
        const byteOffset = numBytesPerSlot * currentlySelectedSlot;
        const bytesForTab = modifiedFileBytes.slice(byteOffset, byteOffset + numBytesPerSlot);

        const titleBytes = bytesForTab.slice(0, lengthOfSaveName);
        let title = "";
        for(let i = 0; i < titleBytes.length; i++){
            if(titleBytes[i] >= 48 && titleBytes[i] <= 90){
                title += String.fromCharCode(titleBytes[i]);
            }
            // Space test.
            else if(titleBytes[i] === 32){
                title += String.fromCharCode(titleBytes[i]);
            }
            else{
                console.log("Non-alphanumeric character found, ending read here.");
                break;
            }
        }

        const levelCompletionBytes = bytesForTab.slice(levelCompletionOffset, levelCompletionOffset + 5);

        for(let i = 0; i < numLevels; i++){
            const byteToUpdate = Math.floor(i / 8);
            const bitToUpdate = i % 8;

            allCheckboxes[i].checked = ((levelCompletionBytes[byteToUpdate] >> bitToUpdate) & 1) === 1;
            allCheckboxes[i].dispatchEvent(new Event('change'));
        }

        document.querySelector("#slotname").value = title;

        console.log ("bytes for tab: ", bytesForTab, modifiedFileBytes);
        let selectedRace = bytesForTab[raceSelectionOffset];
        if(selectedRace < 0){
            selectedRace = 0;
        }
        else if(selectedRace > 3){
            selectedRace = 3;
        }

        console.log("Checkbox: " + selectedRace);
        minerCheckboxes[selectedRace].checked = true;
        SetMiner(selectedRace);

        const capital = bytesForTab[capitalRaisedOffset] + (bytesForTab[capitalRaisedOffset + 1] << 8);
        const savings = bytesForTab[availableMoneyOffset] + (bytesForTab[availableMoneyOffset + 1] << 8);

        fieldCapital.value = capital;
        fieldSavings.value = savings;
    }
}

function onLevelCompletionCheckboxChanged(e, idx){
    // Update the corresponding flag image.
    const newValue = e.target.checked;
    flags[idx].style.display = newValue ? "block" : "none";
}

function onCapitalChanged(_) {
    let value = parseInt(fieldCapital.value);

    // Bound to valid uint16 values.
    if (value < 0) {
        value = 0;
    }
    if (value >= 2 ** 16) {
        value = 2 ** 16 - 1;
    }
    fieldCapital.value = value;

    const b1 = value & 0xff; // less significant
    const b2 = (value >> 8) & 0xff; // more significant

    const byteOffset = numBytesPerSlot * currentlySelectedSlot;

    modifiedFileBytes[byteOffset + capitalRaisedOffset] = b1;
    modifiedFileBytes[byteOffset + capitalRaisedOffset + 1] = b2;
}

function onSavingsChanged(_) {
    let value = parseInt(fieldSavings.value);

    if (value < 0) {
        value = 0;
    }
    if (value >= 2 ** 16) {
        value = 2 ** 16 - 1;
    }
    fieldSavings.value = value;
    const b1 = value & 0xff; // less significant
    const b2 = (value >> 8) & 0xff; // more significant

    const byteOffset = numBytesPerSlot * currentlySelectedSlot;

    modifiedFileBytes[byteOffset + availableMoneyOffset] = b1;
    modifiedFileBytes[byteOffset + availableMoneyOffset + 1] = b2;
}

function SetMiner(idx){
    const byteOffset = numBytesPerSlot * currentlySelectedSlot + raceSelectionOffset;

    minerStatsImage.src = diggerStatImageUrls[idx];
    modifiedFileBytes[byteOffset] = idx;
}

function onResetChanges(_){
    if(isEditingFile){
        modifiedFileBytes = Uint8Array.from(originalFileBytes);

        onChangeTab(0);
    }
}

function onDownload(_){
    if(isEditingFile){
        // https://stackoverflow.com/a/48769059
        // Change resultByte to bytes.
        const blob=new Blob([modifiedFileBytes], {type: "application/octet-stream"});

        // Create temporary element to produce a download.
        const link=document.createElement('a');
        link.href=window.URL.createObjectURL(blob);
        link.download="DIGGERS.DTA";
        link.click();
    }
}

function onSlotNameChange(_) {
    const name = slotNameInput.value;
    const fixed = name.replace(/[^a-zA-Z0-9 ]/g, "").toUpperCase();
    slotNameInput.value = fixed;

    const offsetToUpdate = currentlySelectedSlot * numBytesPerSlot;

    console.log("Setting: " + name);
    // Reset to empty.
    for (let i = 0; i < lengthOfSaveName; i++) {
        modifiedFileBytes[offsetToUpdate + i] = '\0';
        console.log("Resetting byte " + (offsetToUpdate + i));
    }
    // We do - 1 because we always need an end-of-string marker.
    for (let i = 0; i < lengthOfSaveName - 1 && i < fixed.length; i++) {
        modifiedFileBytes[offsetToUpdate + i] = fixed.charCodeAt(i);
        console.log("Setting byte " + (offsetToUpdate + i) + " to" + fixed.charCodeAt(i));
    }
}

function onUpload(e) {

    if(e.target.files.length > 0){
        // https://stackoverflow.com/a/32556944
        const reader = new FileReader();
        reader.onload = function () {

            const arrayBuffer = reader.result;
            if(arrayBuffer.byteLength !== lengthOfFile){
                window.alert("Invalid file: Expected exactly " + lengthOfFile +  " bytes, got " + arrayBuffer.byteLength);
            }
            else{

                originalFileBytes = new Uint8Array(arrayBuffer);
                modifiedFileBytes = Uint8Array.from(originalFileBytes);

                console.log("loaded file. size: " + originalFileBytes.length);

                isEditingFile = true;

                document.querySelector(".all-file-based-content").style.display = "block";
                document.querySelector(".other-actions").style.display = "inline-block";
                document.querySelector("#newfilesection").style.display = "none";

                onChangeTab(0);
            }
        }
        reader.readAsArrayBuffer(e.target.files[0]);
    }
}

function onNew(_){
    originalFileBytes = Uint8Array.from(defaultFileBytes);
    modifiedFileBytes = Uint8Array.from(originalFileBytes);
    isEditingFile = true;

    document.querySelector(".all-file-based-content").style.display = "block";
    document.querySelector(".other-actions").style.display = "inline-block";
    document.querySelector("#newfilesection").style.display = "none";

    onChangeTab(0);
}

function onSelectMapArea(e){
    e.preventDefault();

    const relevantIdx = parseInt(e.target.getAttribute("data-idx") - 1);
    const relevantCheckbox = allCheckboxes[relevantIdx];
    relevantCheckbox.checked = !relevantCheckbox.checked;

    relevantCheckbox.dispatchEvent(new Event('change'));
}

const resizeObserver = new ResizeObserver((e) => {
    if(e[0].contentRect.width === 0){
        console.log("Resize observed width change to 0, for some reason - ignoring.", e);
        return;
    }

    // Note from MDN about coords: the values are numbers of CSS pixels.
    const finalMapScale = e[0].contentRect.width / originalImageWidth;
    console.log("Resize detected. Scaling to: " + finalMapScale);

    for(let i = 0; i < allAreas.length; i++){
        const originalArea = allOriginalAreas[i];
        const newArea = allAreas[i];

        const coordsStr = originalArea.getAttribute("coords");
        const coordsList = coordsStr.split(",");

        for(let j = 0; j < coordsList.length; j++){
            coordsList[j] *= finalMapScale;
        }

        // Now update.
        newArea.setAttribute("coords", coordsList.join(","));
    }

    // And flags need to be scaled too.
    for(let i = 0; i < flagOffsets.length; i += 2){
        const flag = flags[i / 2];

        const flagWidth = 21;
        const flagHeight = 22;

        // 10 and 21 is the origin on the flag image.
        const leftOffset = (flagOffsets[i] - 10) * finalMapScale;
        const topOffset = (flagOffsets[i + 1] - 21) * finalMapScale;
        const width = flagWidth * finalMapScale;
        const height = flagHeight * finalMapScale;

        flag.style.left = leftOffset + "px";
        flag.style.top = topOffset + "px";
        flag.style.width = width + "px";
        flag.style.height = height + "px";
    }
});

resizeObserver.observe(imageContainer);

// Get initial file (browser may have preserved this field value).
fileUploadInput.dispatchEvent(new Event('input'));
