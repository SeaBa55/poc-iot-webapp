document.getElementById("copy-button").disabled = true;
var __output;

var ConversionFunctions = {
    // Output the image as a string for 565 displays (horizontally)
    horizontal565: function (data, canvasWidth, canvasHeight){
        var output_string = "";
        var output_index = 0;

        // format is RGBA, so move 4 steps per pixel
        for(var index = 0; index < data.length; index += 4){
            // Get the RGB values
            var r = data[index];
            var g = data[index + 1];
            var b = data[index + 2];
            // calculate the 565 color value
            // r & 248
            // g & 252
            // b & 248
            var rgb = ((r & 0b11111000) << 8) | ((g & 0b11111100) << 3) | ((b & 0b11111000) >> 3);
            // Split up the color value in two bytes
            // var firstByte = (rgb >> 8) & 0xff;
            // var secondByte = rgb & 0xff;

            var byteSet = rgb.toString(16);
            // padding with 0's from left
            while(byteSet.length < 4){ byteSet = "0" + byteSet; }
            output_string += "0x" + byteSet + ", ";

            // add newlines every 16 bytes
            output_index++;
            if(output_index >= 32){
                output_string += "\n";
                output_index = 0;
            }
        }
        return output_string;
    },
    // Output the image as a string for 565 displays (horizontally)
    horizontal565Int: function (data, canvasWidth, canvasHeight){
        var output = new Array;

        // format is RGBA, so move 4 steps per pixel
        for(var index = 0; index < data.length; index += 4){
            // Get the RGB values
            var r = data[index];
            var g = data[index + 1];
            var b = data[index + 2];
            var rgb = ((r & 0b11111000) << 8) | ((g & 0b11111100) << 3) | ((b & 0b11111000) >> 3);
            output.push(rgb);
        }
        return output;
    }
};

// An images collection with helper methods
function Images() {
    var collection = [];
    this.push = function(img, canvas, glyph) {
        collection.push({ "img" : img, "canvas" : canvas, "glyph" : glyph });
    };
    this.remove = function(image) {
        var i = collection.indexOf(image);
        if(i != -1) collection.splice(i, 1);
    };
    this.each = function(f) { collection.forEach(f); };
    this.length = function() { return collection.length; };
    this.first = function() { return collection[0]; };
    this.last = function() { return collection[collection.length - 1]; };
    this.getByIndex = function(index) { return collection[index]; };
    this.setByIndex = function(index, img) { collection[index] = img; };

    // Why cant this be done the same way as remove method? inputs are likely different
    this.get = function(img) {
        if(img) {
            for(var i = 0; i < collection.length; i++) {
                if(collection[i].img == img) {
                    return collection[i];
                }
            }
        }
        return collection;
    };
    this.getByGlyph = function(glyph) {
        if(glyph) {
            for(var i = 0; i < collection.length; i++) {
                if(collection[i].glyph == glyph) {
                    return collection[i];
                }
            }
        }
        return collection;
    };
    return this;
}

// Add events to the file input button
var fileInput = document.getElementById("file-input");
fileInput.addEventListener("click", function(){this.value = null;}, false);
fileInput.addEventListener("change", handleImageSelection, false);

var fileInputColumn = document.getElementById("file-input-column");

// Filetypes accepted by the file picker
var fileTypes = ["jpg", "jpeg", "png", "bmp", "gif", "svg"];

// The canvas we will draw on
var pixelCanvasContainer = document.getElementById("pixel-canvas-container");
// multiple images settings container
var imageSizeSettings = document.getElementById("image-size-settings");
// all images same size button
var allSameSizeButton = document.getElementById("all-same-size");
// error message
var onlyImagesFileError = document.getElementById("only-images-file-error");
// initial message
var noFileSelected = document.getElementById("no-file-selected");
var noImgSelected = document.getElementById("no-img-selected");

var matHeight = document.getElementById("matrix-size-height");
var matWidth = document.getElementById("matrix-size-width");
matHeight.addEventListener("change", handleMatrixSize, false);
matWidth.addEventListener("change", handleMatrixSize, false);

