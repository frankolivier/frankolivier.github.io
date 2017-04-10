"use strict";


function Tiles(url, canvas, tileDimension) {			//bugbug move to util class file?

    this.url = url;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tileDimension = tileDimension; //bugbug duplicate

    this.x = 128;
    this.y = 128;

    this.cachedTiles = [];

    //bugbug somehow this module should tell the others if the canvas is dirty or not


    this.getTileId = function(x, y) {
        return x + y * tileDimension;
    }

    this.makeTile = function(x, y, image) {
        return {
            id: this.getTileId(x, y),
            x: x,
            y: y,
            image: image
        };
    }

    this.checkId = function(tile) {
        return tile.id == this;
    }

    this.getTile = function(x, y) {
        // bugbug enforce [0 - 256][0 - 256]
        const id = this.getTileId(x, y);

        var tile = this.cachedTiles.find(this.checkId, id);

        if (tile === undefined) {
            if (this.cachedTiles.length > 200) {
                this.cachedTiles.shift();
            }

            var tile = this.makeTile(x, y, null);
            this.cachedTiles.push(tile);

            var url = this.url;
            
            url = url.replace('%x%', x);
            url = url.replace('%y%', y);

            console.log(url);

            fetch(url)
                .then(response => response.blob())
                .then(blob => createImageBitmap(blob))
                .then(image => tile.image = image)

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


    this.moveTo = function (x, y) {
        //bugbug enforce limits (0 - 256, 0 - 256)

        this.x = x;
        this.y = y;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);



        this.ctx.save();

        const tileCount = (this.canvas.width / tileDimension) + 1; // How many tiles should we draw? (1024 / 256 == 4 tiles, + buffer)
        const halfTileCount = tileCount / 2; // How many tiles should we draw? (1024 / 256 == 4 tiles, + buffer)

        const translateX = (this.x - halfTileCount) * tileDimension;
        const translateY = (this.y - halfTileCount) * tileDimension;
        this.ctx.translate(-translateX, -translateY);

        const lowerX = Math.floor(this.x - halfTileCount);
        const lowerY = Math.floor(this.y - halfTileCount);

        for (var y = lowerY; y <= lowerY + tileCount; y++) {
            for (var x = lowerX; x <= lowerX + tileCount; x++) {

                var text = 'blank';

                const tile = this.getTile(x, y);
                if (null == tile) {
                    text = 'no cached tile';
                }
                else {
                    this.ctx.drawImage(tile.image, x * tileDimension, y * tileDimension);
                    /*
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(x * tileDimension, y * tileDimension, tileDimension, tileDimension);
                    ctx.stroke();
                    ctx.restore();
                    */

                }

                //ctx.fillText(text + ' ' + x + ' , ' + y, x * tileDimension + (tileDimension / 2), y * tileDimension + (tileDimension / 2));
            }

        }

        this.ctx.restore();


        this.ctx.fillText(this.x + ' ' + this.y, 10, 10);


    }


}
