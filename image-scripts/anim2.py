import typing as ty

import cv2
from moviepy.video.io import ffmpeg_writer
import numpy as np
import tqdm

def ease(t:float, duration:float = 1) -> float:
	return duration*(1 - math.cos(math.pi*t/duration))/2
def easeStart(t:float, duration:float = 1) -> float:
	return duration*(t/duration)**2
def easeEnd(t:float, duration:float = 1) -> float:
	return duration*(1 - (1 - t/duration)**2)


class VideoWriter:
	def __init__(self, filename:str, width:int, height:int, *,
	             fps:int = 30, printProgress:bool = True):
		self.filename = filename
		self.width = width
		self.height = height
		self.fps = fps
		self.writer = ffmpeg_writer.FFMPEG_VideoWriter(self.filename, (self.width, self.height), self.fps)
		self.frames = 0
		self.targetTime = 0
		self.time = 0
		self.progress = tqdm.tqdm(unit=' frames') if printProgress else None

	def __enter__(self):
		return self

	def __exit__(self, *exc):
		self.save()

	def save(self):
		self.writer.close()
		if self.progress is not None:
			self.progress.close()

	def frame(self, img=np.array):
		self.writer.write_frame(img)
		self.frames += 1
		self.time += 1/self.fps
		if self.progress is not None:
			self.progress.update()
			self.progress.set_postfix({'video time': '{:02.0f}:{:02.0f}'.format(self.time//60, self.time%60)})

	def addStill(self, img:np.array, duration:float):
		self.targetTime += duration
		while self.time < self.targetTime:
			self.frame(img)

	def addAnimation(self, frameFunction:ty.Callable[[float, dict], np.array],
	                 duration:float, *, args:ty.Optional[dict] = None,
	                 easeFunction:ty.Optional[ty.Callable[[float,float],float]] = None):
		newTargetTime = self.targetTime + duration
		startTime = self.time
		while self.time < newTargetTime:
			t = self.time - self.targetTime
			img = self.evalAnimation(frameFunction, duration, t, args=args, easeFunction=easeFunction)
			self.frame(img)
		self.targetTime = newTargetTime

	def evalAnimation(self, frameFunction:ty.Callable[[float, dict], np.array],
	                  duration:float, t:float, *, args:ty.Optional[dict] = None,
	                  easeFunction:ty.Optional[ty.Callable[[float,float],float]] = None):
		if args is None:
			args = {}
		args['duration'] = duration
		if easeFunction: t = easeFunction(t, duration)
		return frameFunction(t, args)

	def crossFade(self, source1:ty.Union[np.array,ty.Callable[[float, dict], np.array]],
	              source2:ty.Union[np.array,ty.Callable[[float, dict], np.array]],
	              duration:float, *, args1:ty.Optional[dict] = None, args2:ty.Optional[dict] = None,
	              easeFunction1:ty.Optional[ty.Callable[[float,float],float]] = None,
	              easeFunction2:ty.Optional[ty.Callable[[float,float],float]] = None):
		newTargetTime = self.targetTime + duration
		startTime = self.time
		isFun1, isFun2 = callable(source1), callable(source2)
		while self.time < newTargetTime:
			t = self.time - self.targetTime
			img1 = self.evalAnimation(source1, duration, t, args=args1, easeFunction=easeFunction1) \
			       if isFun1 else source1
			img2 = self.evalAnimation(source2, duration, t, args=args2, easeFunction=easeFunction2) \
			       if isFun2 else source2
			frac = t / duration
			img = cv2.addWeighted(img1, 1 - frac, img2, frac, 0)
			self.frame(img)
		self.targetTime = newTargetTime
