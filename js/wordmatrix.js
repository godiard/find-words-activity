define(function (require) {

    require("easel");
    require("tween");
    require("sound");

    var soundLoaded = false;
    var onAndroid = /Android/i.test(navigator.userAgent);
    // xo-1 is too slow to load the sound files
    var loadSounds = (navigator.userAgent.indexOf("Linux i586") == -1);
    // the xo-1 is too slow to show the dancing letters
    var enableAnimations = loadSounds;

    var smallScreen = (window.innerWidth < 700) || (window.innerHeight < 600);
    var font = smallScreen ? "16px Arial" : "24px Arial";

    var soundsPath = 'sounds/';

    if (loadSounds) {
        var soundManifest = [
            {id:"rain", src: "light_rain_on_porch_without_wind.ogg"},
            {id:"bell", src: "small_bell.ogg"},
            {id:"trumpet", src: "bugle_music_chargel.ogg"}];
    } else {
        var soundManifest = [];
    };

    if (!onAndroid) {
        // load the sound
        createjs.Sound.alternateExtensions = ["mp3"];
        createjs.Sound.addEventListener("fileload", soundReady);
        createjs.Sound.registerManifest(soundManifest, soundsPath);
    };

    function soundReady(event) {
        console.log('Sound loaded!!!!!!!!!!');
        soundLoaded = true;
    };

    function playAudio(id) {
        var src = null;
        for (var i in soundManifest) {
            var mediaInfo = soundManifest[i];
            if (mediaInfo['id'] == id) {
                src = soundsPath + mediaInfo['src']
            }
        }
        if (src == null) {
            return;
        };

        if (onAndroid) {
            // Android needs the search path explicitly specified
            console.log("Using Phonegap media on Android");
            src = '/android_asset/www/' + src;
            // and use the mp3 files
            src = src.replace(".ogg", ".mp3");
            var mediaRes = new Media(src,
                function onSuccess() {
                    // release the media resource once finished playing
                    mediaRes.release();
                },
                function onError(e){
                    console.log("error playing sound: " + JSON.stringify(e));
                });
            mediaRes.play();
            return mediaRes;
        } else {
            return createjs.Sound.play(id);
        }
    }

    wordmatrix = {};

    function MatrixView(canvas, game) {

        this.canvas = canvas;
        this.game = game;

        this.stage = new createjs.Stage(canvas);
        // Enable touch interactions if supported on the current device
        createjs.Touch.enable(this.stage);
        this.stage.mouseChildren = false;

        this.start_cell = null;
        this.end_cell = null;
        this.select_word_line = null;

        this.container;
        this.letters = [];
        this.animatedLetters = [];
        this.animationContainer = null;

        this.animation_runnning = false;
        this.soundInstance = null;
        this.tick_listener = null;

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
            console.log('matrix size ' + this.puzzle.length);
            this.cell_size = canvas.width / this.puzzle.length;
            this.margin_y = (canvas.height - this.cell_size *
                             this.puzzle.length) / 2;

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

            this.letters = [];
            this.animatedLetters = [];

        };

        this.startup_animation = function () {
            if (this.game.audioEnabled) {
                this.soundInstance = playAudio('rain');
            };

            this.animation_runnning = true;
            var animatedLetters = [];
            for (var i = 0, height = this.puzzle.length; i < height; i++) {
                var row = this.puzzle[i];
                animatedLetters.push([]);
                for (var j = 0, width = row.length; j < width; j++) {

                    var letter = this.puzzle[i][j];
                    if (this.game.lowerCase) {
                        letter = letter.toLowerCase();
                    } else {
                        letter = letter.toUpperCase();
                    };
                    var text = new createjs.Text(letter,
                                             font, "#000000");
                    text.x = this.cell_size * j + this.cell_size / 2;
                    text.y = this.margin_y + this.cell_size / 3;
                    text.textAlign = "center";
                    animatedLetters[animatedLetters.length -1].push(text);
                    this.stage.addChild(text);
                };
            };

            this.tick_listener = createjs.Ticker.addEventListener("tick",
                                                                  this.stage);

            for (var i = 0, height = this.puzzle.length; i < height; i++) {
                delay = Math.random() * 4000;
                for (var j = 0, width = row.length; j < width; j++) {
                    text = animatedLetters[j][i];
                    endY = this.cell_size * j + this.cell_size / 3 + this.margin_y;
                    createjs.Tween.get(text).wait(delay).to(
                        {y:endY}, 1000);
                };
            };
            createjs.Tween.get(this.stage).wait(5000).call(
                this.startGame, [], this);

        };


        this.getCell = function (x, y) {
            var cell_x = parseInt(x / this.cell_size);
            var cell_y = parseInt((y - this.margin_y) / this.cell_size);
            return [cell_x, cell_y];
        };

        this.startGame = function() {
            if (this.soundInstance != null) {
                this.soundInstance.stop();
            }
            createjs.Ticker.off('tick', this.tick_listener);

            this.stage.removeAllChildren();

            this.select_word_line = new createjs.Shape();
            this.animationContainer = new createjs.Container();
            this.animationContainer.x = 0;
            this.animationContainer.y = this.margin_y;

            this.wordsFoundcontainer = new createjs.Container();
            this.wordsFoundcontainer.x = 0;
            this.wordsFoundcontainer.y = 0;

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
            this.container.hitArea = background;

            // HACK: the webkit version we use in android have a bug and don't
            // update properly the screen after the animation,
            // and the first line in the matrix is corrupted, showing
            // all the letter superimposed. Now we are using a transparent
            // background and a gradient in the div containing the canvas
            // this bandaid is a white rectangle over that letters,
            // just to hide it.
            var bandaid = new createjs.Shape();
            bandaid.graphics.beginFill(
                "#ffffff").drawRect(
                0, 0,
                this.cell_size * this.puzzle.length, this.cell_size * 2);
            this.container.addChild(bandaid);

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
                                             font, "#000000");
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

            this.stage.addChild(this.wordsFoundcontainer);
            this.stage.addChild(this.select_word_line);
            this.stage.addChild(this.animationContainer);

            this.stage.update();
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
            this.stage.update();
        };

        this.stage.on("pressup", function (event) {
            if (enableAnimations) {
                this.restoreAnimatedWord();
                this.hideDancingLetters();
            };
            this.verifyWord(this.start_cell, this.end_cell);
            this.start_cell = null;
            this.end_cell = null;
        }, this);

        this.stage.on('mousedown', function (event) {
            var cell = this.getCell(event.stageX, event.stageY);
            this.select_word_line.graphics.clear();
            var color = createjs.Graphics.getRGB(0xe0e0e0, 1.0);
            this.markWord(cell, cell,
                          this.select_word_line, color, true);
            if (enableAnimations) {
                this.prepareWordAnimation(cell, cell);
                this.showDancingLetters();
            } else {
                this.stage.update();
            };
            if (this.start_cell == null) {
                this.start_cell = [cell[0], cell[1]];
                this.end_cell = null;
            };
        }, this);

        this.stage.on("pressmove", function (event) {
            if (!this.game.started) {
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
            if (enableAnimations) {
                this.prepareWordAnimation(this.start_cell, this.end_cell);
                this.showDancingLetters();
            };
            this.stage.update();
        }, this);

        this.verifyWord = function(start_cell, end_cell) {
            if ((start_cell != null) && (end_cell != null)) {
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
                        this.wordsFoundcontainer.addChild(found_word_line);

                        // show in the word list
                        var finished = this.game.addFoundWord(word.word);
                        if (this.game.audioEnabled) {
                            if (finished) {
                                playAudio('trumpet');
                            } else {
                                playAudio('bell');
                            };
                        };
                    };
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
            var x1 = start_cell_x * this.cell_size + this.cell_size / 2;
            var y1 = this.margin_y + start_cell_y * this.cell_size +
                this.cell_size / 2;

            if (start_cell != end_cell) {
                var end_cell_x = end_cell[0];
                var end_cell_y = end_cell[1];
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
            } else {
                var angle_deg = 0;
                var distance = 0;
            };

            var line_width = this.cell_size / 10;
            shape.graphics.setStrokeStyle(line_width, "round");
            if (fill && enableAnimations) {
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
            this.animatedLetters = []
            this.animationContainer.removeAllChildren();
        };

        this.prepareWordAnimation = function(start_cell, end_cell) {
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
                };

                for (var x = start; x <= end; x++) {
                    y = Math.round(start_cell_y + inclination *
                                   (x - start_cell_x));
                    if (y == NaN) {
                        y = start_cell_y;
                    };
                    this.animatedLetters.push(this.letters[y][x]);
                };
            } else {
                var start = start_cell_y;
                var end = end_cell_y;
                if (start_cell_y > end_cell_y) {
                    start = end_cell_y;
                    end = start_cell_y;
                };

                for (var y = start; y <= end; y++) {
                    this.animatedLetters.push(this.letters[y][start_cell_x]);
                };
            };

        };

        this.showDancingLetters = function() {
            // apply the effect over the selected letters
            for (var i = 0; i < this.animatedLetters.length; i++) {
                matrixLetter = this.animatedLetters[i];
                // add another letter to animate
                var text = new createjs.Text(matrixLetter.text,
                                         font, "#FFFFFF");
                text.x = matrixLetter.x;
                text.y = matrixLetter.y + text.getMeasuredHeight() / 2;
                text.textAlign = "center";
                // this is needed to set the rotation center
                text.regY = text.getMeasuredHeight() / 2;
                text.scaleX = 1.5;
                text.scaleY = 1.5;
                text.rotation = 45;

                createjs.Tween.get(text, {loop:true}).to(
                    {rotation:-90}, 600).to(
                    {rotation:90}, 600);

                this.animationContainer.addChild(text);
            };
        };

        this.hideDancingLetters = function() {
            this.animationContainer.removeAllChildren();
        };

    };

    wordmatrix.View = MatrixView;

    return wordmatrix;
});



