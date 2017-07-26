"use strict";

function Tiles(url, textureWidth, zoom) {

    // The URL pattern to use when downloading tiles
    // must contain %x%  %y% and %zoom%
    // %x% is replaced with slippy map x
    // %y% is replaced with slippy map y
    // %zoom% is replaced with zoom level
    this.url = url;

    // Size of the (square) texture to fill with tiles
    this.textureWidth = textureWidth;

    // We are drawing 256x256 pixel tiles
    const tileDimension = 256;

    // Zoom level of the slippy map
    this.zoom = zoom;

    this.tileCount = (this.textureWidth / tileDimension); // How many tiles should we draw? (1024 / 256 == 4 tiles, + buffer)

    this.lastRenderTime = 0; // only render occasionally
    this.renderPass = 0;

    // To re-render less, we'll 'wrap' around the texture as we render tiles 
    this.offsetX = 0;
    this.offsetY = 0;

    this.renderTiles = [];

    this.getRenderTile = function () {
        // bugbug actually, we should enforce render order...
        return this.renderTiles.shift();
    }

    this.getNormalizedOffsetX = function () {
        return this.offsetX / this.tileCount;
    }

    this.getNormalizedOffsetY = function () {
        return this.offsetY / this.tileCount;
    }

    // Our render list:
    this.tiles = new Array(this.tileCount).fill(undefined).map(() => new Array(this.tileCount).fill(undefined));

    this.offsetArray = function (array, offset) {
        for (let i = 0; i < offset; i++) {
            array.unshift(array.pop());
        }
    }

    // Get a unique ID for the tile
    this.getTileId = function (x, y) {
        return x + y * Math.pow(2, zoom);
    }

    this.makeTile = function (x, y, image, renderPass, drawX, drawY) {
        return {
            id: this.getTileId(x, y),
            x: x,
            y: y,
            image: image,
            renderPass: renderPass,
            drawX: drawX,
            drawY: drawY
        };
    }

    this.checkId = function (element, index, array) {
        return ((element != undefined) && (element.id == this));
    }

    this.checkOld = function (element, index, array) {
        return ((element === undefined) || (element.renderPass < this));
    }

    // returns ? bugbug?
    // drawX and drawX are where to draw the tile on the texture
    this.getTile = function (x, y, renderPass, drawX, drawY) {
        const id = this.getTileId(x, y);

        let tile; // = this.cachedTiles.find(this.checkId, id);

        //if (tile === undefined) { // Not found in the array

        tile = this.makeTile(x, y, null, renderPass, drawX, drawY);
        //this.addTile(tile);

        var url = this.url;
        url = url.replace('%x%', x);
        url = url.replace('%y%', y);
        url = url.replace('%zoom%', zoom);

        if (!!window.createImageBitmap) {
            fetch(url)
                .then(response => response.blob())
                .then(blob => createImageBitmap(blob))
                .then(image => { tile.image = image; this.renderTiles.push(tile); })
        }
        else {
            // fallback path
            fetch(url)
                .then(response => response.blob())
                .then(blob => { tile.image = new Image(); tile.image.src = URL.createObjectURL(blob); this.renderTiles.push(tile); })
        }
    }


// Render tiles to a texture (canvas)
// Tries to avoid work whenever possible
this.render = function (longtitude, latitude) {

    let x = long2tile(longtitude, zoom);    // x of the tile to render
    let y = lat2tile(latitude, zoom);       // y
    let id = this.getTileId(x, y);          // What is the ID of the tile to render

    const halfTileCount = this.tileCount / 2; // How many tiles should we draw?
    const translateX = (x - halfTileCount) * tileDimension;
    const translateY = (y - halfTileCount) * tileDimension;
    const lowerX = Math.floor(x - halfTileCount);
    const lowerY = Math.floor(y - halfTileCount);
    /*
            // Let's try to avoid work:
            // Did we move? (Do we have a new xy to render?)
            if (id === this.renderedID) {
                // We didn't move
    
                // Did we already rendered the final version of this xy?
                if (this.renderedVersion === this.tileCount * this.tileCount) {
                    return; // Yes
                }
    
                // No need to update if we've rendered in the past second
                // Let's wait on more network requests to complete
                if (window.performance.now() - this.lastRenderTime < 1000) {
                    return;
                }
            }
            else {
                // We moved
                */
    this.renderedVersion = 0;
    //BUGBUG this makes the canvas the right color for unfilled tiles


    this.offsetX = x % this.tileCount;
    this.offsetY = y % this.tileCount;

    for (let yy = 0; yy < this.tileCount; yy++) {
        for (let xx = 0; xx < this.tileCount; xx++) {

            if (!this.tiles[xx][yy]) {
                this.tiles[xx][yy] = { x: -1, y: -1, painted: false, requested: false }; //init
            }

            let xValue = lowerX + ((xx - this.offsetX + this.tileCount) % this.tileCount);
            let yValue = lowerY + ((yy - this.offsetY + this.tileCount) % this.tileCount);

            if ((this.tiles[xx][yy].x != xValue) || (this.tiles[xx][yy].y != yValue)) {
                this.tiles[xx][yy].x = xValue;
                this.tiles[xx][yy].y = yValue;
                this.tiles[xx][yy].painted = false;
                this.tiles[xx][yy].requested = false;
            }

            //this.tiles[xx][yy] = xx + ' ' + yy; //this.getTileId(lowerX + xx, lowerY + yy); 
        }
    }

    //this.print(this.tiles);

    // Offset array by X
    //this.offsetArray(this.tiles, this.offsetX);
    // Offset array by Y
    //this.tiles.forEach(array => this.offsetArray(array, this.offsetY));

    //this.print(this.tiles);

    //}

    ///this.ctx.save();
    ///this.ctx.translate(-translateX, -translateY);
    let version = 0;    // Calculate the version we are going to render

    for (let yy = 0; yy < this.tileCount; yy++) {
        for (let xx = 0; xx < this.tileCount; xx++) {
            let plan = this.tiles[xx][yy];

            if (plan.requested == false) {
                this.getTile(plan.x, plan.y, this.renderPass, xx * tileDimension, (this.tileCount - yy - 1) * tileDimension);
                this.tiles[xx][yy].requested = true;
            }

            /*
                                if (this.url.indexOf('terrain')<0){
                                    this.ctx.fillStyle = 'red';
                                    this.ctx.font = '50px Arial';
                                    
                                    this.ctx.fillText(plan.x + ' ' + plan.y, drawX, drawY + 100);
                                    //this.ctx.fillText(this.getTileId(xx, yy), plan.x * tileDimension, plan.y * tileDimension + 100);
                                }
            */



        }
    }
}


/*
for (var yy = lowerY; yy < lowerY + this.tileCount; yy++) {
    for (var xx = lowerX; xx < lowerX + this.tileCount; xx++) {

        const tile = this.getTile(xx, yy, this.renderPass);
        if (null != tile) {
            this.ctx.drawImage(tile.image, xx * tileDimension, yy * tileDimension);
            tile.renderPass = this.renderPass;
            version++;
        }

        if (this.url.indexOf('terrain')<0){
            this.ctx.fillStyle = 'red';
            this.ctx.font = '50px Arial';
            //this.ctx.fillText(xx + ' ' + yy, xx * tileDimension, yy * tileDimension + 100);
        
            this.ctx.fillText(this.getTileId(xx, yy), xx * tileDimension, yy * tileDimension + 100);
        }

    }
}
*/

//this.ctx.restore();

this.lastRenderTime = window.performance.now();
this.renderPass++;

}


