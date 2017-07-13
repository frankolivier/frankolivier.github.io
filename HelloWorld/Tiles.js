"use strict";

function Tiles(url, canvas, zoom, fillStyle) {			//bugbug move to util class file?

    this.url = url;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.zoom = zoom;
    this.fillStyle = fillStyle;
    this.tileDimension = 256;

    this.x = -1;  // the last tile coords we rendered
    this.y = -1;

    this.cachedTiles = [];

    this.renderedID = -1; // the unique id of the tile (id + version) of the tile rendered in the last pass
    this.uploadedID = -2; // the unique id of the tile (id +  and version) of the tile uploaded to the GPU
    this.lastRenderTime = 0; // only render occasionally

    //bugbug somehow this module should tell the others if the canvas is dirty or not


    this.getTileId = function (x, y) {
        //return x + "." + y;

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
            if (this.cachedTiles.length > 600) { // bugbug find best number
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

        let now = window.performance.now();

        // No need to update if we've updated in the past second; let's wait on more network requests to complete
        if ((this.x === x) && (this.y === y)) {
            if (now - this.lastRenderTime < 1000) {
                return;
            }
        }

        this.lastRenderTime = now;
        this.x = x;
        this.y = y;

        var renderedID = this.getTileId(x, y);

        this.ctx.fillStyle = this.fillStyle;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        const tileCount = (this.canvas.width / tileDimension); // How many tiles should we draw? (1024 / 256 == 4 tiles, + buffer)
        const halfTileCount = tileCount / 2; // How many tiles should we draw? (1024 / 256 == 4 tiles, + buffer)

        const translateX = (x - halfTileCount) * tileDimension;
        const translateY = (y - halfTileCount) * tileDimension;
        this.ctx.translate(-translateX, -translateY);

        const lowerX = Math.floor(x - halfTileCount);
        const lowerY = Math.floor(y - halfTileCount);

        for (var yy = lowerY; yy <= lowerY + tileCount; yy++) {
            for (var xx = lowerX; xx <= lowerX + tileCount; xx++) {

                const tile = this.getTile(xx, yy);
                if (null != tile) {
                    this.ctx.drawImage(tile.image, xx * tileDimension, yy * tileDimension);
                    renderedID += 0.001;


                    if (this.url.indexOf('st amen') > 0) {

                        this.ctx.fillStyle = 'rgb(' + (xx % 16) * 16 + ', 0, ' + (yy % 16) * 16 + ')';
                        this.ctx.fillRect(xx * tileDimension, yy * tileDimension, tileDimension, tileDimension);

                        this.ctx.fillStyle = 'rgb(0, 0, 0)';
                        this.ctx.font = '40px serif';
                        this.ctx.fillText(x + ' , ' + y, xx * tileDimension + 10, yy * tileDimension + (tileDimension / 2));
                        this.ctx.fillText(tile.id, xx * tileDimension + 10, yy * tileDimension + (tileDimension / 3));

                    }

                }
            }
        }

        this.renderedID = renderedID; //updating;

        this.ctx.restore();

        return y;

    }

    //bugbug move this into render function? 
    this.checkUpdate = function () {
        if (this.renderedID === this.uploadedID) {
            return false;
        }
        else {
            this.uploadedID = this.renderedID;
            return true;
        }
    }


}
