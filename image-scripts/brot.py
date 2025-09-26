import numpy as np
import imageio
import tqdm

def miter(c, iters, outlevel):
  # Lighter value = more iterations before leaving 2-unit circle
  # https://commons.wikimedia.org/wiki/File:Mpl_example_Mandelbrot_set.svg
  z = 0
  for n in range(iters):
    z = z**2 + c
    if abs(z) > 2:
      return (n*outlevel)//iters
  return 255

def brot(filename, size, iters=100, outlevel=170):
  img = np.zeros((size, size), 'uint8')
  for i, y in enumerate(tqdm.tqdm(np.linspace(-2, 2, size))):
    for j, x in enumerate(np.linspace(-2, 2, size)):
      img[i,j] = miter(x + 1j*y, iters, outlevel)
  imageio.imwrite(filename, img)

if __name__ == '__main__':
	brot('brot.png', 4000)