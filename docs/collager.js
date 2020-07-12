// query elements of the DOM only after they've loaded (avoids receiving undefined values)
document.addEventListener('DOMContentLoaded', (event) => {

let COMPONENT_SIZE = 40;

let UPLOADED_TILE_SIZE = 40;

let TILING_FACTOR = 2;

// 8.5 million pixels 
// (a round number above 4900 tiles with tile resolution 40x40px, which is known to work)
const MAX_PIX_TO_DRAW = 8500000;

// this may not be useful but we shall see - 20k
const MAX_TILES = 20000;

let numFiles = null;

let tiles_dict = null;

// Draws in Tiles if no such HTML element alreay exists in the document
function writeTilesTitle() {

  let checkTilesTitle = document.getElementById('tilesTitle');

  // undefined is a falsy value in JS
  if (!checkTilesTitle) {
    let tilesTitle = document.createElement('h4')
    tilesTitle.setAttribute('id', 'tilesTitle')
    let tilesText = document.createTextNode('Tiles:')
    tilesTitle.appendChild(tilesText)
    let canvasHolder = document.getElementById('tileCanvasHolder')
    document.body.insertBefore(tilesTitle, canvasHolder)
  }
}

// Controls final mosaic thumbnail display size (but not actual image size in pixels)
function setCanvasSizeToImg(canvas, img) {

  canvas.width = Math.floor(img.shape[1] / 2);
  canvas.height = Math.floor(img.shape[0] / 2);
}

// @param img - Ndarray (from NumJS) for a mosaic tile
// @return 3-element array - an RGB color vector for the input image
function get_average_color(img) {
  let R = nj.mean(img.slice(null, null,[0,1]));
  // console.log('R channel average is ' + R.toString());
  let B = nj.mean(img.slice(null, null, [1,2]));
  // console.log('B channel average is ' + B.toString());
  let G = nj.mean(img.slice(null, null, [2,3]));
  // console.log('G channel average is ' + G.toString());

  return [R, B, G];
}

// follows get_components() in load_components.py
// @return cropped image as a NumJS array, with actual resolution to be used in
// the mosaic, but a large size in order to display for the user
function cropTile(img) {

  let input_width = img.shape[1];
  let input_height = img.shape[0];

  let crop_margin = Math.abs(input_height - input_width);

  let left_crop = Math.floor(crop_margin / 2)

  let right_crop;

  if ((crop_margin % 2) !== 0) {
    right_crop = left_crop + 1;
  } else {
    right_crop = left_crop;
  }

  // console.log("Right crop is " + right_crop.toString());

  let cropped_tile = img;

  if (right_crop !== 0) {
    if (input_height > input_width) {
      cropped_tile = img.slice([left_crop, -right_crop]);
    } else {
      cropped_tile = img.slice(null, [left_crop, -right_crop]);
    }
  }

  // console.log('Cropped to '+ cropped_tile.shape.toString());
  cropped_tile = nj.images.resize(cropped_tile, UPLOADED_TILE_SIZE, UPLOADED_TILE_SIZE);

  console.log("Final cropped shape is " + cropped_tile.shape.toString());

  return cropped_tile;            
}

function addUploadMosaicTargetButton() {

  const targetInput = document.getElementById('targetInput');
  targetInput.addEventListener('change', makeMosaic);

  let targetSpan = document.getElementById('targetSpan')
  targetSpan.addEventListener('click', function () {
    targetInput.click()
  });

  let checkTargetUploadButton = document.getElementById('targetUploadButton')

  checkTargetUploadButton.setAttribute('style', 'display: none;')  
  /* next line called to create delay so that animation triggers when fadeIn 
   * class is added back to the button (https://css-tricks.com/restart-css-animation/)
   */
  void checkTargetUploadButton.offsetWidth;
  checkTargetUploadButton.setAttribute('style', 'display: default;')  
}

function clearCanvasHolder() {
  const canvasHolder = document.getElementById('tileCanvasHolder')
  while (canvasHolder.firstChild) {
    canvasHolder.removeChild(canvasHolder.lastChild);
  }

  // removes targetUploadButton so that it can't be clicked before all
  // tile files are loaded
  const targetUploadButton = document.getElementById('targetUploadButton')
  if (targetUploadButton) {
    targetUploadButton.setAttribute('style', 'display: none;')
  }
}

function uploadTiles() {
  
  UPLOADED_TILE_SIZE = COMPONENT_SIZE

  // every time the input button is clicked, previously uploaded files are not
  // accessible --> remove those thumbnails from the DOM so that their absence
  // is clearly communicated
  clearCanvasHolder()

  const fileList = this.files;
  numFiles = fileList.length;

  // console.log('num files is now ' + numFiles.toString())

  // making tiles_dict proper size to handle all uploaded images, and ensuring
  // indexing fits number of files currently uploaded
  tiles_dict = new Array(numFiles)

  // array of images to use as tiles - additional tiles appended along 1st dim
  let tiles = nj.zeros([numFiles,UPLOADED_TILE_SIZE,UPLOADED_TILE_SIZE,3])

  writeTilesTitle();  

  for (let img_num = 0; img_num < numFiles; img_num++) {

    let $img = new Image();    

    $img.src = URL.createObjectURL(fileList[img_num]);
    // $img.src = 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Gull_portrait_ca_usa.jpg'

    let canvas_holder = document.getElementById('tileCanvasHolder');

    let cropped_canvas = document.createElement('CANVAS');
    
    cropped_canvas.setAttribute('class', 'tileImage');
    cropped_canvas.classList.add('fadeIn');

    // this MUST be an anonymous function because otherwise NumJS runs into a
    // canvas error (https://github.com/pa7/heatmap.js/issues/284)

    $img.onload = function() {

      canvas_holder.appendChild(cropped_canvas);

      URL.revokeObjectURL(this.src);

      let img = nj.images.read($img);

      let cropped_tile = cropTile(img);

      // this size does not affect actual tile resolution
      cropped_canvas.width = cropped_canvas.height = 120;

      nj.images.save(cropped_tile, cropped_canvas);

      let avg_color = get_average_color(cropped_tile);

      tiles_dict[img_num] = {'tile_color': avg_color, 'tile_img': cropped_tile}

      // checking whether this is the last image to load
      if (img_num == (numFiles - 1)) {
        // alert('thumbnails loaded')
        // after displaying tile thumbnails --> display button to upload mosaic target
        addUploadMosaicTargetButton();
      }

    };
    console.log('Uploaded tile number: ' + img_num.toString() + ' of ' + numFiles.toString());
  }
}

/* @param targetSegment - image array (in NumJS) segment of target image that
 * will be replaced with tile that has nearest average color
 *
 * @return a NumJS image array from tiles_dict that has nearest average color
 * to that of targetSegment
 */
function getNearestTile(targetSegment) {

  let target_seg_color = get_average_color(targetSegment)

  // get distance between all 3-channel vectors in the tiles_dict
  let distances = new Object();

  let euclidean_distance = (accumulator, color_component, index) => accumulator + 
    Math.pow((color_component - target_seg_color[index]), 2);

  for (var i = 0; i < tiles_dict.length; i++) {
    // initial value passed to reduce is 0
    distances[i] = tiles_dict[i]['tile_color'].reduce(euclidean_distance, 0)
  }

  /* return tile image that has smallest distance to input 3-channel vector
   * determine which tile has minimum distance, then return it
   */
  let get_argmin = (acc, curr_dist, index, array) => (curr_dist < array[acc]) ? index : acc;
  let index_of_nearest_tile = Object.values(distances).reduce(get_argmin, 0)

  let nearest_tile_obj = tiles_dict[index_of_nearest_tile];
  // tiles may not exist if this call is interrupted by click to upload new tiles
  if (!nearest_tile_obj) {
    return nj.zeros([UPLOADED_TILE_SIZE, UPLOADED_TILE_SIZE,4])
  } else {
    return nearest_tile_obj['tile_img'];
  }
}

function addLoadingBar() {

  let centeringDiv = document.createElement('DIV')
  centeringDiv.classList.add('centeringDiv')

  // Setting class so that bar can be removed later (rather than passing 
  // the HTML object through the necessary functions)
  centeringDiv.classList.add('barContainer')

  let container = document.createElement('DIV')
  centeringDiv.appendChild(container)

  // setting LoadingBar.js attributes (must be done before calling new ldBar)
  container.classList.add('centeringDiv')
  container.setAttribute('style', 'display: inline-block; width: 500px; height: 20px;')
  

  let bar = new ldBar(container, 
    {'value': 0,
     'preset': 'line',
     'precision': '0.1'
    })

  document.body.appendChild(centeringDiv)

  return bar
}

function removeLoadingBar() {
  // get loading bar container to then remove it
  let loadingBarContainerListHead = document.getElementsByClassName('barContainer')[0];
  
  if (loadingBarContainerListHead) {
    document.body.removeChild(loadingBarContainerListHead)
  }
}

function removeAllLoadingBars() {
  // get loading bar container to then remove it
  let loadingBarContainerList = document.getElementsByClassName('barContainer');
  // removing elements updates length field immediately -> need to save original length
  let len = loadingBarContainerList.length;
  
  for (let i = 0; i < len; i++) {
    console.log('removing bar ' + i.toString())
    // list is re-indexed after each removal
    document.body.removeChild(loadingBarContainerList[0])
  }
}

function addLoadingMessage() {
  let msg = document.createElement('SPAN')
  msg.classList.add('comic')
  msg.textContent = 'Displaying mosaic soon (please hold)...'

  let msgDiv = document.createElement('DIV')
  msgDiv.classList.add('centeringDiv')
  msgDiv.classList.add('loadingMsg')
  msgDiv.appendChild(msg)
 
  document.body.appendChild(msgDiv)
}

function removeLoadingMessage() {
  let msgListHead = document.getElementsByClassName('loadingMsg')[0];
  if (msgListHead) {
    document.body.removeChild(msgListHead)
  }
}

function displayMosaic(mosaic) {

  removeLoadingBar();
  addLoadingMessage();

  /* timeout used to trigger drawing of loading message (which is an important
   * msg because the whole window freezes while knitting the mosaic)
   */
  setTimeout(function() {
    const knit_rows = (growing_mosaic, next_row) => {
    // console.log('growing shape is ' + growing_mosaic.shape.toString())
    // console.log('next row shape is ' + next_row.shape.toString())

    // this concatenation is along axis 0 (height)
    return nj.concatenate(growing_mosaic.transpose(2,1,0), next_row.transpose(2,1,0)).transpose(2,1,0);
    }

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
    final_mosaic = mosaic.reduce(knit_rows)

    let mosaic_canvas_holder = document.createElement('DIV');
    mosaic_canvas_holder.classList.add('mosaicCanvasHolder')

    let mosaic_canvas = document.createElement('CANVAS');
    
    mosaic_canvas.classList.add('fadeIn', 'tileImage');

    setCanvasSizeToImg(mosaic_canvas, final_mosaic);

    nj.images.save(final_mosaic, mosaic_canvas)

    mosaic_canvas_holder.appendChild(mosaic_canvas);

    removeLoadingMessage();

    // display final mosaic image
    document.body.appendChild(mosaic_canvas_holder)

    showDownloadLink(mosaic_canvas);

    encourageAnotherMosaic();
  }, 0)
} 

/* Decrease resolution of target image so that output mosaic has a reasonable
 * resolution and reasonable number of tiles (both below the max values set
 * as global variables at the top of this file)
 */
function resizeTarget(numJSTarget, fileAPITarget) {
  console.log('The original shape[0] : shape[1] ratio is:')
  console.log('1 : ' + numJSTarget.shape[0]/numJSTarget.shape[1].toString()) 

  let resized_target = numJSTarget

  console.log('The input target was ' + fileAPITarget.size.toString() + ' bytes')
  let height_in_tiles = Math.floor(TILING_FACTOR * resized_target.shape[0] / UPLOADED_TILE_SIZE)
  let width_in_tiles = Math.floor(TILING_FACTOR * resized_target.shape[1] / UPLOADED_TILE_SIZE)
  let total_tiles_to_draw = height_in_tiles * width_in_tiles
  console.log('Initial total tiles to draw is ' + total_tiles_to_draw.toString())
  let total_pix = total_tiles_to_draw * UPLOADED_TILE_SIZE * UPLOADED_TILE_SIZE
  console.log('Initial total pixels to draw is ' + total_pix.toString())

  // resizing based on a maximum number of pixels

  let num_tiles_set_by_max_pix = MAX_PIX_TO_DRAW / (UPLOADED_TILE_SIZE * UPLOADED_TILE_SIZE)

  let resize_ratio_pix = 1;
  if (total_pix > MAX_PIX_TO_DRAW) {

    resize_ratio_pix = Math.sqrt(num_tiles_set_by_max_pix / total_tiles_to_draw);
    resized_target = nj.images.resize(resized_target, 
      Math.floor(resized_target.shape[0] * resize_ratio_pix), 
      Math.floor(resized_target.shape[1] * resize_ratio_pix));
  }

  // resizing based on a maximum number of tiles
  let resize_ratio_tiles = 1;
  height_in_tiles = Math.floor(TILING_FACTOR * resized_target.shape[0] / UPLOADED_TILE_SIZE);
  width_in_tiles = Math.floor(TILING_FACTOR * resized_target.shape[1] / UPLOADED_TILE_SIZE);
  total_tiles_to_draw = height_in_tiles * width_in_tiles;
  total_pix = total_tiles_to_draw * UPLOADED_TILE_SIZE * UPLOADED_TILE_SIZE;
  
  // halfway check
  console.log('At this point I could draw ' + total_tiles_to_draw.toString() 
    + ' tiles and ' + total_pix.toString() + ' pixels');
  
  if (total_tiles_to_draw > MAX_TILES) {
    resize_ratio_tiles = Math.sqrt(MAX_TILES / total_tiles_to_draw);

    resized_target = nj.images.resize(resized_target,
      Math.floor(resized_target.shape[0] * resize_ratio_tiles),
      Math.floor(resized_target.shape[1] * resize_ratio_tiles));
  }

  console.log('The new shape[0] : shape[1] ratio is:')
  console.log('1 : ' + resized_target.shape[0]/resized_target.shape[1].toString())
  return resized_target
}

function makeMosaic() {

  let targetUpload = this.files[0];

  let target_img = new Image()
  target_img.src = URL.createObjectURL(targetUpload)

  let loadingBar = addLoadingBar();

  target_img.onload = function() {
    
    let target_arr = nj.images.read(target_img)

    target_arr = resizeTarget(target_arr, targetUpload)

    let height_in_tiles = Math.floor(TILING_FACTOR * target_arr.shape[0] / UPLOADED_TILE_SIZE)

    let width_in_tiles = Math.floor(TILING_FACTOR * target_arr.shape[1] / UPLOADED_TILE_SIZE)

    let total_tiles_to_draw = height_in_tiles * width_in_tiles
    let total_pix = total_tiles_to_draw * UPLOADED_TILE_SIZE * UPLOADED_TILE_SIZE
    console.log('But I have actually decided to draw ' + total_tiles_to_draw.toString() + ' tiles')
    console.log('and therefore ' + total_pix.toString() + ' pixels')

    // alert('output should have tile height ' + height_in_tiles.toString() + ' and tile width ' + width_in_tiles.toString())

    let stride_on_target = Math.round(UPLOADED_TILE_SIZE / TILING_FACTOR)

    /* since updating NumJS arrays has to be done on individual pixels,
     * use stacking instead (construct each row on-the-go, instead of up front)
     */

    let mosaic = new Array();

    let i = 0;  
    let j = 0;
    let tiles_drawn = 0;
    let progressTracker = 0;

    // (function buildMosaic(){}); emulates a pair of nested for-loops (i incremented in outer loop)
    //    --> written this way to allow for visible DOM updates to the progress bar
    (function buildMosaic() {

      let target_segment = target_arr.slice(
        [i*stride_on_target, (i+1)*stride_on_target],
        [j*stride_on_target, (j+1)*stride_on_target],
        null)

      let nearest_tile = getNearestTile(target_segment)
      tiles_drawn++;
      let percent_loaded = tiles_drawn / total_tiles_to_draw * 100;

      // update progress bar
      if (percent_loaded > progressTracker) {
        progressTracker = percent_loaded;
        loadingBar.set(percent_loaded, false)
      }

      // constructing mosaic
      if ((mosaic.length - 1) < i) {
        mosaic.push(nearest_tile);
      } else {
        // console.log('mosaic shape is ' + mosaic[i].shape.toString())
        // console.log('nearest tile shape is ' + nearest_tile.shape.toString())
        // this concatenation is along axis 1 (width)
        mosaic[i] = nj.concatenate(mosaic[i].transpose(0,2,1), nearest_tile.transpose(0,2,1)).transpose(0,2,1)
      }

      j++;
      if (j < width_in_tiles) {
        setTimeout(buildMosaic, 0);
      } else {
        i++;
        if (i < height_in_tiles) {
          j = 0;
          setTimeout(buildMosaic, 0)
        } else {
          displayMosaic(mosaic)
        }
      }
    })();

  }
}

function showDownloadLink(canvas) {
  let link = document.createElement('A');
  link.setAttribute('download', 'mosaic.png')
  link.setAttribute('href', canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));
  
  document.body.appendChild(link)

  let mosaicDownloadButton = document.createElement('DIV')
  mosaicDownloadButton.classList.add('centeringDiv', 'slowFade', 'bottomSpace')

  let downloadSpan = document.createElement('SPAN')
  downloadSpan.classList.add('tileButton')

  let buttonButton = document.createElement('BUTTON')
  buttonButton.setAttribute('style', 'cursor: pointer;')
  buttonButton.setAttribute('type', 'button')

  let buttonText = document.createTextNode('click here to download the mosaic above')

  downloadSpan.addEventListener('click', function () {
    link.click()
  });

  buttonButton.appendChild(buttonText)
  downloadSpan.appendChild(buttonButton)
  mosaicDownloadButton.appendChild(downloadSpan)

  document.body.appendChild(mosaicDownloadButton)
}

// changes text in target-upload button, and makes the button blink
function encourageAnotherMosaic() {
  let button = document.getElementById('targetButtonButton')
  button.textContent = 'click here to upload another image to make into a mosaic'
  
  // this is time in milliseconds
  let blink_duration = 300

  // blink the button 3 times
  button.classList.add('active')
  setTimeout(function () {
    button.classList.remove('active');
    setTimeout(function() {
      button.classList.add('active');
      setTimeout(function() {
        button.classList.remove('active');
        setTimeout(function() {
          button.classList.add('active');
          setTimeout(function() {
            button.classList.remove('active')
          }, blink_duration)
        }, blink_duration)
      }, blink_duration)
    }, blink_duration)
  }, blink_duration)
}

const tileButton = document.getElementsByClassName("tileButton")[0];
const tileInput = document.getElementById('tileInput');

tileButton.addEventListener('click', function () {
  removeAllLoadingBars();
  tileInput.click();
});

// change event fires when file is selected (enter is pressed / Open is clicked)
tileInput.addEventListener('change', uploadTiles);

const resolutionInput = document.getElementsByClassName('resolutionInput')[0];
const tilingFactorInput = document.getElementsByClassName('tilingFactorInput')[0];

function updateResolution() {
  if (resolutionInput.value > 0 && resolutionInput.value < 10000) {
    COMPONENT_SIZE = resolutionInput.value;
  } else {
    resolutionInput.value = 40;
    COMPONENT_SIZE = 40;
    updateResolutionText();
    alert('Tile resolution must be a positive number less than 10,000.');
  }
}

function updateTilingFactor() {
  if (tilingFactorInput.value > 0) {
    TILING_FACTOR = tilingFactorInput.value
  } else {
    tilingFactorInput.value = 2;
    TILING_FACTOR = 2;
    alert('Tiling factor must be a positive number.')
  }
}

function updateResolutionText() {
  let text = document.getElementById('resolutionNum')
  text.textContent = resolutionInput.value
}

resolutionInput.addEventListener('change', updateResolution)

tilingFactorInput.addEventListener('change', updateTilingFactor)

// input event fires whenever the value in the box changes (updates "live")
resolutionInput.addEventListener('input', updateResolutionText)
})
