"use strict";

function Tiles(url, canvas, zoom, fillStyle) {			//bugbug move to util class file?

    this.url = url;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.zoom = zoom;
    this.fillStyle = fillStyle;
    this.tileDimension = 256; 

    this.x = -1;
    this.y = -1;

    this.renderedID = -1; // the unique id of the tile (x, y and version) of the tile rendered in the last pass
    this.uploadedID = -2; // the unique id of the tile (x, y and version) of the tile uploaded to the GPU

    this.cachedTiles = [];

    this.lastRenderTime = 0; // only render occasionally

    //bugbug somehow this module should tell the others if the canvas is dirty or not


    this.getTileId = function (x, y) {
        return x + y * tileDimension;
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
            if (this.cachedTiles.length > 1600) {
                this.cachedTiles.shift();
            }

            var tile = this.makeTile(x, y, null);
            this.cachedTiles.push(tile);

            var url = this.url;

            url = url.replace('%x%', x);
            url = url.replace('%y%', y);
            url = url.replace('%zoom%', zoom);

            if (!!window.createImageBitmap){
                fetch(url)
                .then(response => response.blob())
                .then(blob => createImageBitmap(blob))
                .then(image => tile.image = image)
            }
            else
            {
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

    this.render = function (x, y) {
        if ((this.x == x) && (this.y == y)) {
            var now = window.performance.now();
            if (now - this.lastRenderTime < 1000) {
                return;
            }
            else {
                this.lastRenderTime = now;
            }
        }

        var renderedID = this.getTileId(x, y);

        this.x = x;
        this.y = y;

        this.ctx.fillStyle = this.fillStyle;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.save();

        const tileCount = (this.canvas.width / tileDimension); // How many tiles should we draw? (1024 / 256 == 4 tiles, + buffer)
        const halfTileCount = tileCount / 2; // How many tiles should we draw? (1024 / 256 == 4 tiles, + buffer)

        const translateX = (this.x - halfTileCount) * tileDimension;
        const translateY = (this.y - halfTileCount) * tileDimension;
        this.ctx.translate(-translateX, -translateY);

        const lowerX = Math.floor(this.x - halfTileCount);
        const lowerY = Math.floor(this.y - halfTileCount);


        for (var y = lowerY; y <= lowerY + tileCount; y++) {
            for (var x = lowerX; x <= lowerX + tileCount; x++) {


                const tile = this.getTile(x, y);
                if (null != tile) {
                    this.ctx.drawImage(tile.image, x * tileDimension, y * tileDimension);
                    renderedID += 0.001;

                    this.ctx.strokeRect(x * tileDimension, y * tileDimension, tileDimension, tileDimension);
                }
            }
        }

        this.renderedID = renderedID; //updating;

        this.ctx.restore();

    }

    this.checkUpdate = function(){
        if (this.renderedID === this.uploadedID)
        {
            return false;
        }
        else
        {
            this.uploadedID = this.renderedID;
            return true;
        }
    }
   

}