function handleMatrixSize(e) {
    const name = e.target.id == "matrix-size-width" ? "screenWidth" : "screenHeight";
    const val = parseInt(e.target.value);
    settings[name] = val;
}

// The variable to hold our images. Global so we can easily reuse it when the
// user updates the settings (change canvas size, scale, invert, etc)
var images = new Images();

// A bunch of settings used when converting - not defaults
var settings = {
    screenWidth: 32,
    screenHeight: 32,
    scaleToFit: true,
    preserveRatio: true,
    centerHorizontally: false,
    centerVertically: true,
    flipHorizontally: false,
    flipVertically: false,
    backgroundColor: "black",
    scale: "2",
    drawMode: "horizontal",
    threshold: 128,
    // outputFormat: "plain",
    invertColors: false,
    rotate180: false,
    conversionFunction: ConversionFunctions.horizontal565
};

// Variable name, when "arduino code" is required
var identifier = "myBitmap";

function update() {
    images.each(function(image) { place_image(image); });
}

function pixelMatrix(image) {
    const data = image.ctx.getImageData(0, 0, settings.screenWidth, settings.screenHeight).data;
    // get edit pixel canvas element
    const pixelMatrixContainer = document.getElementById("pixel-canvaz");

    let rows = settings.screenHeight;
    let cols = settings.screenWidth;
    let skip = 4;

    for(let i = 0, indexElapsed = 0; i < rows; i++, indexElapsed+=(cols*skip)){
        const pixRow = document.createElement("div");
        pixRow.className = "row";
        pixRow.id = "row-" + i;
        pixRow.style.height = (cols == 64?"14px":"20px");
        pixelMatrixContainer.appendChild(pixRow);

        for (let j = 0, colNum = 0; j < (cols*skip); j+=skip, colNum++) {
            // Get the RGBA values
            const r = data[indexElapsed + j + 0];
            const g = data[indexElapsed + j + 1];
            const b = data[indexElapsed + j + 2];
            const a = data[indexElapsed + j + 3];

            // const pix = document.createElement("div");
            const pix = document.createElement("input");
            pix.className = "pixEl";
            pix.id = "row-" + i + ":col-" + j/skip + ":index-" + (indexElapsed + j);
            pix.type = "color";
            pix.value = rgba2Hex(r, g, b);
            pix.addEventListener("change", watchColorPicker, false);
            pix.style.background = rgba2Hex(r, g, b, a);
            pix.style.color = "white";
            pix.style.height = (cols == 64?"14px":"20px");
            pix.style.width = (cols == 64?"14px":"20px");
            pixRow.appendChild(pix)
        }
    }
}

const watchColorPicker = (event) => {
    event.preventDefault()
    const matIndex = parseInt(event.target.id.split("index-")[1]);
    const newColor = hexToRgb(event.target.value);
    const image = images.getByGlyph(pixelCanvasContainer.children[0].innerHTML);
    const context = image.ctx;
    const imageData = context.getImageData(0, 0, settings.screenWidth, settings.screenHeight);
    const pixData = imageData.data;
    newColor.forEach((color, index) => pixData[matIndex + index] = color);
    context.putImageData(imageData,0,0);
    // Clear info on new selection
    pixelCanvasContainer.childNodes[1].querySelectorAll('*').forEach(n => n.remove());
    pixelMatrix(image);
};

const rgba2Hex = (r, g, b, a) => '#' + [r, g, b, (a?a:"")].map((x) => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
}).join('');

