'use strict';

class Vector {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
	get xy() {
		return [this.x, this.y];
	}
	get norm() {
		return Math.sqrt(this.x**2 + this.y**2);
	}
	add(v) {
		return new Vector(this.x + v.x, this.y + v.y);
	}
	sub(v) {
		return new Vector(this.x - v.x, this.y - v.y);
	}
	mult(s) {
		return new Vector(this.x*s, this.y*s);
	}
}
Vector.polar = function(a, r=1) {
	return new Vector(r*Math.cos(a), r*Math.sin(a))
}

class Cardioid {
	constructor(canvas, colours={}) {
		this.canvas = canvas;
		this.ctx = canvas.getContext('2d');

		this.t = {}; this.m = {}; this.p = {}; this.style = {};
		this.t.ti  = 0.2; // pause between steps
		this.t.t1a = this.t.ti;                              this.t.dt1a = 1;   // circle 1 appears
		this.t.t1b = this.t.t1a + this.t.ti;                 this.t.dt1b = 0.8; // circle 2 appears
		this.t.t1c = this.t.t1b + 1.5*this.t.ti;             this.t.dt1c = 0.6; // line appears
		this.t.t2  = this.t.t1c + this.t.dt1c;               this.t.dt2  = 3.2; // rolling
		this.t.t3  = this.t.t2 + this.t.dt2 + this.t.ti;     this.t.dt3  = 1;   // circle of curvature
		this.t.t4a = this.t.t3 + this.t.dt3 + this.t.ti;     this.t.dt4a = 1.2; // evolute pt 1
		this.t.t4b = this.t.t4a + this.t.dt4a;               this.t.dt4b = 1.4; // evolute pt 2
		this.t.t4c = this.t.t4b + this.t.dt4b;               this.t.dt4c = 1.2; // evolute pt 3
		this.t.t5  = this.t.t4c + this.t.dt4c + this.t.ti/2; this.t.dt5  = 1;   // inner circle
		this.t.t6  = this.t.t5 + this.t.dt5 + this.t.ti;     this.t.dt6  = 1.6; // filling
		this.t.dur = this.t.t6 + this.t.dt6 + this.t.ti; // end

		this.p.nPoints = 400;
		this._getMeasures();
		this._getCardPoints();
		window.onresize = (function(){this._getMeasures(); this._getCardPoints(); this.nextFrame();}).bind(this);

		this.style.bg = colours.bg || null;
		this.style.red = colours.red || '#b00d0e';
		this.style.grey = colours.grey || '#646464';
		this.style.white = colours.white || '#fff';
		this.style.faded = 0.3;
		this.style.sw1 = this.m.circR/30;
		this.style.sw2 = this.m.circR/15;

		this.brot = new Image(this.m.brotSize, this.m.brotSize);
		this.brot.addEventListener('load', this.nextFrame.bind(this));
		this.brot.src = '/assets/images/brot.png';
	}

	nextFrame() {
		window.requestAnimationFrame(this.draw.bind(this));
	}

	setTime(t) {
		this.t.start = performance.now() - 1000*t;
		this.nextFrame();
	}

