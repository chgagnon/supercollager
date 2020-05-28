# supercollager
Photomosaic generator

## How to Run the Program

Run __makemosaic.py__ to generate mosaic images in the project's root directory

In the project's root directory, there should be a directory called images/

images/ should contain:

  components/    <-- a folder containing the images that will compose the tiles
                     of the mosaic

  targets/       <-- a folder containing images to turn into mosaics

Run __makemosaic.py --refresh_components__ to regenerate the tiling components. This flag should be used after changing **COMPONENT SIZE**

Run __makemosaic.py --components_folder [folder name]__ to specify a particular folder of images to use as tile components (the default folder is called components, which is the folder used when the flag is not included)

## Tunable Parameters in makemosaic.py

**COMPONENT SIZE** is the resolution of each tile in the mosaic, and should be set to some integer.

**TILING FACTOR** is the ratio of input target image pixels to output mosaic image pixels, and should be set to some integer. A larger value for this parameter produces an output mosaic composed of a greater number of tiles.
