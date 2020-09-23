# supercollager
Photomosaic generator

## Web Version - [available here](https://chgagnon.github.io/supercollager/)

The code for the web version is within ```docs/```, so that the web version can be
hosted on GitHub Pages.

The web version functions in the same way as the Python version, but has
upper bounds on the number of pixels and number of tiles it can include in
its mosaic outputs. 

If outputs would exceed one or both of those upper bounds
given a particular choice of tile resolution and tiling factor, the input target
image is resized (downsampled) before creating the output mosaic. 

The  downsampling assures that the output mosaic's resolution and number of
tiles is within the fixed upper bounds for those metrics. The upper bounds
were determined by trial and error on a variety of browsers and platforms, and
the bounds were set so that most browsers should be able to run the program 
quickly enough that the page will not be killed during mosaic generation. 

## Python Version
### How to Run the Program

Run __python makemosaic.py__ to generate mosaic images in the project's root directory

In the project's root directory, there should be a directory called images/

images/ should contain:

  components/    <-- a folder containing the images that will compose the tiles
                     of the mosaic

  targets/       <-- a folder containing images to turn into mosaics

Run __python makemosaic.py --refresh_components__ to regenerate the tiling components. This flag should be used after changing **COMPONENT SIZE**

Run __python makemosaic.py --components_folder [folder name]__ to specify a particular folder of images to use as tile components (the default folder is called components/, which is the folder used when the flag is not included). The specified folder must be within the same folder as makemosaic.py

### Tunable Parameters in makemosaic.py

**COMPONENT SIZE** is the (square root of the) resolution of each tile in the mosaic (in pixels), and should be set to some integer.

**TILING FACTOR** is the (square root of the) ratio of input target image pixels to output mosaic image pixels, and should be set to some integer. A larger value for this parameter produces an output mosaic composed of a greater number of tiles.