const hexToRgb = (hex) => {
    const bigint = parseInt(hex.replace("#",""), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return [r, g, b];
};

// Easy way to update settings controlled by a textfield
function updateInteger(fieldName){
    settings[fieldName] = document.getElementById(fieldName).value;
    update();
}

// Updates Arduino code check-box
function updateOutputFormat(elm) {
    var caption = document.getElementById("format-caption-container");
    var adafruitGfx = document.getElementById("adafruit-gfx-settings");
    var arduino = document.getElementById("arduino-identifier");

    for(var i = 0; i < caption.children.length; i++) {
        caption.children[i].style.display = "none";
    }
    caption = document.querySelector("div[data-caption='" + elm.value + "']");
    if(caption) caption.style.display = "block";

    elm.value != "plain" ? arduino.style.display = "block" : arduino.style.display = "none";
    elm.value == "adafruit_gfx" ? adafruitGfx.style.display = "block" : adafruitGfx.style.display = "none";

    settings["outputFormat"] = elm.value;
}

function updateDrawMode(elm) {
    var note = document.getElementById("note1bit");
    if(elm.value == "horizontal1bit" || elm.value == "vertical1bit") {
        note.style.display = "block";
    } else {
        note.style.display = "none";
    }

    var conversionFunction = ConversionFunctions[elm.value];
    if(conversionFunction) {
        settings.conversionFunction = conversionFunction;
    }
}

// Make the canvas black and white
function blackAndWhite(canvas, ctx){
    var imageData = ctx.getImageData(0,0,canvas.width, canvas.height);
    var data = imageData.data;
    for (var i = 0; i < data.length; i += 4) {
        var avg = (data[i] + data[i +1] + data[i +2]) / 3;
        avg > settings["threshold"] ? avg = 255 : avg = 0;
        data[i]     = avg; // red
        data[i + 1] = avg; // green
        data[i + 2] = avg; // blue
    }
    ctx.putImageData(imageData, 0, 0);
}

// Invert the colors of the canvas
function invert(canvas, ctx) {
    var imageData = ctx.getImageData(0,0,canvas.width, canvas.height);
    var data = imageData.data;
    for (var i = 0; i < data.length; i += 4) {
        data[i]     = 255 - data[i];     // red
        data[i + 1] = 255 - data[i + 1]; // green
        data[i + 2] = 255 - data[i + 2]; // blue
    }
    ctx.putImageData(imageData, 0, 0);
}

// Draw the image onto the canvas, taking into account color and scaling
function place_image(image){

    var img = image.img;
    var canvas = image.canvas;
    var ctx = canvas.getContext("2d");

    // Create new ctx parameter
    image.ctx = ctx;

    // Invert/change background if needed
    if (settings["backgroundColor"] == "transparent") {
        ctx.fillStyle = "rgba(0,0,0,0.0)";
        ctx.globalCompositeOperation = 'copy';
    } else {
        if (settings["invertColors"]){
            settings["backgroundColor"] == "white" ? ctx.fillStyle = "black" : ctx.fillStyle = "white";
        } else {
            ctx.fillStyle = settings["backgroundColor"];
        }
        ctx.globalCompositeOperation = 'source-over';
    }

    // fill canvas to the image dimentions - Canvas Height and Width are the pixel matrix dimentions
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // rotate
    ctx.setTransform(1, 0, 0, 1, 0, 0); // start with identity matrix transform (no rotation).
    if(settings["rotate180"]){
        // Matrix transformation
        ctx.translate(canvas.width/2.0, canvas.height/2.0);
        ctx.rotate(Math.PI);
        ctx.translate(-canvas.width/2.0, -canvas.height/2.0);
    }

    // Offset used for centering the image when requested
    var offset_x = 0;
    var offset_y = 0;

    switch(settings["scale"]){
        case "1": // Original
            if(settings["centerHorizontally"]){ offset_x = Math.round((canvas.width - img.width) / 2); }
            if(settings["centerVertically"]){ offset_y = Math.round((canvas.height - img.height) / 2); }
            ctx.drawImage(img, 0, 0, img.width, img.height,
                offset_x, offset_y, img.width, img.height);
        break;

        case "2": // Fit (make as large as possible without changing ratio)
            var horRatio = canvas.width / img.width;
            var verRatio =  canvas.height / img.height;
            var useRatio  = Math.min(horRatio, verRatio);

            if(settings["centerHorizontally"]){ offset_x = Math.round((canvas.width - img.width*useRatio) / 2); }
            if(settings["centerVertically"]){ offset_y = Math.round((canvas.height - img.height*useRatio) / 2); }
            ctx.drawImage(img, 0, 0, img.width, img.height,
                offset_x, offset_y, img.width * useRatio, img.height * useRatio);
        break;

        case "3": // Stretch x+y (make as large as possible without keeping ratio)
            ctx.drawImage(img, 0, 0, img.width, img.height,
                offset_x, offset_y, canvas.width, canvas.height);
        break;
        case "4": // Stretch x (make as wide as possible)
            offset_x = 0;
            if(settings["centerVertically"]){ Math.round(offset_y = (canvas.height - img.height) / 2); }
            ctx.drawImage(img, 0, 0, img.width, img.height,
                offset_x, offset_y, canvas.width, img.height);
        break;
        case "5": // Stretch y (make as tall as possible)
            if(settings["centerHorizontally"]){ offset_x = Math.round((canvas.width - img.width) / 2); }
            offset_y = 0;
            ctx.drawImage(img, 0, 0, img.width, img.height,
                offset_x, offset_y, img.width, canvas.height);
        break;
    }

    // Make sure the image is black and white
    if(settings.conversionFunction == ConversionFunctions.horizontal1bit
        || settings.conversionFunction == ConversionFunctions.vertical1bit) {
        blackAndWhite(canvas, ctx);
        if(settings["invertColors"]){
            invert(canvas, ctx);
        }
    }

    // Flip image if needed
    if (settings["flipHorizontally"]) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(canvas, -canvas.width, 0);
        ctx.restore();
    }
    if (settings["flipVertically"]) {
        ctx.save();
        ctx.scale(1, -1);
        ctx.drawImage(canvas, 0, -canvas.height);
        ctx.restore();
    }
}

