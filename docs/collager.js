// query elements of the DOM only after they've loaded (avoids receiving undefined values)
document.addEventListener('DOMContentLoaded', (event) => {

const COMPONENT_SIZE = 40;

const TILING_FACTOR = 5;

let numFiles = null;

let tiles_dict = null;

// size of largest image dimension
const size = 300;

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

// Controls tile thumbnail display size (but not actual image size in pixels)
function setCanvasSizeToImg(canvas, img) {

  canvas.width = Math.floor(img.shape[1] / 2);
  canvas.height = Math.floor(img.shape[0] / 2);
  // size canvas larger than image so that tiles are easy for user to see
  // canvas.width = 120
  // canvas.height = 120

}


// @param: img - Ndarray (from NumJS) for a mosaic tile
// @return: 3-element array - an RGB color vector for the input image
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

  cropped_tile = nj.images.resize(cropped_tile, COMPONENT_SIZE, COMPONENT_SIZE);

  console.log("Final image shape is " + cropped_tile.shape.toString());

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
  let tiles = nj.zeros([numFiles,COMPONENT_SIZE,COMPONENT_SIZE,3])

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

    console.log('processed image number: ' + img_num.toString());
  }

};

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

  // return tile image that has smallest distance to input 3-channel vector
    // determine which tile has minimum distance, then return it

  let get_argmin = (acc, curr_dist, index, array) => (curr_dist < array[acc]) ? index : acc;
  // console.log('distances are ')
  // console.log(Object.values(distances))
  let index_of_nearest_tile = Object.values(distances).reduce(get_argmin, 0)
  // console.log('index of nearest tile is ' + index_of_nearest_tile.toString())

  return tiles_dict[index_of_nearest_tile]['tile_img'];

}

function makeMosaic() {

  const targetUpload = this.files[0];

  let target_img = new Image()
  target_img.src = URL.createObjectURL(targetUpload)

  target_img.onload = function() {
    
    let target_arr = nj.images.read(target_img)

    let height_in_tiles = Math.floor(TILING_FACTOR * target_arr.shape[0] / COMPONENT_SIZE)

    let width_in_tiles = Math.floor(TILING_FACTOR * target_arr.shape[1] / COMPONENT_SIZE)

    // alert('output should have tile height ' + height_in_tiles.toString() + ' and tile width ' + width_in_tiles.toString())

    let stride_on_target = Math.round(COMPONENT_SIZE / TILING_FACTOR)

    // since updating NumJS arrays has to be done on individual pixels,
    // use stacking instead

    let mosaic = new Array();

    for (var i = 0; i < height_in_tiles; i++) {
      for (var j = 0; j < width_in_tiles; j++) {
        
        let target_segment = target_arr.slice(
            [i*stride_on_target, (i+1)*stride_on_target],
            [j*stride_on_target, (j+1)*stride_on_target],
            null)

        let nearest_tile = getNearestTile(target_segment)

        // checking whether an entry exists for mosaic[i]
        if ((mosaic.length - 1) < i) {

          mosaic.push(nearest_tile);
        } else {
          // console.log('mosaic shape is ' + mosaic[i].shape.toString())
          // console.log('nearest tile shape is ' + nearest_tile.shape.toString())
          // this concatenation is along axis 1 (width)
          mosaic[i] = nj.concatenate(mosaic[i].transpose(0,2,1), nearest_tile.transpose(0,2,1)).transpose(0,2,1)
        }

      }

    }

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

    document.body.appendChild(mosaic_canvas_holder)

    showDownloadLink(mosaic_canvas);

    encourageAnotherMosaic();

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

// changes text in button to upload mosaic target image
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
  tileInput.click();
});

tileInput.addEventListener('change', uploadTiles);


})