	draw(timestamp) {
		if (!this.t.start) {
			// Predraw image and recalculate current time since the first drawImage() is slow
			this._drawBrot();
			timestamp = performance.now();
			this.t.start = timestamp;
		}
		this.t.t = (timestamp - this.t.start)/1000;

		this.ctx.clearRect(0, 0, this.m.W, this.m.H);
		if (this.style.bg) {
			this.ctx.fillStyle = this.style.bg;
			this.ctx.fillRect(0, 0, this.m.W, this.m.H);
		}
		this.ctx.save();
		this.ctx.translate(this.m.W/2 + this.m.originOffsetInitial, this.m.H/2);

		if (this.t.t < this.t.t2) {
			// circles and line appear
			let circ1R = this._ease(this.t.t, this.t.t1a, this.t.dt1a, 0, this.m.circR),
					circ2R = this._ease(this.t.t, this.t.t1b, this.t.dt1b, 0, this.m.circR),
					pointsR = this._ease(this.t.t, this.t.t1c, this.t.dt1c, 0, this.m.pointR),
					lineEnd = -2*this.m.circR - this._ease(this.t.t, this.t.t1c, this.t.dt1c, 0, this.m.circR);

			this.ctx.lineWidth = this.style.sw1;
			this.ctx.strokeStyle = this.style.red;
			this._circle(circ1R); this.ctx.stroke();
			this.ctx.strokeStyle = this.style.grey;
			this._circle(circ2R, -2*this.m.circR, 0); this.ctx.stroke();
			this._drawShape([[-2*this.m.circR, 0], [lineEnd, 0]]); this.ctx.stroke();

			this.ctx.fillStyle = this.style.grey;
			this._circle(pointsR, -2*this.m.circR, 0); this.ctx.fill();
			this._circle(pointsR, lineEnd, 0); this.ctx.fill();

		} else if (this.t.t < this.t.t3) {
			// rolling
			let rollAngle = this._ease(this.t.t, this.t.t2, this.t.dt2, 0, 2*Math.PI),
					rollC = Vector.polar(rollAngle, -2*this.m.circR),
					cardPoint = rollC.add(Vector.polar(2*rollAngle, -this.m.circR));

			this.ctx.strokeStyle = this.style.red;
			this.ctx.lineWidth = this.style.sw2;
			this._drawShape(this.p.cardPoints, rollAngle); this.ctx.stroke();

			this.ctx.lineWidth = this.style.sw1;
			this._circle(this.m.circR); this.ctx.stroke();

			this.ctx.strokeStyle = this.style.grey;
			this._circle(this.m.circR, rollC.x, rollC.y); this.ctx.stroke();
			this._drawShape([rollC.xy, cardPoint.xy]); this.ctx.stroke();

			this.ctx.fillStyle = this.style.grey;
			this._circle(this.m.pointR, rollC.x, rollC.y); this.ctx.fill();
			this._circle(this.m.pointR, cardPoint.x, cardPoint.y); this.ctx.fill();

		} else if (this.t.t < this.t.t4a) {
			// circle of curvature
			let cardX = this.m.curv.point.x,
					newR = this._ease(this.t.t, this.t.t3, this.t.dt3, this.m.circR, this.m.curv.r),
					newX = this._ease(this.t.t, this.t.t3, this.t.dt3, -2*this.m.circR, this.m.curv.evolute.x),
					paraX = this._ease(this.t.t, this.t.t3, this.t.dt3, cardX, cardX + this.m.cardBorder),
					fadeOut = this._rgba(this.style.red, this._ease(this.t.t, this.t.t3, this.t.dt3, 1, this.style.faded));

			this.ctx.strokeStyle = fadeOut;
			this.ctx.lineWidth = this.style.sw2;
			this._drawShape(this.p.cardPoints); this.ctx.stroke();
			this.ctx.lineWidth = this.style.sw1;
			this._circle(this.m.circR); this.ctx.stroke();

			this.ctx.strokeStyle = this.style.grey;
			this._circle(newR, newX, 0); this.ctx.stroke();
			this._drawShape([[cardX, 0], [paraX, 0], [newX, 0]]); this.ctx.stroke();

			this.ctx.fillStyle = this.style.grey;
			this._circle(this.m.pointR, newX, 0); this.ctx.fill();
			this._circle(this.m.pointR, paraX, 0); this.ctx.fill();

		} else if (this.t.t < this.t.t5) {
			// evolute & parallel
			let evolAngle;
			if (this.t.t < this.t.t4b) {
				evolAngle = this._ease(this.t.t, this.t.t4a, this.t.dt4a, 0, 1/2*Math.PI)
			} else if (this.t.t < this.t.t4c) {
				evolAngle = this._ease(this.t.t, this.t.t4b, this.t.dt4b, 1/2*Math.PI, 3/2*Math.PI)
			} else {
				evolAngle = this._ease(this.t.t, this.t.t4c, this.t.dt4c, 3/2*Math.PI, 2*Math.PI)
			}
			this.m.curv = this._getCurvature(evolAngle);
			this.p.evolPoints.push(this.m.curv.evolute.xy);
			let paraR = Math.min(this.m.curv.r, this.m.cardBorder);
			let paraXY = this.m.curv.point.add(this.m.curv.unit.mult(paraR));


			this.ctx.strokeStyle = this._rgba(this.style.red, this.style.faded);
			this.ctx.lineWidth = this.style.sw2;
			this._drawShape(this.p.cardPoints); this.ctx.stroke()

			this.ctx.strokeStyle = this.style.red;
			this._drawShape(this.p.paraPoints, evolAngle); this.ctx.stroke()
			this._drawShape(this.p.evolPoints, evolAngle); this.ctx.stroke()

			this.ctx.lineWidth = this.style.sw1;
			if (evolAngle > 1/2*Math.PI) {
				this._drawShape(this.p.line135); this.ctx.stroke();
			}
			if (evolAngle > 3/2*Math.PI) {
				this._drawShape(this.p.line225); this.ctx.stroke();
			}

			this.ctx.strokeStyle = this._rgba(this.style.red, this.style.faded);
			this._circle(this.m.circR); this.ctx.stroke()

			this.ctx.strokeStyle = this.style.grey;
			this._circle(this.m.curv.r, this.m.curv.evolute.x, this.m.curv.evolute.y); this.ctx.stroke();
			this._drawShape([this.m.curv.point.xy, paraXY.xy, this.m.curv.evolute.xy]); this.ctx.stroke()

			this.ctx.fillStyle = this.style.grey;
			this._circle(this.m.pointR, paraXY.x, paraXY.y); this.ctx.fill();
			this._circle(this.m.pointR, this.m.curv.evolute.x, this.m.curv.evolute.y); this.ctx.fill();

		} else if (this.t.t < this.t.t6) {
			// inner circle
			let fadeIn = this._rgba(this.style.red, this._ease(this.t.t, this.t.t5, this.t.dt5, this.style.faded, 1)),
			    fadeOut = this._rgba(this.style.grey, this._ease(this.t.t, this.t.t5, this.t.dt5, 1, 0)),
			    paraXY = this.m.curv.point.add(this.m.curv.unit.mult(this.m.cardBorder)),
			    circ1R = this._ease(this.t.t, this.t.t5, this.t.dt5, this.m.circR, this.m.innerR),
			    circ1X = -this._ease(this.t.t, this.t.t5, this.t.dt5, 0, this.m.originOffsetFinal),
			    moveCentre = this._ease(this.t.t, this.t.t5, this.t.dt5, 0, this.m.originOffsetFinal - this.m.originOffsetInitial),
			    strokeWidth = this._ease(this.t.t, this.t.t5, this.t.dt5, this.style.sw1, this.style.sw2);
			this.ctx.translate(moveCentre, 0);

			this.ctx.strokeStyle = this.style.red;
			this.ctx.lineWidth = strokeWidth;
			this._drawShape(this.p.line135); this.ctx.stroke();
			this._drawShape(this.p.line225); this.ctx.stroke();

			this.ctx.lineWidth = this.style.sw2;
			this._drawShape(this.p.paraPoints); this.ctx.stroke();
			this._drawShape(this.p.evolPoints); this.ctx.stroke();

			this.ctx.strokeStyle = fadeIn;
			this._drawShape(this.p.cardPoints); this.ctx.stroke();

			this.ctx.lineWidth = strokeWidth;
			this._circle(circ1R, circ1X, 0); this.ctx.stroke();

			this.ctx.strokeStyle = fadeOut;
			this.ctx.lineWidth = this.style.sw1;
			this._circle(this.m.curv.r, this.m.curv.evolute.x, this.m.curv.evolute.y); this.ctx.stroke();
			this._drawShape([this.m.curv.point.xy, paraXY.xy, this.m.curv.evolute.xy]); this.ctx.stroke();

			this.ctx.fillStyle = fadeOut;
			this._circle(this.m.pointR, paraXY.x); this.ctx.fill();
			this._circle(this.m.pointR, this.m.curv.evolute.x, this.m.curv.evolute.y); this.ctx.fill();

		} else {
			// filling
			let strokeWidth = this._ease(this.t.t, this.t.t6, this.t.dt6, this.style.sw2, 0),
			    gradR = this._ease(this.t.t, this.t.t6, this.t.dt6, 0, this.m.brotSize/2 + this.m.circR);

			this.ctx.translate(this.m.originOffsetFinal - this.m.originOffsetInitial, 0);

			this._drawBrot();
			this.ctx.fillStyle = this.style.red;
			this._drawShape(this.p.cardPoints); this.ctx.fill();
			this.ctx.fillStyle = this.style.white;
			this._drawShape(this.p.paraPoints); this.ctx.fill();
			this.ctx.fillStyle = this.style.red;
			this._drawShape(this.p.cMask); this.ctx.fill();
			this._circle(this.m.innerR, -this.m.originOffsetFinal, 0); this.ctx.fill();
			this.ctx.fillStyle = this.style.white;
			this._drawShape(this.p.evolPoints); this.ctx.fill();

			// fade the above in
			let grad = this._gradient(gradR, this.m.circR, -this.m.originOffsetFinal, 0);
			this.ctx.globalCompositeOperation = "destination-in";
			this.ctx.fillStyle = grad;
			this.ctx.fillRect(-this.m.W/2 - this.m.originOffsetFinal, -this.m.H/2, this.m.W, this.m.H);
			this.ctx.globalCompositeOperation = "source-over";

			if (strokeWidth > 0) {
				this.ctx.strokeStyle = this.style.red;
				this.ctx.lineWidth = strokeWidth;
				this._drawShape(this.p.cardPoints); this.ctx.stroke();
				this._drawShape(this.p.paraPoints); this.ctx.stroke();
				this._circle(this.m.innerR, -this.m.originOffsetFinal, 0); this.ctx.stroke()
				this._drawShape(this.p.line135); this.ctx.stroke();
				this._drawShape(this.p.line225); this.ctx.stroke();
				this._drawShape(this.p.evolPoints); this.ctx.stroke();
			}
		}

		this.ctx.restore();
		if (this.t.t < this.t.dur) {
			this.nextFrame();
		}
	}

