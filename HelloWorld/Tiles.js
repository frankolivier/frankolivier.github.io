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

    this.makeTile = function (x, y, image, drawX, drawY) {
        return {
            x: x,
            y: y,
            image: image,
            drawX: drawX,
            drawY: drawY
        };
    }

    this.fetchCount = 0;

    this.sameDrawXY = function (tile) {
        return (tile.drawX == this.drawX && tile.drawY == this.drawY);
    }

    this.addRenderTile = function (tile) {

        let i = this.renderTiles.findIndex(this.sameDrawXY, tile);

        if (i == -1) {
            this.renderTiles.push(tile);
        }
        else {
            this.renderTiles[i] = tile;
        }

        this.fetchCount--;
    }

    // returns ? bugbug?
    // drawX and drawX are where to draw the tile on the texture
    this.getTile = function (x, y, drawX, drawY) {

        let tile; // = this.cachedTiles.find(this.checkId, id);

        //if (tile === undefined) { // Not found in the array

        tile = this.makeTile(x, y, null, drawX, drawY);
        //this.addTile(tile);

        var url = this.url;
        url = url.replace('%x%', x);
        url = url.replace('%y%', y);
        url = url.replace('%zoom%', zoom);

        this.fetchCount++;

        if (!!window.createImageBitmap) {
            fetch(url)
                .then(response => response.blob())
                .then(blob => createImageBitmap(blob))
                .then(image => { tile.image = image; this.addRenderTile(tile); })
        }
        else {
            // fallback path
            fetch(url)
                .then(response => response.blob())
                .then(blob => { tile.image = new Image(); tile.image.src = URL.createObjectURL(blob); this.addRenderTile(tile); })
        }
    }

    // Render tiles to a texture (canvas)
    // Tries to avoid work whenever possible
    this.render = function (longtitude, latitude) {

        let x = long2tile(longtitude, zoom);    // x of the tile to render
        let y = lat2tile(latitude, zoom);       // y

        const halfTileCount = this.tileCount / 2; // How many tiles should we draw?
        const translateX = (x - halfTileCount) * tileDimension;
        const translateY = (y - halfTileCount) * tileDimension;
        const lowerX = Math.floor(x - halfTileCount);
        const lowerY = Math.floor(y - halfTileCount);

        this.offsetX = x % this.tileCount;
        this.offsetY = y % this.tileCount;

        // let's request one tile per frame
        let bestRequestX = undefined;
        let bestRequestY = undefined;
        let bestRequestDistance = 100000;

        let targetX = this.offsetX + halfTileCount;
        let targetY = this.offsetY + halfTileCount;

        // Do a fake draw pass
        for (let yy = 0; yy < this.tileCount; yy++) {
            for (let xx = 0; xx < this.tileCount; xx++) {

                // Initialize the tile, if needed
                if (!this.tiles[xx][yy]) {
                    this.tiles[xx][yy] = { x: -1, y: -1, painted: false, requested: false }; //init
                }

                let xValue = lowerX + ((xx - this.offsetX + this.tileCount) % this.tileCount);
                let yValue = lowerY + ((yy - this.offsetY + this.tileCount) % this.tileCount);

                // We need to overwrite this tile
                if ((this.tiles[xx][yy].x != xValue) || (this.tiles[xx][yy].y != yValue)) {
                    this.tiles[xx][yy].x = xValue;
                    this.tiles[xx][yy].y = yValue;
                    this.tiles[xx][yy].painted = false;
                    this.tiles[xx][yy].requested = false;
                }


                if (this.tiles[xx][yy].requested == false) {
                    if (this.fetchCount < 100) { // Limit the number of outstanding requests
                        // Find best tile to request
                        let testX = xx > this.offsetX ? xx : xx + this.tileCount;
                        let testY = yy > this.offsetY ? yy : yy + this.tileCount;

                        let distance = Math.abs(targetX - testX) + Math.abs(targetY - testY);
                        if (distance < bestRequestDistance) {
                            bestRequestX = xx;
                            bestRequestY = yy;
                            bestRequestDistance = distance;
                        }

                        //this.getTile(this.tiles[xx][yy].x, this.tiles[xx][yy].y, xx * tileDimension, (this.tileCount - yy - 1) * tileDimension);
                        //this.tiles[xx][yy].requested = true;

                        //console.log('fetchCoutn == ' + this.fetchCount);
                    }
                }


            }
        }

        if (bestRequestX !== undefined && bestRequestY !== undefined) {


            let xx = bestRequestX;
            let yy = bestRequestY;

            this.getTile(this.tiles[xx][yy].x, this.tiles[xx][yy].y, xx * tileDimension, (this.tileCount - yy - 1) * tileDimension);
            this.tiles[xx][yy].requested = true;
        }
    }
}


