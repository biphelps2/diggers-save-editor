
let map = document.querySelector("#map-template");
let allOriginalAreas = map.querySelectorAll("area");
let checkboxArea = document.querySelector("#checkboxes");

let areaForModifiedMap = document.querySelector("#map-section");

let newMap = map.cloneNode(true);
newMap.setAttribute("name", "image-map");
let allAreas = newMap.querySelectorAll("area");
let image = document.querySelector("img#diggers-map")

let imageContainer = document.querySelector(".image-container");

let minerCheckboxes = document.querySelectorAll(".miner input");

let downloadButton = document.querySelector("#download-file");
downloadButton.onclick = onDownload;
let resetButton = document.querySelector("#reset-form");
resetButton.onclick = onResetChanges;

areaForModifiedMap.appendChild(newMap);

let originalImageWidth = 640;
let originalImageHeight = 350;

const lengthOfFile = 352;
const numSlots = 8;
const numBytesPerSlot = 44;

const lengthOfSaveName = 32; // 0
const lengthOfLevelCompletionBytes = 5; // 32
const raceSelectionOffset = 37; // 37
const capitalRaisedOffset = 38;
const availableMoneyOffset = 42;
const numLevels = 34;

let currentlySelectedSlot = 0; // 0-7.


var defaultFileBytes = Uint8Array.from(Array(lengthOfFile));
console.log("Default:", defaultFileBytes);

var allTabs = document.querySelectorAll(".tab button");
function onTab(n){
    currentlySelectedSlot = n;

    for(var i = 0; i < allTabs.length; i++){
        allTabs[i].classList.remove("selected");
    }

    allTabs[n].classList.add("selected");

    populateForm();
}

