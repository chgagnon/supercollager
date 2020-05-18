# supercollager
Photomosaic generator

## How to Run the Program

Run __makemosaic.py__ to generate a mosaic images in the project's root directory

In the project's root directory, there should be a directory called images/

images/ should contain:

  components/    <-- a folder containing the images that will compose the tiles
                     of the mosaic

  targets/       <-- a folder containing images to turn into mosaics

Run __makemosaic.py --refresh_components__ to regenerate the tiling components

## Tunable Parameters in makemosaic.py

RESOLUTION_MULTIPLIER is the ratio of input target image pixels to output mosaic image pixels, and should be set to some integer.

A larger value makes the output image higher-resolution, and composed of
a greater number of tiles.



