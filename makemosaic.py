import argparse
import numpy as np
import os
import glob
from skimage import io
from skimage.transform import resize, rotate
import matplotlib.pyplot as plt
from shutil import rmtree

parser = argparse.ArgumentParser(description='Specify preprocessing mode')

parser.add_argument('--refresh_components', action='store_true')

args = parser.parse_args()

components_path = os.path.join('images', 'components')
save_resized_path = os.path.join(components_path, 'resized')

targets_path = os.path.join('images', 'targets')

# Right now, the shape of components is sqauare
# Changing this will require a different approach to cropping
components_width = 100
components_height = 100

# -----------------------------

if args.refresh_components:
  rmtree(save_resized_path)

if (not os.path.exists(save_resized_path)):
  
  os.mkdir(save_resized_path)

  list_component_images = glob.glob(os.path.join(components_path, '*.*'))

  components = []

  for img_num, filename in enumerate(list_component_images):
    img = io.imread(filename)
    print('Input is', img.shape, filename)

    # square off the images and resize to proper width and height

    input_width = img.shape[1]
    input_height = img.shape[0]


    crop_margin = np.abs(input_height - input_width)
    left_crop = np.floor(crop_margin / 2).astype(int)
    right_crop = None
    if crop_margin % 2 != 0:
      right_crop = left_crop + 1
    else:
      right_crop = left_crop

    print(right_crop)


    cropped_img = None

    if input_height > input_width:
      cropped_img = img[left_crop : -right_crop, :, :]
    else:
      cropped_img = img[:, left_crop:-right_crop, :]

    assert(cropped_img is not None)

    print('Cropped to', cropped_img.shape)

    final_img = resize(cropped_img, (components_width, components_height), anti_aliasing=True)
    
    components.append(final_img)
    # io.imshow(final_img)

    io.imsave(os.path.join(save_resized_path, str(img_num) + '.png'), final_img.astype(np.uint8))
    plt.show()

# components already resized appropriately
else: 

  print('cool')

  list_target_images = glob.glob(os.path.join(targets_path, '*.*'))

  for target in list_target_images:




# print(np.array(components))