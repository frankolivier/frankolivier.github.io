
// Point object 
function Point(x, y) {			//bugbug move to util class file?
    /*
	if (x<-1) x = -1;
    if (y<-1) y = -1;
    if (x>1) x = 1;
    if (y>1) y = 1;
	*/
    
    this.x = x;
	this.y = y;

	this.distanceFrom = function(otherPoint)
	{
		return Math.sqrt(Math.pow(otherPoint.x - this.x, 2) + Math.pow(otherPoint.y - this.y, 2))
	}


}
