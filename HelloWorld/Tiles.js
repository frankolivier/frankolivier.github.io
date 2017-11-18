'use strict';

function Tiles(url, textureWidth, zoom, emptyTile) {

    // The URL pattern to use when downloading tiles
    // must contain %x%  %y% and %zoom%
    // %x% is replaced with slippy map x
    // %y% is replaced with slippy map y
    // %zoom% is replaced with zoom level
    this.url = url;

    // Pixel size of the (square) texture to fill with tiles (Example: 1024, 2048, 4096, etc)
    this.textureWidth = textureWidth;

    // Zoom level of the slippy map
    this.zoom = zoom;

    // Default tile to prep
    this.emptyTile = emptyTile;

    // We are drawing 256x256 pixel tiles
    const tileDimension = 256;

    // How many tiles should we draw? (Example: 1024 / 256 == 4 tiles)
    this.tileCount = (this.textureWidth / tileDimension);

    // To re-render less, we'll UV-offset 'wrap' around the texture as we render tiles 
    this.offsetX = 0;
    this.offsetY = 0;

    // UV Wrap Values
    this.getNormalizedOffsetX = function () {
        return this.offsetX / this.tileCount;
    }

    this.getNormalizedOffsetY = function () {
        return this.offsetY / this.tileCount;
    }

    this.tempcanvas = document.createElement('canvas');
    this.tempcanvas.width = this.tempcanvas.height = 32;
    let ctx = this.tempcanvas.getContext('2d');

    // Red rectangle
    ctx.beginPath();
    ctx.fillStyle = "black";
    ctx.rect(0, 0, 32, 32);
    ctx.fill();

    // The list of 256x256 tile resources to render - one per frame
    this.tiles = new Array(this.tileCount).fill(undefined).map(() => new Array(this.tileCount).fill(undefined));

    this.fetchCount = 0;

    // called by the rendering code - gets a list of tiles to render
    this.getRenderTiles = function () {

        let tiles = [];

        // bugbug improve - draw from center
        for (let y = 0; y < this.tileCount; y++) {
            for (let x = 0; x < this.tileCount; x++) {

                if (this.tiles[x][y].temporary != true) {

                    this.tiles[x][y].temporary = true;

                    let tile = {
                        image: null,
                        drawX: this.tiles[x][y].drawX,
                        drawY: this.tiles[x][y].drawY
                    }

                    tiles.push(tile);
                    //return tiles; // only do one big tile at a time, to keep FPS budget    
                    
                    // exit early to not block rendering
                    // bugbug improve
                    if (tile.length > 10) return tiles;
                }
            }
        }

        if (tiles.length > 0) return tiles;

        for (let y = 0; y < this.tileCount; y++) {
            for (let x = 0; x < this.tileCount; x++) {
                if (this.tiles[x][y].image != null) {
                    if (this.tiles[x][y].done != true) {
                        this.tiles[x][y].done = true;

                        let tile = {
                            image: this.tiles[x][y].image,
                            drawX: this.tiles[x][y].drawX,
                            drawY: this.tiles[x][y].drawY
                        }
                        this.tiles[x][y].image = null;

                        tiles.push(tile);
                        return tiles; // only do one big tile at a time, to keep FPS budget    
                    }
                }

            }
        }

        return tiles;

        //return this.renderTiles.pop();

        /*
        if (this.renderTiles.length === 0) return undefined;

        let findex = 0;
        let tile = this.renderTiles[findex];

        this.renderTiles.forEach(function (item, index, array) {
            if (item.iteration > tile.iteration) {
                tile = item;
                findex = index;
            }
        });

        this.renderTiles.splice(findex, 1);

        return tile;
        */
    }


    // Our render list:

    this.makeTile = function (slippyX, slippyY, image, drawX, drawY) {
        return {
            slippyX: slippyX,
            slippyY: slippyY,
            image: image,
            drawX: drawX,
            drawY: drawY,
            requested: false,
            done: false,
            temporary: false
        };
    }

    this.setTileImage = function (image, tileX, tileY, slippyX, slippyY) {

        this.fetchCount--;

        // still the right image resource?
        if (this.tiles[tileX][tileY].slippyX === slippyX && this.tiles[tileX][tileY].slippyY === slippyY) {
            this.tiles[tileX][tileY].image = image;
        }
        else
        {
            console.log('flush!');
        }
    }

    // drawX and drawX are where to draw the tile on the texture
    this.getTile = function (tileX, tileY) {

        //console.log(" count = " + this.fetchCount);

        if (this.fetchCount > 10) return;

        this.fetchCount++;

        let x = tileX;
        let y = tileY;
        let slippyX = this.tiles[x][y].slippyX;
        let slippyY = this.tiles[x][y].slippyY;

        this.tiles[x][y].requested = true;

        var url = this.url;
        url = url.replace('%x%', slippyX);
        url = url.replace('%y%', slippyY);
        url = url.replace('%zoom%', zoom);

        //todo handle fetch failing

        if (!!window.createImageBitmap) {
            fetch(url)
                .then(response => response.blob())
                .then(blob => createImageBitmap(blob))
                .then(image => { this.setTileImage(image, x, y, slippyX, slippyY) })
                .catch(error => this.fetchCount--)
        }
        else {
            // fallback path
            fetch(url)
                .then(response => response.blob())
                .then(blob => {
                    let image = new Image(); image.src = URL.createObjectURL(blob); this.setTileImage(image, x, y, slippyX, slippyY)
                })
                .catch(error => this.fetchCount--)
        }
    }

    // Render tiles to a texture (canvas)
    // Tries to avoid work whenever possible
    this.render = function (longtitude, latitude) {

        let x = long2tile(longtitude, zoom);    // Slippy x of the tile to render
        let y = lat2tile(latitude, zoom);       // y

        const halfTileCount = this.tileCount / 2; // How many tiles should we draw?
        const lowerX = Math.floor(x - halfTileCount);
        const lowerY = Math.floor(y - halfTileCount);

        this.offsetX = x % this.tileCount; // For UV Wrap
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

                let xValue = lowerX + ((xx - this.offsetX + this.tileCount) % this.tileCount);
                let yValue = lowerY + ((yy - this.offsetY + this.tileCount) % this.tileCount); // move outside xx loop bugbug

                // Initialize the tile, if needed
                if (!this.tiles[xx][yy]) {
                    this.tiles[xx][yy] = this.makeTile(xValue, yValue, undefined, xx * tileDimension, (this.tileCount - yy - 1) * tileDimension);
                }

                // Do we need to overwrite this tile
                if ((this.tiles[xx][yy].slippyX != xValue) || (this.tiles[xx][yy].slippyY != yValue)) {
                    this.tiles[xx][yy].slippyX = xValue;
                    this.tiles[xx][yy].slippyY = yValue;
                    this.tiles[xx][yy].image = null;
                    this.tiles[xx][yy].requested = false;
                    this.tiles[xx][yy].done = false;
                    this.tiles[xx][yy].temporary = false;
                }

                // find best tile to request
                if (this.tiles[xx][yy].requested == false) {
                    //if (this.fetchCount < 100) { // Limit the number of outstanding requests; work around Safari bug
                    // Find best tile to request
                    let testX = xx > this.offsetX ? xx : xx + this.tileCount;
                    let testY = yy > this.offsetY ? yy : yy + this.tileCount;

                    let distance = Math.abs(targetX - testX) + Math.abs(targetY - testY); //bugbug improve
                    if (distance < bestRequestDistance) {
                        bestRequestX = xx;
                        bestRequestY = yy;
                        bestRequestDistance = distance;
                    }

                    //}
                }


            }
        }

        if (bestRequestX !== undefined && bestRequestY !== undefined) {
            this.getTile(bestRequestX, bestRequestY);
        }
    }
}