// Handle text convcersions from pixelMatrix
function handleTextInput(rawData){
    var input = rawData;

    // Convert newlines to comma (helps to remove comments later)
    input = input.replace(/\r\n|\r|\n/g, ",");

    // Convert multiple commas in a row into a single one
    input = input.replace(/[, ]{2,}/g, ",");

    return input;
}

// Handle selecting an image with the file picker
function handleImageSelection(evt){

    var files = evt.target.files;
    onlyImagesFileError.style.display = "none";

    files.length > 0 
        ? noFileSelected.style.display = "none" 
            : noFileSelected.style.display = "block";

    //  stops when f = undefined due to no files at ith index
    for (var i = 0, f; f = files[i]; i++) {

        // Only process image files.
        if(!f.type.match("image.*")) {
            onlyImagesFileError.style.display = "block";
            continue;
        }

        var reader = new FileReader();

        reader.onload = (function(file) {
            return function(e) {
                // Render thumbnail.
                var img = new Image();

                // image data - base 64
                img.src = e.target.result;

                img.onload = function(){
                    //  Initialize canvas for thumbnails
                    var canvas = document.createElement("canvas");

                    // Create File Name List under image upload section, and add remove button
                    const fileInputColumnEntryImg = document.createElement("div");
                    fileInputColumnEntryImg.className = "images-canvas-container";

                    // Create File Name List under image upload section, and add remove button
                    const fileInputColumnEntry = document.createElement("div");
                    fileInputColumnEntry.className = "file-input-entry";

                    const fileInputColumnEntryLabel = document.createElement("span");
                    fileInputColumnEntryLabel.textContent = file.name;

                    const fileInputColumnEntryRemoveButton = document.createElement("button");
                    fileInputColumnEntryRemoveButton.className = "remove-button";
                    fileInputColumnEntryRemoveButton.innerHTML = "remove";

                    // Remove button onClick handler - does this need to be within the loop?
                    const removeButtonOnClick = function() {
                        // get img from collection
                        var image = images.get(img);
                        // remove image from the images collection
                        images.remove(image);
                        // remove image upload list item for the particular image ref - gets reference from the event
                        fileInputColumn.removeChild(fileInputColumnEntry);
                        // if no images left add no files selected display
                        if(images.length() == 0) noFileSelected.style.display = "block";
                        if(image.glyph == pixelCanvasContainer.children[0].innerHTML) pixelCanvasContainer.querySelectorAll('*').forEach(n => n.remove());;
                        if(pixelCanvasContainer.childNodes.length > 0) noImgSelected.style.display = "block";
                        // update();
                    };

                    const selectPixelEdit = function() {
                        // Clear info on new selection
                        pixelCanvasContainer.querySelectorAll('*').forEach(n => n.remove());

                        // get img from collection
                        var image = images.get(img);
                        const pixelCanvasImgName = document.createElement("div");
                        pixelCanvasImgName.className = "pixel-canvas-img-name";
                        pixelCanvasImgName.innerHTML = image.glyph;
                        const pixelCanvas = document.createElement("div");
                        pixelCanvas.className = "pixel-canvas";
                        pixelCanvas.id = "pixel-canvaz";
                        pixelCanvasContainer.appendChild(pixelCanvasImgName);
                        pixelCanvasContainer.appendChild(pixelCanvas);

                        // if no images left add no files selected display
                        if(pixelCanvasContainer.childNodes.length > 0) noImgSelected.style.display = "none";
                        pixelMatrix(image);
                    };

                    // append event listeners to remove button
                    fileInputColumnEntryRemoveButton.onclick = removeButtonOnClick;
                    fileInputColumnEntryImg.onclick = selectPixelEdit;

                    // set canvas and output image dimensions
                    canvas.width = settings.screenWidth;
                    canvas.height = settings.screenHeight;

                    // append image name feild elements to dom
                    fileInputColumnEntry.appendChild(fileInputColumnEntryImg);
                    fileInputColumnEntryImg.appendChild(canvas);
                    fileInputColumnEntry.appendChild(fileInputColumnEntryLabel);
                    fileInputColumnEntry.appendChild(fileInputColumnEntryRemoveButton);
                    fileInputColumn.appendChild(fileInputColumnEntry);

                    images.push(img, canvas, file.name.split(".")[0]);
                    
                    // need to investigate how this works
                    place_image(images.last());
                };
            };
        })(f);

        // read into reader
        reader.readAsDataURL(f);
    }
}