	_drawShape(points, limit=null) {
		if (limit==null) {limit = this.p.nPoints + 1;}
		this.ctx.beginPath();
		this.ctx.moveTo(...points[0]);
		for (let i = 1; i < points.length && this.p.angles[i] < limit; i++) {
			this.ctx.lineTo(...points[i]);
		}
	}

	_drawBrot() {
		let rect = [-this.m.brotSize/2, -this.m.brotSize/2, this.m.brotSize, this.m.brotSize];
		this.ctx.fillStyle = this.style.red;
		this.ctx.fillRect(...rect);
		this.ctx.globalCompositeOperation = "destination-in";
		this.ctx.drawImage(this.brot, ...rect);
		this.ctx.globalCompositeOperation = "source-over";
	}

	_circle(r, x=0, y=0) {
		this.ctx.beginPath();
		this.ctx.arc(x, y, r, 0, 2*Math.PI);
		this.ctx.closePath();
	}

	_hex(rgb) {
		return '#' + Math.round(rgb[0]).toString(16).padStart(2,0) + Math.round(rgb[1]).toString(16).padStart(2,0) + Math.round(rgb[2]).toString(16).padStart(2,0);
	}

	_rgb(hex) {
    if (hex.charAt(0)=='#') {hex = hex.substr(1);}
    if (hex.length<=3) {hex = hex.split('').reduce((a,b)=>(a+b+b), '');}
    return [parseInt(hex.substr(0, 2), 16), parseInt(hex.substr(2, 2), 16), parseInt(hex.substr(4, 2), 16)];
	}

