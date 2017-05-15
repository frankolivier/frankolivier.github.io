"use strict";

var Panning = new function () {

	var updateFunction; // The callback to another file to update the movement

	var previousPoint = null;

	var self = this;

	// getMousePoint
	// in - mouse event e
	this.getMousePoint = function (e) {
		var x;
		var y;

		if (e.offsetX) {
			x = e.offsetX;
			y = e.offsetY;
		}
		else if (e.layerX) {
			x = e.layerX;
			y = e.layerY;
		}
		else {
			return undefined; // Work around Chrome bug
		}

		return new Point(x, y);
	}

	this.update = function (currentPoint) {
		var x = currentPoint.x - self.previousPoint.x;
		var y = currentPoint.y - self.previousPoint.y;
		self.previousPoint = currentPoint;

		var delta = new Point(-x, -y); // Negative values, as we are panning
		self.updateFunction(delta);

	}

	this.onMouseDown = function (e) {
		self.previousPoint = self.getMousePoint(e);
	}

	this.onMouseMove = function (e) {
		if (self.previousPoint != null)
		{
			var point = self.getMousePoint(e);
			self.update(point);
		}
	}

	this.onMouseUp = function (e) {
		if (self.previousPoint != null)
		{
			var point = self.getMousePoint(e);
			self.update(point);
		}
		self.previousPoint = null;
	}

	this.onMouseOut = function (e) {
		if (self.previousPoint != null)
		{
			var point = self.getMousePoint(e);
			self.update(point);
		}
		self.previousPoint = null;
	}


	this.init = function (panningCanvas, updateFunction) {
		//BUGBUG check for canvas type bugbug

		panningCanvas.addEventListener("mousedown", this.onMouseDown);
		panningCanvas.addEventListener("mousemove", this.onMouseMove);
		panningCanvas.addEventListener("mouseup", this.onMouseUp);
		panningCanvas.addEventListener("mouseout", this.onMouseOut);
		this.updateFunction = updateFunction;

	}

}