function imageToString(image){
    // extract raw image data
    var ctx = image.ctx;
    var canvas = image.canvas;
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = imageData.data;
    return settings.conversionFunction(data, canvas.width, canvas.height);
}

function imageTo565IntArray(image){
    // extract raw image data
    var ctx = image.ctx;
    var canvas = image.canvas;
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var data = imageData.data;
    return ConversionFunctions.horizontal565Int(data, canvas.width, canvas.height);
}

// Get the custom arduino output variable name, if any
function getIdentifier() {
    var vn = document.getElementById("identifier");
    return vn && vn.value.length ? vn.value : identifier;
}

// Output the image string to the textfield and delimit chunks with new line
function outputString(){

    var output_string = "", code = "";

    images.each(function(image) {
        code = imageToString(image);
        var comment = image.glyph ? ("// '" + image.glyph + "', " + image.canvas.width+"x"+image.canvas.height+"px\n") : "";
        if(image.img != images.first().img) comment = "\n" + comment;
        code = comment + code;
        output_string += code;
    });

    // Trim whitespace from end and remove trailing comma
    output_string = output_string.replace(/,\s*$/g,"");

    document.getElementById("code-output").value = output_string;
    __output = output_string;
    document.getElementById("copy-button").disabled = false;
}

function copyOutput() {
    navigator.clipboard.writeText(__output);
}

function exportOutput() {

    let __Export = new Array
    let code, fileName, dimention;

    images.each(function(image) {
        fileName = image.glyph ? image.glyph : "";
        dimention = image.canvas.width+"x"+image.canvas.height;
        codeArrayInt = imageTo565IntArray(image);
        data = {
            name: fileName,
            size: dimention,
            file: codeArrayInt
        }
        __Export.push(data);
    });

    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(__Export)
    };

    fetch("/api", requestOptions)
    .then((res) => res.json())
    .then(data => {
        console.log(data)
    });
};