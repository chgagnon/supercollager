import argparse
import numpy as np
import os
import glob
from skimage import io, img_as_ubyte
from skimage.transform import resize
import matplotlib.pyplot as plt
from shutil import rmtree

'''
Determines average color of each image that will compose the collage
@param: components - (num_images, components_width, components_height, 3) array

@return: (num_images, 3) array - an RGB color vector for each image
'''
def get_average_colors(components):
  return np.mean(components, (1,2))

def get_components(components_path, components_height, components_width, refresh_components):
  
  save_resized_path = os.path.join(components_path, 'resized')


  if refresh_components:
    rmtree(save_resized_path)

  if (not os.path.exists(save_resized_path)):
    
    os.mkdir(save_resized_path)

    list_component_images = glob.glob(os.path.join(components_path, '*.*'))

    components = [] 

    for img_num, filename in enumerate(list_component_images):
      print('Filename is', filename)
      img = io.imread(filename)
      print('Input has shape', img.shape)

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

      print("Right crop is", right_crop)

      cropped_img = img

      if right_crop != 0:
        if input_height > input_width:
          cropped_img = img[left_crop : -right_crop, :, :]
        else:
          cropped_img = img[:, left_crop:-right_crop, :]

      print('Cropped to', cropped_img.shape)

      final_img = resize(cropped_img, (components_width, components_height), anti_aliasing=True)
      
      final_img = img_as_ubyte(final_img)

      print("Final image shape is", final_img.shape)
      
      if final_img.shape[2] == 4:
        # Rip out 4th channel (usually this is just the transparency in a .png)
        final_img = final_img[:,:,:3]

      components.append(final_img)

      io.imsave(os.path.join(save_resized_path, str(img_num) + '.png'), final_img)

      # io.imshow(final_img)  
      # plt.show()

    components = np.stack(components, axis=0)
    return components, get_average_colors(components)

  else: 
    # load components from components directory
    components = []
    list_component_images = glob.glob(os.path.join(save_resized_path, '*.*'))

    for filename in list_component_images:
      image = io.imread(filename)
      components.append(image)
    components = np.array(components)

    return components, get_average_colors(components)