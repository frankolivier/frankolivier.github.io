"use strict";

function Tiles(url, canvas, zoom, fillStyle) {			//bugbug move to util class file?

    this.url = url;
    this.canvas = canvas;

    this.ctx = canvas.getContext('2d');
    this.tileDimension = 256;
    this.tileCount = (this.canvas.width / tileDimension); // How many tiles should we draw? (1024 / 256 == 4 tiles, + buffer)

    this.zoom = zoom;
    this.fillStyle = fillStyle;

    this.cachedTiles = []; // Make an array somewhat larger than a square array
    const ArrayMax = this.tileCount ** 2.2 | 0;

    this.renderedID = -1; // the unique id of the tile rendered in the last pass
    this.renderedVersion = -1; // the unique version tile rendered in the last pass

    this.uploadedID = -2; // the unique id of the tile (id +  and version) of the tile uploaded to the GPU
    this.uploadedVersion = -2; // the unique id of the tile (id +  and version) of the tile uploaded to the GPU
    
    this.lastRenderTime = 0; // only render occasionally

    this.renderPass = 0;


    // Get a unique ID for the tile
    this.getTileId = function (x, y) {
        return x + y * Math.pow(2, zoom);
    }

    
    this.makeTile = function (x, y, image, renderPass) {
        return {
            id: this.getTileId(x, y),
            x: x,
            y: y,
            image: image,
            renderPass: renderPass
        };
    }

    this.checkId = function (element, index, array) {
        return ((element != undefined) && (element.id == this));
    }

    this.checkOld = function (element, index, array) {
        return ((element === undefined) || (element.renderPass < this));
    }

    // Adds a tile
    this.addTile = function (tile) {
        if (this.cachedTiles.length < ArrayMax)
        {
            this.cachedTiles.push(tile);
        }
        else
        {
            let index = this.cachedTiles.reduce(function(answer, value, index, array)
                { 
                    //console.log(answer + ' ' + value + ' ' + index + ' ' + array[index].renderPass + ' '+ array[answer].renderPass);
                    return (array[answer].renderPass < array[index].renderPass ? answer : index); }
                , 0);
            //console.log('adding tile at ' + index);
            this.cachedTiles[index] = tile;
        }
    }

    // returns ? bugbug?
    this.getTile = function (x, y, renderPass) {

        const id = this.getTileId(x, y);

        //var tile = this.cachedTiles.find(this.checkId, id);
        let tile = this.cachedTiles.find(this.checkId, id);
        ////console.log('found ' + tile);

        if (tile === undefined) { // Not found in the array

            tile = this.makeTile(x, y, null, renderPass);
            this.addTile(tile);

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
                //console.log('Found ///\\\ tile! cache size = ' + this.cachedTiles.length);
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

            if (this.renderedVersion === this.tileCount * this.tileCount) return;   // We've already rendered the final version

            if (window.performance.now() - this.lastRenderTime < 1000) {
                return;
            }
        }
        else
        {
            // We moved
            this.renderedVersion = 0;
            //this.ctx.fillStyle = this.fillStyle;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        let version = 0;

        const halfTileCount = this.tileCount / 2; // How many tiles should we draw? (1024 / 256 == 4 tiles, + buffer)

        const translateX = (x - halfTileCount) * tileDimension;
        const translateY = (y - halfTileCount) * tileDimension;
        
        const lowerX = Math.floor(x - halfTileCount);
        const lowerY = Math.floor(y - halfTileCount);
        
        this.ctx.save();
        this.ctx.translate(-translateX, -translateY);
        for (var yy = lowerY; yy < lowerY + this.tileCount; yy++) {
            for (var xx = lowerX; xx < lowerX + this.tileCount; xx++) {

                const tile = this.getTile(xx, yy, this.renderPass);
                if (null != tile) {
                    this.ctx.drawImage(tile.image, xx * tileDimension, yy * tileDimension);
                    tile.renderPass = this.renderPass;
                    version++;
                }
            }
        }
        this.ctx.restore();

        this.renderedID = id;
        this.renderedVersion = version;
        this.lastRenderTime = window.performance.now();
        this.renderPass++;

    }

    //bugbug move this into render function? 
    this.checkUpdate = function () {
        if ((this.renderedID === this.uploadedID)&&(this.renderedVersion === this.uploadedVersion)) {
            return false;
        }
        else {
            this.uploadedID = this.renderedID;
            this.uploadedVersion = this.renderedVersion;
            return true;
        }
    }


}