	_rgba(hex, a) {
		return 'rgba(' + this._rgb(hex).join(',') + ',' + a + ')';
	}

	_ease(tp, t0=0, dt=1, v0=0, v1=1) {
		return tp <= t0 ? v0 : tp >= t0 + dt ? v1 : v0 + (v1 - v0) * (1 - Math.cos(Math.PI*(tp-t0)/dt))/2;
	}

	_gradient(radius, width, x, y) {
		let grad = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
		grad.addColorStop(0, this._rgba(this.style.white, 1));
		grad.addColorStop(Math.max(radius - width, 0)/radius, this._rgba(this.style.white, 1));
		grad.addColorStop(1, this._rgba(this.style.white, 0));
		return grad;
	}

	_getMeasures() {
		this.m.W = canvas.offsetWidth; this.m.H = canvas.offsetHeight;
		canvas.width = this.m.W; canvas.height = this.m.H;
		this.m.circR = 0.15*Math.min(this.m.H, this.m.W);
		this.m.pointR = this.m.circR/20;
		this.m.cardBorder = this.m.circR/2;
		this.m.innerR = this.m.circR*3/2;
		this.m.curv = this._getCurvature(0);
		this.m.brotSize = 16*this.m.circR;
		// visually centre cardioid in last part
		this.m.originOffsetFinal = this.m.innerR - this.m.circR;
		// keep rolling circle in canvas in first part
		if (this.m.W <= this.m.H) {
			this.m.originOffsetInitial = 0;
		} else if (this.m.W <= 2*(3*this.m.circR + 2*this.m.originOffsetFinal)) {
			this.m.originOffsetInitial = this.m.W/2 - 3*this.m.circR - this.m.originOffsetFinal;
		} else {
			this.m.originOffsetInitial = this.m.originOffsetFinal;
		}
	}

