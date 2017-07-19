"use strict";

function Tiles(url, canvas, zoom, fillStyle) {			//bugbug move to util class file?

    this.url = url;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.zoom = zoom;
    this.fillStyle = fillStyle;
    this.tileDimension = 256;

    this.cachedTiles = [];

    this.renderedID = -1; // the unique id of the tile rendered in the last pass
    this.renderedVersion = -1; // the unique version tile rendered in the last pass

    this.uploadedID = -2; // the unique id of the tile (id +  and version) of the tile uploaded to the GPU
    this.uploadedVersion = -2; // the unique id of the tile (id +  and version) of the tile uploaded to the GPU
    
    this.lastRenderTime = 0; // only render occasionally

    //bugbug somehow this module should tell the others if the canvas is dirty or not

    // Get a unique ID for the tile
    this.getTileId = function (x, y) {
        return x + y * Math.pow(2, zoom);
    }

    this.makeTile = function (x, y, image) {
        return {
            id: this.getTileId(x, y),
            x: x,
            y: y,
            image: image
        };
    }

    this.checkId = function (tile) {
        return tile.id == this;
    }

    // returns ? bugbug?
    this.getTile = function (x, y) {

        const id = this.getTileId(x, y);

        var tile = this.cachedTiles.find(this.checkId, id);

        if (tile === undefined) {
            if (this.cachedTiles.length > 1200) { // bugbug find best number
                this.cachedTiles.shift();
            }

            var tile = this.makeTile(x, y, null);
            this.cachedTiles.push(tile);

            var url = this.url;

            url = url.replace('%x%', x);
            url = url.replace('%y%', y);
            url = url.replace('%zoom%', zoom);

            if (!!window.createImageBitmap) {
                fetch(url)
                    .then(response => response.blob())
                    .then(blob => createImageBitmap(blob))
                    .then(image => tile.image = image)
            }
            else {
                // fallback path
                fetch(url)
                    .then(response => response.blob())
                    .then(blob => { tile.image = new Image(); tile.image.src = URL.createObjectURL(blob) })
            }

            return null;
        }
        else {
            if (null == tile.image) {
                //console.log('Found ...... tile! cache size = ' + this.cachedTiles.length);
                return null;

            }
            else {
                //console.log('Found cached tile! cache size = ' + this.cachedTiles.length);
                return tile;
            }
        }
    }

    this.render = function (longtitude, latitude) {

        let x = long2tile(longtitude, zoom);
        let y = lat2tile(latitude, zoom);
        let id = this.getTileId(x, y);      // What is the ID of the tile we are supposed to draw?


        if (id === this.renderedID) {   // Did we move?
            // We didn't move
            // No need to update if we've rendered in the past second
            // Let's wait on more network requests to complete
            if (window.performance.now() - this.lastRenderTime < 1000) {
                return;
            }
        }
        else
        {
            // We moved
            this.renderedVersion = 0;
        }

        let version = 0;

        //this.ctx.fillStyle = this.fillStyle;
        //this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        const tileCount = (this.canvas.width / tileDimension); // How many tiles should we draw? (1024 / 256 == 4 tiles, + buffer)

        if (this.renderedVersion === tileCount * tileCount) return;   // We've already drawn the final version

        const halfTileCount = tileCount / 2; // How many tiles should we draw? (1024 / 256 == 4 tiles, + buffer)

        const translateX = (x - halfTileCount) * tileDimension;
        const translateY = (y - halfTileCount) * tileDimension;
        
        const lowerX = Math.floor(x - halfTileCount);
        const lowerY = Math.floor(y - halfTileCount);

        this.ctx.save();
        this.ctx.translate(-translateX, -translateY);
        for (var yy = lowerY; yy < lowerY + tileCount; yy++) {
            for (var xx = lowerX; xx < lowerX + tileCount; xx++) {

                const tile = this.getTile(xx, yy);
                if (null != tile) {
                    this.ctx.drawImage(tile.image, xx * tileDimension, yy * tileDimension);
                    version++;
                }
            }
        }
        this.ctx.restore();

        console.log('DREW VERSION ' + version);

        this.renderedID = id; //updating;
        this.renderedVersion = version;

        this.lastRenderTime = window.performance.now();

    }

    //bugbug move this into render function? 
    this.checkUpdate = function () {
        if ((this.renderedID === this.uploadedID)&&(this.renderedVersion === this.uploadedVersion)) {
            return false;
        }
        else {
            this.uploadedID = this.renderedID;
            this.uploadedVersion = this.renderedVersion;
            console.log('NEEDS UPDATE');
            return true;
        }
    }


}
