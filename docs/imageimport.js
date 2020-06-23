// query elements of the DOM only after they've loaded (avoids receiving undefined values)
document.addEventListener('DOMContentLoaded', (event) => {

const COMPONENT_SIZE = 40;

const TILING_FACTOR = 4;

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
    let canvasHolder = document.getElementById('canvasHolder')
    let tilesDisplay = document.getElementById('tilesDisplay')
    tilesDisplay.insertBefore(tilesTitle, canvasHolder)
  }
  
}

// Controls tile thumbnail display size (but not actual image size in pixels)
function setCanvasSizeToImg(canvas, img) {

  // var $canvas = document.getElementById('canvas');
  // $canvas.width = img.shape[1];
  // $canvas.height = img.shape[0];
  // size canvas larger than image so that tiles are easy for user to see
  canvas.width = 120
  canvas.height = 120

}


// @param: img - Ndarray (from NumJS) for a mosaic tile
// @return: (1, 3) array - an RGB color vector for the input image
function get_average_color(img) {
  let R = nj.mean(img.slice(null, null,[0,1]));
  console.log('R channel average is ' + R.toString());
  let B = nj.mean(img.slice(null, null, [1,2]));
  let G = nj.mean(img.slice(null, null, [2,3]));
  return nj.array[R, B, G];
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

  console.log("Right crop is " + right_crop.toString());

  let cropped_tile = img;

  if (right_crop !== 0) {
    if (input_height > input_width) {
      cropped_tile = img.slice([left_crop, -right_crop]);
    } else {
      cropped_tile = img.slice(null, [left_crop, -right_crop]);
    }
  }

  console.log('Cropped to '+ cropped_tile.shape.toString());

  cropped_tile = nj.images.resize(cropped_tile, COMPONENT_SIZE, COMPONENT_SIZE);

  console.log("Final image shape is " + cropped_tile.shape.toString());

  // need to update array of tiles here (to save tile in size that the mosaic
  // will use)
  // tiles[]

  avg_color = get_average_color(cropped_tile);

  return cropped_tile;
               
}

function clearCanvasHolder() {
  const canvasHolder = document.getElementById('canvasHolder')
  while (canvasHolder.firstChild) {
    canvasHolder.removeChild(canvasHolder.lastChild);
  }
}

function uploadTiles() {
  // alert('hey!');

  // every time the input button is clicked, previously uploaded files are not
  // accessible --> remove those thumbnails from the DOM so that their absence
  // is clearly communicated
  clearCanvasHolder()

  const fileList = this.files;
  const numFiles = fileList.length;

  console.log('num files is now ' + numFiles.toString())


  // array of images to use as tiles - additional tiles appended along 1st dim
  let tiles = nj.zeros([numFiles,COMPONENT_SIZE,COMPONENT_SIZE,3])

  writeTilesTitle();  

  for (let i = 0; i < numFiles; i++) {

    let $img = new Image();    

    $img.src = URL.createObjectURL(fileList[i]);
    // $img.src = 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Gull_portrait_ca_usa.jpg'
    // $img.setAttribute('width', '400 px');
    console.log('whats up');
    // document.body.appendChild($img);

    // BEGIN CODE RELEVANT TO SUPERCOLLAGER TASK:

    let canvas_holder = document.getElementById('canvasHolder');

    let cropped_canvas = document.createElement('CANVAS');
    
    cropped_canvas.setAttribute('class', 'tileImage');
    cropped_canvas.classList.add('fadeIn');

    console.log($img);

    // this MUST be an anonymous function because otherwise NumJS runs into a
    // canvas error (https://github.com/pa7/heatmap.js/issues/284)

    $img.onload = function() {

      canvas_holder.appendChild(cropped_canvas);

      // URL.revokeObjectURL(this.src);

      console.log($img.src);
      console.log($img);

      img = nj.images.read($img);

      cropped_tile = cropTile(img);

      setCanvasSizeToImg(cropped_canvas, cropped_tile);

      nj.images.save(cropped_tile, cropped_canvas);

    };

    console.log(i);
  }
};

const tileButton = document.getElementsByClassName("tileButton")[0];
const tileInput = document.getElementById('tileInput');

tileButton.addEventListener('click', function () {
  tileInput.click();
});

tileInput.addEventListener('change', uploadTiles);


})
