define(function (require) {

    require("easel");
    require("tween");
    require("sound");

    var soundInstance;
    var soundLoaded = false;

    // load the sound
    var soundSrc = "sounds/card.ogg";
    createjs.Sound.alternateExtensions = ["mp3"];
    createjs.Sound.addEventListener("fileload", soundReady);
    createjs.Sound.registerSound(soundSrc);
    soundInstance = createjs.Sound.createInstance(soundSrc);

    function soundReady(event) {
        console.log('Sound loaded');
        soundLoaded = true;
    };

    wordmatrix = {};

    function MatrixView(canvas, game) {

        this.canvas = canvas;
        this.game = game;

        this.stage = new createjs.Stage(canvas);
        // Enable touch interactions if supported on the current device
        createjs.Touch.enable(this.stage);
        this.stage.mouseChildren = false;

        this.cell_size = 60;
        this.margin_y = 40;

        this.start_cell = null;
        this.end_cell = null;
        this.select_word_line = null;

        this.container;
        this.letters = [];
        this.animatedLetters = [];

        this.animation_runnning = false;

        this.init = function () {
            var orientations;
            if (this.game.level == 'easy') {
                orientations = ['horizontal', 'vertical'];
            };
            if (this.game.level == 'medium') {
                orientations = ['horizontal', 'vertical', 'diagonal'];
            };
            if (this.game.level == 'hard') {
                orientations = ['horizontal', 'vertical', 'diagonal',
                                'horizontalBack', 'verticalUp',
                                'diagonalUp', 'diagonalBack',
                                'diagonalUpBack'];
            };

            this.puzzleGame = wordfind.newPuzzle(this.game.words,
                                        {height: 12, width:12,
                                         orientations: orientations,
                                         fillBlanks: true});

            this.puzzle = this.puzzleGame.matrix;
            this.wordLocations = this.puzzleGame.locations;

            // to debug, show the matrix in the console
            wordfind.print(this.puzzle);

            // calculate the end of every word
            for (var n = 0; n < this.wordLocations.length; n++) {
                var word = this.wordLocations[n];
                var nextFn = wordfind.orientations[word.orientation];
                var word_end = nextFn(word.x, word.y, word.word.length - 1);
                word.end_x = word_end.x;
                word.end_y = word_end.y;
            };
            // clean objects if the canvas was already used
            this.stage.removeAllChildren();
            this.stage.update();
            this.startup_animation();
        };

        this.startup_animation = function () {
            this.animation_runnning = true;
            // create boxes with letters for every row
            this.boxes = []
            for (var i = 0, height = this.puzzle.length; i < height; i++) {
                var row = this.puzzle[i];
                var y = 0;

                var bar = new createjs.Container();
                bar.x = 0;
                bar.y = 0;

                for (var j = 0, width = row.length; j < width; j++) {
                    var v_box = new createjs.Shape();
                    v_box.graphics.beginStroke("#000000").beginFill(
                        "#eeeeee").drawRect(this.cell_size * j, 0,
                                            this.cell_size, this.cell_size);
                    bar.addChild(v_box);

                    var letter = this.puzzle[i][j];
                    if (this.game.lowerCase) {
                        letter = letter.toLowerCase();
                    } else {
                        letter = letter.toUpperCase();
                    };
                    var text = new createjs.Text(letter,
                                             "24px Arial", "#000000");
                    text.x = this.cell_size * j + this.cell_size / 2;
                    text.y = y + this.cell_size / 3;
                    text.textAlign = "center";
                    bar.addChild(text);
                };
                bar.cache(0, 0, this.cell_size * row.length, this.cell_size);

                this.boxes.push(bar);
                this.stage.addChild(bar);
            };

            createjs.Ticker.setFPS(10);
            createjs.Ticker.addEventListener("tick", this.stage);

            if (soundLoaded && this.game.audioEnabled) {
                soundInstance.play();
            };

            // startup the animation
            createjs.Tween.get(this.boxes.pop()).to(
                {y:this.cell_size * this.boxes.length + this.margin_y}, 1000,
                createjs.Ease.bounceOut).wait(300).call(
                this.animateNextBox, [], this);

        };

        this.animateNextBox = function () {
            if (!this.animation_runnning) {
                this.stage.removeAllChildren();
                this.stage.update();
                return;
            };
            if (this.boxes.length > 0) {
                if (soundLoaded && this.game.audioEnabled) {
                    soundInstance.stop();
                    soundInstance.play();
                };
                createjs.Tween.get(this.boxes.pop()).to(
                    {y:this.cell_size * this.boxes.length + this.margin_y},
                    1000,
                    createjs.Ease.bounceOut).wait(300).call(
                    this.animateNextBox, [], this);
            } else {
                if (soundLoaded && this.game.audioEnabled) {
                    soundInstance.stop();
                };
                this.stage.removeAllChildren();
                this.startGame();
            };
        };

        this.getCell = function (x, y) {
            var cell_x = parseInt(x / this.cell_size);
            var cell_y = parseInt((y - this.margin_y) / this.cell_size);
            return [cell_x, cell_y];
        };

        this.startGame = function() {

            this.select_word_line = new createjs.Shape();

            this.container = new createjs.Container();
            this.container.x = 0;
            this.container.y = this.margin_y;

            // need a white background to receive the mouse events
            var background = new createjs.Shape();
            background.graphics.beginFill(
                "#ffffff").drawRect(
                0, 0,
                this.cell_size * this.puzzle.length,
                this.cell_size * this.puzzle.length);
            this.container.addChild(background);

            for (var i = 0, height = this.puzzle.length; i < height; i++) {
                var row = this.puzzle[i];
                var y = this.cell_size * i;
                var lettersRow = [];

                for (var j = 0, width = row.length; j < width; j++) {
                    var letter = this.puzzle[i][j];
                    if (this.game.lowerCase) {
                        letter = letter.toLowerCase();
                    } else {
                        letter = letter.toUpperCase();
                    };
                    var text = new createjs.Text(letter,
                                             "24px Arial", "#000000");
                    text.x = this.cell_size * j + this.cell_size / 2;
                    text.y = y + this.cell_size / 3;
                    text.textAlign = "center";
                    this.container.addChild(text);
                    lettersRow.push(text);
                };
                this.letters.push(lettersRow);
            };
            this.container.cache(0, 0, this.cell_size * this.puzzle.length,
                            this.cell_size * this.puzzle.length);
            this.stage.addChild(this.container);

            this.stage.addChild(this.select_word_line);

            this.stage.update();

            this.game.start();
        };

        this.stop = function() {
            // stop the animation
            this.animation_runnning = false;
        };

        this.changeCase = function () {
            for (var i = 0; i < this.letters.length; i++) {
                var lettersRow = this.letters[i];
                for (var j = 0; j < lettersRow.length; j++) {
                    var letter = this.letters[i][j];
                    if (this.game.lowerCase) {
                        letter.text = letter.text.toLowerCase();
                    } else {
                        letter.text = letter.text.toUpperCase();
                    };
                };
            };
            this.container.updateCache();
        };

        this.stage.on("pressup", function (event) {
            this.restoreAnimatedWord();
            this.verifyWord(this.start_cell, this.end_cell);
            this.start_cell = null;
            this.end_cell = null;
        }, this);

        this.stage.on('click', function (event) {
            if (this.animation_runnning) {
                // empty the list with the falling blocks
                // to end the animation
                this.boxes = [];
            };
        }, this);

        this.stage.on("pressmove", function (event) {
            if (!this.game.started) {
                return;
            };

            if (this.start_cell == null) {
                var cell = this.getCell(event.stageX, event.stageY);
                this.start_cell = [cell[0], cell[1]];
                this.end_cell = null;
                return;
            };

            var end_cell = this.getCell(event.stageX, event.stageY);
            if (this.end_cell != null &&
                (end_cell[0] == this.end_cell[0]) &&
                (end_cell[1] == this.end_cell[1])) {
                return;
            };
            this.end_cell = end_cell;
            this.select_word_line.graphics.clear();
            var color = createjs.Graphics.getRGB(0xe0e0e0, 1.0);
            this.markWord(this.start_cell, this.end_cell,
                          this.select_word_line, color, true);
            this.animateWord(this.start_cell, this.end_cell);

            // move the select word line to the top
            var topIndex = this.stage.getNumChildren() - 1;
            var selectWordIndex = this.stage.getChildIndex(
                this.select_word_line);
            if (topIndex != selectWordIndex) {
                this.stage.swapChildrenAt(topIndex, selectWordIndex);
            };
            this.stage.update();
        }, this);

        this.verifyWord = function(start_cell, end_cell) {
            if ((start_cell == null) || (end_cell == null)) {
                return;
            };
            for (var n = 0; n < this.wordLocations.length; n++) {
                var word = this.wordLocations[n];
                var nextFn = wordfind.orientations[word.orientation];
                var end_word = nextFn(start_cell[0], start_cell[1],
                                      word.word.length - 1);
                if ((word.x == start_cell[0] && word.y == start_cell[1] &&
                     word.end_x == end_cell[0] &&
                     word.end_y == end_cell[1]) ||
                    (word.end_x == start_cell[0] &&
                     word.end_y == start_cell[1] &&
                     word.x == end_cell[0] && word.y == end_cell[1])) {
                    // verify if was already marked
                    if (this.game.found.indexOf(word.word) > -1) {
                        continue;
                    };

                    var color = this.game.getWordColor(word.word, 1);
                    var found_word_line = new createjs.Shape();
                    this.markWord(start_cell, end_cell,
                                  found_word_line, color, false);

                    found_word_line.mouseEnabled = false;
                    this.stage.addChild(found_word_line);

                    // show in the word list
                    this.game.addFoundWord(word.word);

                };
            };
            this.select_word_line.graphics.clear();
            this.stage.update();
        };

        /*
        Draw a rounded rectangle over shape
        star_cell, end_cell = array of integer
        shape = createjs.Shape
        color = createjs.Graphics.getRGB
        */
        this.markWord = function(start_cell, end_cell, shape, color, fill) {

            var start_cell_x = start_cell[0];
            var start_cell_y = start_cell[1];

            var end_cell_x = end_cell[0];
            var end_cell_y = end_cell[1];

            var x1 = start_cell_x * this.cell_size + this.cell_size / 2;
            var y1 = this.margin_y + start_cell_y * this.cell_size +
                this.cell_size / 2;
            var x2 = end_cell_x * this.cell_size + this.cell_size / 2;
            var y2 = this.margin_y + end_cell_y * this.cell_size +
                this.cell_size / 2;

            var diff_x = x2 - x1;
            var diff_y = y2 - y1;
            var angle_rad = Math.atan2(diff_y, diff_x);
            var angle_deg = angle_rad * 180 / Math.PI;
            var distance = diff_x / Math.cos(angle_rad);
            if (Math.abs(angle_deg) == 90) {
                distance = Math.abs(diff_y);
            };

            var line_width = this.cell_size / 10;
            shape.graphics.setStrokeStyle(line_width, "round");
            if (fill) {
                shape.graphics.beginFill(color);
            } else {
                shape.graphics.beginStroke(color);
            };
            shape.graphics.drawRoundRect(
                -(this.cell_size - line_width) / 2,
                -(this.cell_size - line_width) / 2,
                distance + this.cell_size - line_width,
                this.cell_size - line_width,
                this.cell_size / 2);
            shape.graphics.endStroke();
            shape.rotation = angle_deg;
            shape.x = x1;
            shape.y = y1;
        };

        this.restoreAnimatedWord = function() {
            // restore the letters modified the last time
            for (var i = 0; i < this.animatedLetters.length; i++) {
                this.animatedLetters[i].visible = true;
            }
            this.animatedLetters = []
            this.container.updateCache();
        };

        this.animateWord = function(start_cell, end_cell) {
            this.restoreAnimatedWord();

            var start_cell_x = start_cell[0];
            var start_cell_y = start_cell[1];

            var end_cell_x = end_cell[0];
            var end_cell_y = end_cell[1];

            if (start_cell_x != end_cell_x) {
                var inclination = (end_cell_y - start_cell_y) /
                                  (end_cell_x - start_cell_x);
                var start = start_cell_x;
                var end = end_cell_x;
                if (start_cell_x > end_cell_x) {
                    start = end_cell_x;
                    end = start_cell_x;
                }

                for (var x = start; x <= end; x++) {
                    y = Math.round(start_cell_y + inclination *
                                   (x - start_cell_x));
                    if (y == NaN) {
                        y = start_cell_y;
                    }
                    this.animatedLetters.push(this.letters[y][x]);
                }
            } else {
                var start = start_cell_y;
                var end = end_cell_y;
                if (start_cell_y > end_cell_y) {
                    start = end_cell_y;
                    end = start_cell_y;
                }

                for (var y = start; y <= end; y++) {
                    this.animatedLetters.push(this.letters[y][start_cell_x]);
                }
            }

            // apply the effect over the selected letters
            for (var i = 0; i < this.animatedLetters.length; i++) {
                this.animatedLetters[i].visible = false;
            }
            this.container.updateCache();

        }

    };

    wordmatrix.View = MatrixView;

    return wordmatrix;
});



