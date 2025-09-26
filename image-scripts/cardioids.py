import math
import sys
import typing as ty

import numpy as np

import anim2
import cairopath

BG_COLOR = '#fff'
GREY = '#888'
LIGHTGREY = '#bbb'
RED = '#b00d0e'
LIGHTRED = '#d72f31'

W, H = 400, 400
ROLL_R = min(W, H)/7
SW1 = 6
SW2 = 9
CYCLE_TIME = 3
FPS = 30

CHORD_R = 3*ROLL_R
INV_R = 2*ROLL_R
CX, CY = W/2, H/2
MIRROR_R = 0.3*ROLL_R
INV_DY = -ROLL_R
INV_MAX_R = math.sqrt((W/2)**2 + (H/2 + INV_DY)**2) + 2*SW2

canvas = cairopath.Canvas(W, H)

def cardioid(angle:float, r:float = ROLL_R) -> ty.Tuple[float, float]:
	return (r*( 2*math.sin(angle) - math.sin(2*angle)),
	        r*(-2*math.cos(angle) + math.cos(2*angle)))


def parabola(angle:float, r:float = INV_R) -> ty.Optional[ty.Tuple[float, float]]:
	try:
		rr = r/(1 - math.cos(angle))
		if rr < INV_MAX_R:
			return (rr*math.sin(angle), -rr*math.cos(angle))
	except ZeroDivisionError:
		pass
	return None


def drawShape(shapeFun:ty.Callable, startAngle:float = 0, endAngle:float = 2*math.pi, angleStep:float = math.pi/100):
	angle = startAngle
	# Only draw the range of angles that gives non-None coords
	startPoint = shapeFun(angle)
	while startPoint is None:
		angle += angleStep
		if angle >= endAngle:
			break
		startPoint = shapeFun(angle)
	else:
		path = canvas.path().M(*startPoint)

		while angle < endAngle:
			angle += angleStep
			nextPoint = shapeFun(angle)
			if nextPoint is None:
				break
			path.L(*nextPoint)

	return canvas


def drawRoll(t:float, args:dict):
	startAngle = args.get('startAngle', 0)
	angleDiff = args.get('endAngle', 2*math.pi) - startAngle
	angle = startAngle + angleDiff * t / args['duration']

	canvas.rect(W, H).fill(BG_COLOR)
	with canvas.translate(CX, CY):
		canvas.circle(ROLL_R).stroke(LIGHTGREY, width=SW1)
		with canvas.rotate(angle, rad=True).translate(0, -2*ROLL_R):
			canvas.circle(ROLL_R).stroke(LIGHTGREY, width=SW1)
			px, py = -ROLL_R*math.sin(angle), ROLL_R*math.cos(angle)
			canvas.path().M(0, 0).L(px, py).stroke(LIGHTGREY, width=SW1, cap='round')
			canvas.circle(SW1, 0, 0).fill(LIGHTGREY)

		drawShape(cardioid, angle, 1.99*math.pi).stroke(args.get('startColor', GREY), width=SW2, join='round')
		drawShape(cardioid, 0, angle).stroke(args.get('endColor', RED), width=SW2, join='round', cap='round')
		canvas.circle(SW2, *cardioid(angle)).fill(RED)
	return canvas.img()


def drawChords(t:float, args:dict):
	startAngle = args.get('startAngle', 0)
	angleDiff = args.get('endAngle', 2*math.pi) - startAngle
	angle = startAngle + angleDiff * t / args['duration']
	x1, y1 = -CHORD_R*math.sin(angle + math.pi), CHORD_R*math.cos(angle + math.pi)
	x2, y2 = -CHORD_R*math.sin(2*(angle + math.pi)), CHORD_R*math.cos(2*(angle + math.pi))
	mx1, my1 = x1 + MIRROR_R*math.sin(angle + math.pi/2), y1 - MIRROR_R*math.cos(angle + math.pi/2)
	mx2, my2 = x1 + MIRROR_R*math.sin(angle - math.pi/2), y1 - MIRROR_R*math.cos(angle - math.pi/2)

	canvas.rect(W, H).fill(BG_COLOR)
	with canvas.translate(CX, CY):
		canvas.circle(CHORD_R).stroke(LIGHTGREY, width=SW1)
		drawShape(cardioid, angle, 1.99*math.pi).stroke(args.get('startColor', GREY), width=SW2, join='round')
		drawShape(cardioid, 0, angle).stroke(args.get('endColor', RED), width=SW2, join='round', cap='round')
		canvas.path().M(mx1, my1).L(mx2, my2).stroke(GREY, width=SW1, cap='round')
		canvas.path().M(0, CHORD_R).L(x1, y1).L(x2, y2).stroke(LIGHTGREY, width=SW1, join='round')
		canvas.circle(SW2, 0, CHORD_R).fill(LIGHTGREY)
		canvas.circle(SW2, *cardioid(angle)).fill(RED)
	return canvas.img()