	_getCardPoints() {
		this.p.angles = new Array(this.p.nPoints);
		this.p.cardPoints = new Array(this.p.nPoints);
		this.p.evolPoints = new Array(this.p.nPoints);
		this.p.paraPoints = new Array(this.p.nPoints);
		let curv, paraR;
		for (let i = 0; i <= this.p.nPoints; i++) {
			this.p.angles[i] = 2*Math.PI*i/this.p.nPoints;
			curv = this._getCurvature(this.p.angles[i]);
			paraR = Math.min(curv.r, this.m.cardBorder);
			this.p.cardPoints[i] = curv.point.xy;
			this.p.evolPoints[i] = curv.evolute.xy;
			this.p.paraPoints[i] = curv.point.add(curv.unit.mult(paraR)).xy;
		}
		// "C" cutoff lines
		curv = this._getCurvature(1/2*Math.PI);
		this.p.line135 = [curv.point.xy, curv.evolute.xy];
		curv = this._getCurvature(3/2*Math.PI);
		this.p.line225 = [curv.point.xy, curv.evolute.xy];
		this.p.cMask = [this.p.line135[1],
		                this.p.line135[0],
		                [this.m.circR*5/4, this.p.line135[0][1]/2],
		                [this.m.circR,0],
		                [this.m.circR*5/4, this.p.line225[0][1]/2],
		                this.p.line225[0],
		                this.p.line225[1]];
	}

	_getCurvature(angle) {
		let o = {}, r = this.m.circR;
		// parametric point & derivatives
		o.point = Vector.polar(angle, -2*r).add(Vector.polar(2*angle, -r));
		let d = Vector.polar(angle + Math.PI/2, -2*r).add(Vector.polar(2*angle + Math.PI/2, -2*r));
		let d2 = Vector.polar(angle + Math.PI, -2*r).add(Vector.polar(2*angle + Math.PI, -4*r));
		// normal vector
		o.vect = new Vector(-d.y*(d.x**2 + d.y**2) / (d.x*d2.y - d.y*d2.x),
		                     d.x*(d.x**2 + d.y**2) / (d.x*d2.y - d.y*d2.x));
		o.evolute = o.point.add(o.vect);
		// radius of curvature
		o.r = o.vect.norm;
		// unit normal vector
		o.unit = o.vect.mult(1/o.r);
		return o;
	}
}