function populateForm(){
    if(!isEditingFile){
        console.log("Not editing a file yet.");
        return;
    }

    console.log("Populating form. slot: " + currentlySelectedSlot);

    var currentTab = currentlySelectedSlot;
    var byteOffset = numBytesPerSlot * currentTab;
    var bytesForTab = modifiedFileBytes.slice(byteOffset, byteOffset + numBytesPerSlot);

    var titleBytes = bytesForTab.slice(0, lengthOfSaveName);
    var title = "";
    for(var i = 0; i < titleBytes.length; i++){
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

    var levelCompletionBytes = bytesForTab.slice(32, lengthOfSaveName + 5);

    for(var i = 0; i < numLevels; i++){
        var byteToUpdate = Math.floor(i / 8);
        // 0 1 2 3 4 5 6
        var bitToUpdate = i % 8;

        allCheckboxes[i].checked = ((levelCompletionBytes[byteToUpdate] >> bitToUpdate) & 1) === 1;
        allCheckboxes[i].dispatchEvent(new Event('change'));
    }

    console.log("title:", title, numLevels);
    document.querySelector("#slotname").value = title;

    console.log ("bytes for tab: ", bytesForTab, modifiedFileBytes);
    var selectedRace = bytesForTab[raceSelectionOffset];
    if(selectedRace < 0){
        selectedRace = 0;
    }
    else if(selectedRace > 3){
        selectedRace = 3;
    }
    console.log("Checkbox: " + selectedRace);
    minerCheckboxes[selectedRace].checked = true;
    SetMiner(selectedRace);

    var capital = bytesForTab[capitalRaisedOffset] + (bytesForTab[capitalRaisedOffset + 1] << 8);
    var savings = bytesForTab[availableMoneyOffset] + (bytesForTab[availableMoneyOffset + 1] << 8);

    document.querySelector("#fields-money #capital").value = capital;
    document.querySelector("#fields-money #savings").value = savings;
}

var minerStatsImage = document.querySelector("#digger-stats-img");

document.querySelector("#fields-money #capital").onchange = (e) => {
    var value = parseInt(document.querySelector("#fields-money #capital").value);

    if(value < 0){
        value = 0;
    }
    if(value >= 2**16){
        value = 2**16 - 1;
    }
    document.querySelector("#fields-money #capital").value = value;

    var b1 = value & 0xff; // less significant
    var b2 = (value >> 8) & 0xff; // more significant

    var byteOffset = numBytesPerSlot * currentlySelectedSlot;

    modifiedFileBytes[byteOffset + capitalRaisedOffset] = b1;
    modifiedFileBytes[byteOffset + capitalRaisedOffset + 1] = b2;

    console.log("Saving to offset " + byteOffset + ", values:", [b1, b2], e.target.value);
}

document.querySelector("#fields-money #savings").onchange = (e) => {
    var value = parseInt(document.querySelector("#fields-money #savings").value);

    if(value < 0){
        value = 0;
    }
    if(value >= 2**16){
        value = 2**16 - 1;
    }
    document.querySelector("#fields-money #savings").value = value;
    var b1 = value & 0xff; // less significant
    var b2 = (value >> 8) & 0xff; // more significant

    var byteOffset = numBytesPerSlot * currentlySelectedSlot;

    modifiedFileBytes[byteOffset + availableMoneyOffset] = b1;
    modifiedFileBytes[byteOffset + availableMoneyOffset + 1] = b2;
}


var diggerStatImageUrls = [
    "digger-stats-0.png",
    "digger-stats-1.png",
    "digger-stats-2.png",
    "digger-stats-3.png"
]

for(var i = 0; i < minerCheckboxes.length; i++){
    (function (idx){
        minerCheckboxes[idx].onchange = (e) =>{
            console.log("Picked checkbox " + idx);
            SetMiner(idx);
        }
    })(i);
}

function SetMiner(idx){

    minerStatsImage.src = diggerStatImageUrls[idx];

    var byteOffset = numBytesPerSlot * currentlySelectedSlot + raceSelectionOffset;
    modifiedFileBytes[byteOffset] = idx;
}

var isEditingFile = false;
let originalFileBytes = [];
let modifiedFileBytes = [];

function onResetChanges(e){
    if(isEditingFile){
        modifiedFileBytes = Uint8Array.from(originalFileBytes);

        onTab(0);
    }
}

function onDownload(e){
    if(isEditingFile){
        // https://stackoverflow.com/a/48769059
        console.log("Attempting to download.");

        // Gather values from form and update modifiedFileBytes.

        // change resultByte to bytes
        var blob=new Blob([modifiedFileBytes], {type: "application/octet-stream"});

        var link=document.createElement('a');
        link.href=window.URL.createObjectURL(blob);
        link.download="DIGGERS.DTA";
        link.click();
    }
}

let slotNameInput = document.querySelector("#slotname");
slotNameInput.onchange = (e) =>{
    var name = slotNameInput.value;
    var fixed = name.replace(/[^a-zA-Z0-9 ]/g, "").toUpperCase();
    slotNameInput.value = fixed;

    var offsetToUpdate = currentlySelectedSlot * numBytesPerSlot;

    console.log("Setting: " + name);
    // Reset to empty.
    for(var i = 0; i < lengthOfSaveName; i++){
        modifiedFileBytes[offsetToUpdate + i] = '\0';
        console.log("Resetting byte " + (offsetToUpdate + i));
    }
    // We do - 1 because we always need an end-of-string marker.
    for(var i =0; i < lengthOfSaveName - 1 && i < fixed.length; i++){
        modifiedFileBytes[offsetToUpdate + i] = fixed.charCodeAt(i);
        console.log("Setting byte " + (offsetToUpdate + i) + " to" + fixed.charCodeAt(i));
    }

};

let fileUploadInput = document.querySelector("#level-upload");
fileUploadInput.oninput = onUpload;

var newFileInputs = document.querySelectorAll(".new-file");
for(var i = 0; i < newFileInputs.length; i++){
    newFileInputs[i].onclick = onNew;
}

function onUpload(e) {

    if(e.target.files.length > 0){
        // https://stackoverflow.com/a/32556944
        var reader = new FileReader();
        reader.onload = function () {

            var arrayBuffer = reader.result;

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

                onTab(0);
            }
        }
        reader.readAsArrayBuffer(e.target.files[0]);
    }
}