def drawInverse(t:float, args:dict):
	startAngle = args.get('startAngle', 0)
	angleDiff = args.get('endAngle', 2*math.pi) - startAngle
	angle = startAngle + angleDiff * t / args['duration']
	cardX, cardY = cardioid(angle)
	cardY -= INV_DY
	# Calculate point on parabola by inverting cardioid point
	cardDist = math.sqrt(cardX**2 + cardY**2)
	if cardDist == 0:
		invAngle = 0
		paraDist = INV_MAX_R
	else:
		invAngle = math.atan2(cardX, -cardY) % (2*math.pi)
		if invAngle == 0 and t > 0: invAngle = 2*math.pi
		paraDist = INV_R*INV_R/cardDist
	paraX, paraY = paraDist*math.sin(invAngle), -paraDist*math.cos(invAngle)

	canvas.rect(W, H).fill(BG_COLOR)
	with canvas.translate(CX, CY):
		with canvas.translate(0, INV_DY):
			canvas.circle(INV_R).stroke(LIGHTGREY, width=SW1)
			canvas.path().M(0, 0).L(cardX, cardY).L(paraX, paraY).stroke(LIGHTGREY, width=SW1)
			drawShape(parabola, invAngle, 1.99*math.pi).stroke(args.get('startColor', GREY), width=SW1, join='round')
			drawShape(parabola, 0, invAngle).stroke(args.get('endColor', RED), width=SW1, join='round', cap='round')

		drawShape(cardioid, angle, 1.99*math.pi).stroke(args.get('startColor', GREY), width=SW2, join='round')
		drawShape(cardioid, 0, angle).stroke(args.get('endColor', RED), width=SW2, join='round', cap='round')
		canvas.circle(SW2, paraX, paraY + INV_DY).fill(RED)
		canvas.circle(SW2, cardX, cardY + INV_DY).fill(RED)
	return canvas.img()


def loop(writer:anim2.VideoWriter, source:ty.Union[np.array,ty.Callable[[float, dict], np.array]], numLoops:int = 1, *,
         cycleTime=CYCLE_TIME, startColor:str = GREY, endColor:str = RED,
         fadeFrom:ty.Union[np.array,ty.Callable[[float, dict], np.array],None] = None, fadeDuration:float = CYCLE_TIME/4):
	if fadeFrom is not None:
		duration = cycleTime - fadeDuration
		fadeEndAngle = fadeDuration/cycleTime * 2 * math.pi
		args = {'startAngle': 0, 'endAngle': fadeEndAngle, 'startColor': startColor, 'endColor': endColor}
		writer.crossFade(fadeFrom, source, fadeDuration, args1=args, args2=args)
	else:
		duration = cycleTime
		fadeEndAngle = 0

	for _ in range(numLoops):
		# Start after fade on the first loop, then from 0 on subsequent loops
		if callable(source):
			args = {'startAngle': fadeEndAngle, 'endAngle': 2*math.pi, 'startColor': startColor, 'endColor': endColor}
			writer.addAnimation(source, duration, args=args)
		else:
			writer.addStill(source, duration)
		duration = cycleTime
		fadeEndAngle = 0
		# Swap colors every loop
		startColor, endColor = endColor, startColor


with anim2.VideoWriter('cardioids.mp4', W, H, fps=FPS) as writer:
	# Still cardioid
	canvas.rect(W, H).fill(BG_COLOR)
	with canvas.translate(CX, CY):
		drawShape(cardioid).stroke(RED, width=SW2, join='round')
	cardImg = canvas.img()
	writer.addStill(cardImg, 2)

	# Fade into rolling circles
	loop(writer, drawRoll, numLoops=4, fadeFrom=cardImg, startColor=RED, endColor=GREY)
	# Fade into chords
	loop(writer, drawChords, numLoops=4, fadeFrom=drawRoll, startColor=RED, endColor=GREY)
	# Fade into inverse
	loop(writer, drawInverse, numLoops=4, fadeFrom=drawChords, startColor=RED, endColor=GREY)
	# Back to still
	loop(writer, cardImg, numLoops=0, fadeFrom=drawInverse, startColor=RED, endColor=GREY)
	writer.addStill(cardImg, 2)
