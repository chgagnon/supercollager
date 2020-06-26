import argparse
import numpy as np
import os
import glob
from skimage import io, img_as_ubyte
import matplotlib.pyplot as plt
from load_components import get_components

parser = argparse.ArgumentParser(description='Specify whether to regenerate component images')

parser.add_argument('--refresh_components', action='store_true')

default_components_path = os.path.join('images', 'components')

parser.add_argument('--components_folder', default=default_components_path)

args = parser.parse_args()

components_path = args.components_folder

COMPONENT_SIZE = 40

# Right now, the shape of components is square
# Changing this will require a different approach to cropping
components_width = COMPONENT_SIZE
components_height = COMPONENT_SIZE

targets_path = os.path.join('images', 'targets')
output_path = os.path.join('images', 'mosaics')

TILING_FACTOR = 4


'''
Determine which component image has nearest average color to current target
image region

@param: target_tile_color - (3,) array of current target region's average RGB
color

@param: component_colors - (num_components, 3) array of each component's
average RGB vector

@return: index of component image with nearest average color (TODO later: optional modulation
towards average color of corresponding target image region)
'''
def get_nearest_component(target_tile_color, component_colors):
  # Taking Euclidean distance
  color_distances = np.sum((target_tile_color - component_colors)**2, axis=1)
  nearest_image_index = np.argmin(color_distances)

  return nearest_image_index


def main():

  components, component_colors = get_components(components_path, components_width, 
                              components_height, args.refresh_components)

  print('Components loaded')

  target_files = glob.glob(os.path.join(targets_path, '*.*'))

  for target_filename in target_files:

    target_img = io.imread(target_filename)

    print('Target image has shape:', target_img.shape)

    # Excess portions of the target, in the bottom-right, will be clipped off
    # The generated image will have 4x the resolution of the original target
        # (e.g. replacing 50-pix squares with 100-pix squares)
    height_in_tiles = np.floor(TILING_FACTOR * target_img.shape[0] / components_height).astype(int)
    width_in_tiles = np.floor(TILING_FACTOR * target_img.shape[1] / components_width).astype(int)

    # print(height_in_tiles)
    # print(width_in_tiles)

    mosaic = np.empty((height_in_tiles*components_height, width_in_tiles*components_width, 3))

    height_stride_on_target = int(components_height / TILING_FACTOR)
    width_stride_on_target = int(components_width / TILING_FACTOR)

    for i in range(height_in_tiles):
      for j in range(width_in_tiles):
        # target_tile_color is (3,) array - average R, G, B of corresponding
        # tile in the target
        # print("Now preparing tile at (" + str(i) + ", " + str(j) + ")" )

        target_tile_color = np.mean(
          target_img[i*height_stride_on_target:int((i+1)*height_stride_on_target),
                    j*width_stride_on_target:int((j+1)*width_stride_on_target)], (0,1))

        comp_index = get_nearest_component(target_tile_color, component_colors)

        mosaic[i*components_height:(i+1)*components_height,
              j*components_width:(j+1)*components_width] = components[comp_index]
        # print("added tile of shape", components[comp_index].shape)

    mosaic = mosaic.astype(np.uint8)

    # print(mosaic)

    io.imsave(os.path.join(output_path, os.path.basename(target_filename) + '_mosaic.png'), mosaic)
    # plt.figure()
    # io.imshow(mosaic)
    # plt.show()

if __name__ == '__main__':
  main()