function onNew(e){
    originalFileBytes = Uint8Array.from(defaultFileBytes);
    modifiedFileBytes = Uint8Array.from(originalFileBytes);
    isEditingFile = true;

    document.querySelector(".all-file-based-content").style.display = "block";
    document.querySelector(".other-actions").style.display = "inline-block";
    document.querySelector("#newfilesection").style.display = "none";

    onTab(0);
}

// Get initial file.
fileUploadInput.dispatchEvent(new Event('input'));

let flagOffsets = [
    214, 62, 131, 92, 65, 167, 64, 223, 113, 169, 177, 145, 194, 106, 184, 183,
    131, 219, 223, 222, 243, 154, 267, 122, 308, 86, 364, 76, 343, 140, 278, 191,
    279, 231, 217, 262, 282, 265, 354, 269, 329, 193, 381, 181, 399, 122, 438, 81,
    508, 74, 456, 140, 437, 187, 425, 243, 464, 278, 533, 272, 501, 236, 520, 194,
    542, 145, 573, 58
]

checkboxArea.innerHTML = "";
for(var i = 0; i < allAreas.length; i++){

    let relevantArea = allAreas[i];
    let areaAlt = relevantArea.getAttribute("alt");
    let areaUrl = relevantArea.getAttribute("data-idx"); // todo change to data-idx.

    checkboxArea.innerHTML += "<label><input type=\"checkbox\" name=\"levelcomplete\" value=\"" + areaUrl + "\" />" + areaAlt + "</label>";
}

allAreas.forEach(a => {
    a.onclick = (e) =>{
        e.preventDefault();

        var relevantIdx = parseInt(a.getAttribute("data-idx") - 1);

        var relevantCheckbox = allCheckboxes[relevantIdx];
        relevantCheckbox.checked = !relevantCheckbox.checked;

        relevantCheckbox.dispatchEvent(new Event('change'));
    }
})

for(var i = 0; i < flagOffsets.length; i += 2){
    var theLeft = flagOffsets[i] - 10;
    var theTop = flagOffsets[i + 1] - 21;
    imageContainer.innerHTML += "<img class=\"flag\" src=\"flag.png\" style=\"left: " + theLeft + "px; top: " + theTop + "px;\">";
}
var flags = imageContainer.querySelectorAll(".flag");

function onResize(wwidth){

    let finalMapScale = wwidth / originalImageWidth;
    console.log("Resize detected. Scaling to: " + finalMapScale);

    for(var i = 0; i < allAreas.length; i++){
        var originalArea = allOriginalAreas[i];
        var newArea = allAreas[i];

        let coordsStr = originalArea.getAttribute("coords");
        let coordsList = coordsStr.split(",");

        for(var j = 0; j < coordsList.length; j++){
            coordsList[j] *= finalMapScale;
        }

        // Now update.
        newArea.setAttribute("coords", coordsList.join(","));
    }

    // And flags need to be scaled too.
    for(var i = 0; i < flagOffsets.length; i += 2){
        var flag = flags[i / 2];

        let flagWidth = 21;
        let flagHeight = 22;

        // 10 and 21 is the origin on the flag image.
        var leftOffset = (flagOffsets[i] - 10) * finalMapScale;
        var topOffset = (flagOffsets[i + 1] - 21) * finalMapScale;
        var width = flagWidth * finalMapScale;
        var height = flagHeight * finalMapScale;

        flag.style.left = leftOffset + "px";
        flag.style.top = topOffset + "px";
        flag.style.width = width + "px";
        flag.style.height = height + "px";
    }
}

const resizeObserver =new ResizeObserver((e) => {

    if(e[0].contentRect.width === 0){
        console.log("0 for some reason.", e);
        return;
    }

    // Note from MDN about coords:
    // The values are numbers of CSS pixels.
    // So we can probably set to floats, but whole numbers makes more sense.
    onResize(e[0].contentRect.width);
});

resizeObserver.observe(imageContainer);

var allCheckboxes = checkboxArea.querySelectorAll("input");

for(var j = 0; j < allCheckboxes.length; j++){
    let closureJ = j;
    allCheckboxes[j].onchange = (e) => {
        var newValue = e.target.checked;
        flags[closureJ].style.display = newValue ? "block" : "none";
    }
}
