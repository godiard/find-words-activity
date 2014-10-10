define(function (require) {
    var activity = require("sugar-web/activity/activity");
    var icon = require("sugar-web/graphics/icon");

    var dictstore = require("sugar-web/dictstore");

    require("easel");
    require("wordfind");
    require("tween");
    require("sound");

    var soundInstance;
    var soundLoaded = false;

    // Manipulate the DOM only when it is ready.
    require(['domReady!'], function (doc) {

        // Initialize the activity.
        activity.setup();

        // HERE GO YOUR CODE

        // initialize canvas size

        var is_xo = ((window.innerWidth == 1200) && (window.innerHeight == 900));
        var cell_size = 75;
        if (!is_xo) {
            toolbar_height = 55;
        }

        var wordListCanvas = document.getElementById("wordListCanvas");
        wordListCanvas.height = window.innerHeight - cell_size;
        wordListCanvas.width = window.innerWidth / 3;

        var gameCanvas = document.getElementById("gameCanvas");

        // game logic

        function Game(wordListCanvas, gameCanvas) {

            this.words = [];
            this.level = 'easy';
            this.found = [];
            this.started = false;
            this.lowerCase = false;
            this.colors = ['#e51c23', '#e91e63', '#9c27b0', '#673ab7',
                           '#3f51b5', '#5677fc', '#03a9f4', '#00bcd4',
                           '#009688', '#259b24', '#8bc34a', '#cddc39',
                           '#ffc107', '#ff9800', '#ff5722'];

            this.wordListView = new WordListView(wordListCanvas, this);
            this.matrixView = new MatrixView(gameCanvas, this);

            this.setLowerCase = function (lowerCase) {
                this.lowerCase = lowerCase;
                this.wordListView.changeCase();
                if (this.started) {
                    // change the matrix
                    this.matrixView.changeCase();
                }
            }

            this.addWords = function (words) {
                console.log('addWords ' + words.toString());
                var wordsAdded = [];
                for (var n = 0; n < words.length; n++) {
                    if (this.words.indexOf(words[n]) == -1) {
                        this.words.push(words[n]);
                        wordsAdded.push(words[n]);
                    }
                }
                this.wordListView.addWords(wordsAdded);
            }
        }

        function WordListView(canvas, game) {

            this.canvas = canvas;
            this.game = game;

            this.stage = new createjs.Stage(this.canvas);
            createjs.Ticker.setFPS(10);
            createjs.Ticker.addEventListener("tick", this.stage);

            this.wordHeight = 50;

            // the stage elements displaying every word in the word list
            this.wordElements = [];

            this.addWords = function (words) {
                if (words.length == 0) {
                    return;
                }
                word = words.pop();
                console.log('addWords ' + word);
                cont = new createjs.Container();
                cont.x = 20; // margin_x;
                cont.y = 0;
                padding = 10;

                var label;
                if (this.game.lowerCase) {
                    label = word.toLowerCase();
                } else {
                    label = word.toUpperCase();
                }
                text = new createjs.Text(label, "24px Arial", "#000000");
                text.x = text.getMeasuredWidth() / 2 + padding;
                text.y = padding;
                text.textAlign = "center";

                box = new createjs.Shape();
                box.graphics.beginFill(this.game.colors[this.game.words.indexOf(word)]
                    ).drawRoundRect(0, 0,
                               text.getMeasuredWidth() + padding * 2,
                               text.getMeasuredHeight()+ padding * 2, 20);
                cont.addChild(box);
                cont.addChild(text);

                cont.cache(0, 0,
                               text.getMeasuredWidth() + padding * 2,
                               text.getMeasuredHeight()+ padding * 2);
                this.stage.addChild(cont);

                this.wordElements.push(text);

                // startup the animation
                y_final_position = this.canvas.height - this.wordHeight *
                    this.wordElements.length;
                createjs.Tween.get(cont).to(
                    {y:y_final_position}, 1000,
                    createjs.Ease.bounceOut).wait(300).call(
                    this.addWords, [words], this);
            }

            this.changeCase = function () {
                for (var i = 0; i < this.wordElements.length; i++) {
                    word = this.wordElements[i];
                    if (this.game.lowerCase) {
                        word.text = word.text.toLowerCase();
                    } else {
                        word.text = word.text.toUpperCase();
                    }
                    word.parent.updateCache();
                }
            }

        }

        function MatrixView(canvas, game) {

            this.canvas = canvas;
            this.game = game;

            this.stage = new createjs.Stage(canvas);
            createjs.Touch.enable(this.stage);
            this.stage.mouseChildren = false;

            this.cell_size = 60;
            this.margin_x = 50;
            this.margin_y = 50;

            this.start_cell = null;
            this.end_cell = null;
            this.select_word_line = null;

            this.container;
            this.letters = [];

            this.init = function () {
                if (this.game.level == 'easy') {
                    orientations = ['horizontal', 'vertical'];
                }
                if (this.game.level == 'medium') {
                    orientations = ['horizontal', 'vertical', 'diagonal'];
                }
                if (this.game.level == 'hard') {
                    orientations = ['horizontal', 'vertical', 'diagonal',
                                    'horizontalBack', 'verticalUp',
                                    'diagonalUp', 'diagonalBack',
                                    'diagonalUpBack'];
                }

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
                    word = this.wordLocations[n];
                    var nextFn = wordfind.orientations[word.orientation];
                    word_end = nextFn(word.x, word.y, word.word.length - 1);
                    word.end_x = word_end.x;
                    word.end_y = word_end.y;
                    console.log(word);
                }
                this.startup_animation();
            }

            this.startup_animation = function () {

                // create boxes with letters for every row
                this.boxes = []
                for (var i = 0, height = this.puzzle.length; i < height; i++) {
                    row = this.puzzle[i];
                    y = 0;

                    bar = new createjs.Container();
                    bar.x = this.margin_x;
                    bar.y = 0;

                    for (var j = 0, width = row.length; j < width; j++) {
                        var v_box = new createjs.Shape();
                        v_box.graphics.beginStroke("#000000").beginFill(
                            "#eeeeee").drawRect(this.cell_size * j, 0,
                                                this.cell_size, this.cell_size);
                        bar.addChild(v_box);

                        letter = this.puzzle[i][j];
                        if (this.game.lowerCase) {
                            letter = letter.toLowerCase();
                        } else {
                            letter = letter.toUpperCase();
                        }
                        text = new createjs.Text(letter,
                                                 "24px Arial", "#000000");
                        text.x = this.cell_size * j + this.cell_size / 2;
                        text.y = y + this.cell_size / 3;
                        text.textAlign = "center";
                        bar.addChild(text);
                    }
                    bar.cache(0, 0, this.cell_size * row.length, this.cell_size);

                    this.boxes.push(bar);
                    this.stage.addChild(bar);
                }

                createjs.Ticker.setFPS(10);
                createjs.Ticker.addEventListener("tick", this.stage);

                //soundInstance.play();

                // startup the animation
                createjs.Tween.get(this.boxes.pop()).to(
                    {y:this.cell_size * this.boxes.length + this.margin_y}, 1000,
                    createjs.Ease.bounceOut).wait(300).call(
                    this.animateNextBox, [], this);

            }

            this.animateNextBox = function () {
                if (this.boxes.length > 0) {
                    //soundInstance.stop();
                    //soundInstance.play();
                    createjs.Tween.get(this.boxes.pop()).to(
                        {y:this.cell_size * this.boxes.length + this.margin_y}, 1000,
                        createjs.Ease.bounceOut).wait(300).call(
                        this.animateNextBox, [], this);
                } else {
                    //soundInstance.stop();
                    this.stage.clear();
                    createjs.Ticker.setPaused(true);
                    this.startGame();
                }
            }

            this.getCell = function (x, y) {
                cell_x = parseInt((x - this.margin_x) / this.cell_size);
                cell_y = parseInt((y - this.margin_y) / this.cell_size);
                // console.log('x = '+ x + ' y = ' + y + 'cell = ' + cell_x + ' ' + cell_y);
                return [cell_x, cell_y];
            }

            this.startGame = function() {

                // Enable touch interactions if supported on the current device:

                this.select_word_line = new createjs.Shape();

                this.container = new createjs.Container();
                this.container.x = this.margin_x;
                this.container.y = this.margin_y;

                var background = new createjs.Shape();
                background.graphics.beginFill(
                    "#eeeeee").drawRect(
                    0, 0,
                    this.cell_size * this.puzzle.length,
                    this.cell_size * this.puzzle.length);
                this.container.addChild(background);

                letters = [];
                for (var i = 0, height = this.puzzle.length; i < height; i++) {
                    row = this.puzzle[i];
                    y = this.cell_size * i;

                    var h_box = new createjs.Shape();
                    h_box.graphics.beginStroke("#000000").drawRect(
                        0, y, this.cell_size * row.length, this.cell_size);
                    this.container.addChild(h_box);

                    var v_box = new createjs.Shape();
                    h_box.graphics.beginStroke("#000000").drawRect(
                        this.cell_size * i, 0, this.cell_size,
                        this.cell_size * this.puzzle.length);
                    this.container.addChild(v_box);

                    for (var j = 0, width = row.length; j < width; j++) {
                        letter = this.puzzle[i][j];
                        if (this.game.lowerCase) {
                            letter = letter.toLowerCase();
                        } else {
                            letter = letter.toUpperCase();
                        }
                        text = new createjs.Text(letter,
                                                 "24px Arial", "#000000");
                        text.x = this.cell_size * j + this.cell_size / 2;
                        text.y = y + this.cell_size / 3;
                        text.textAlign = "center";
                        this.container.addChild(text);
                        this.letters.push(text);
                    }
                }
                this.container.cache(0, 0, this.cell_size * this.puzzle.length,
                                this.cell_size * this.puzzle.length);
                this.stage.addChild(this.container);

                this.stage.addChild(this.select_word_line);

                this.stage.update();

                this.game.started = true;
            }

            this.changeCase = function () {
                for (var i = 0; i < this.letters.length; i++) {
                    letter = this.letters[i];
                    if (this.game.lowerCase) {
                        letter.text = letter.text.toLowerCase();
                    } else {
                        letter.text = letter.text.toUpperCase();
                    }
                }
                this.container.updateCache();
            }

            this.stage.on("pressup", function (event) {
                this.verifyWord(this.start_cell, this.end_cell);
                this.start_cell = null;
                this.end_cell = null;
            }, this);

            this.stage.on("pressmove", function (event) {
                if (this.start_cell == null) {
                    cell = this.getCell(event.stageX, event.stageY);
                    this.start_cell = [cell[0], cell[1]];
                    this.end_cell = null;
                    return;
                }

                end_cell = this.getCell(event.stageX, event.stageY);
                if (this.end_cell != null &&
                    (end_cell[0] == this.end_cell[0]) &&
                    (end_cell[1] == this.end_cell[1])) {
                    return;
                }
                this.end_cell = end_cell;
                end_cell_x = this.end_cell[0];
                end_cell_y = this.end_cell[1];

                start_cell_x = this.start_cell[0];
                start_cell_y = this.start_cell[1];

                this.select_word_line.graphics.clear();
                this.select_word_line.graphics.beginStroke(
                    createjs.Graphics.getRGB(0xFF00FF, 0.2));
                this.select_word_line.graphics.setStrokeStyle(this.cell_size, "round");
                this.select_word_line.graphics.moveTo(
                    this.margin_x + start_cell_x * this.cell_size + this.cell_size / 2,
                    this.margin_y + start_cell_y * this.cell_size + this.cell_size / 2);
                this.select_word_line.graphics.lineTo(
                    this.margin_x + end_cell_x * this.cell_size + this.cell_size / 2,
                    this.margin_y + end_cell_y * this.cell_size + this.cell_size / 2);
                this.select_word_line.graphics.endStroke();
                this.stage.update();
            }, this);

            this.verifyWord = function(start_cell, end_cell) {
                for (var n = 0; n < this.wordLocations.length; n++) {
                    word = this.wordLocations[n];
                    var nextFn = wordfind.orientations[word.orientation];
                    end_word = nextFn(start_cell[0], start_cell[1],
                                      word.word.length - 1);
                    if ((word.x == start_cell[0] && word.y == start_cell[1] &&
                         word.end_x == end_cell[0] && word.end_y == end_cell[1]) ||
                        (word.end_x == start_cell[0] && word.end_y == start_cell[1] &&
                         word.x == end_cell[0] && word.y == end_cell[1])) {
                        // mark the word as found
                        found_word_line = new createjs.Shape();
                        found_word_line.graphics.beginStroke(
                            createjs.Graphics.getRGB(0xFF0000, 0.5));
                        found_word_line.graphics.setStrokeStyle(
                            this.cell_size, "round");
                        found_word_line.graphics.moveTo(
                            this.margin_x + start_cell[0] * this.cell_size + this.cell_size / 2,
                            this.margin_y + start_cell[1] * this.cell_size + this.cell_size / 2);
                        found_word_line.graphics.lineTo(
                            this.margin_x + end_cell[0] * this.cell_size + this.cell_size / 2,
                            this.margin_y + end_cell[1] * this.cell_size + this.cell_size / 2);
                        found_word_line.graphics.endStroke();
                        found_word_line.mouseEnabled = false;
                        this.stage.addChild(found_word_line);

                        // TODO: show in the word list
                        //$('.' + word.word.toLowerCase()).addClass('wordFound');
                    }
                }
                this.select_word_line.graphics.clear();
                this.stage.update();
            }

        }


        var game = new Game(wordListCanvas, gameCanvas);

        // toolbar
        var upperLowerButton = document.getElementById("upperlower-button");
        upperLowerButton.onclick = function () {
            this.classList.toggle('active');
            lowercase = this.classList.contains('active');
            game.setLowerCase(lowercase);
        };

        // datastore
        var wordList = [];

        function onStoreReady() {
            if (localStorage["word-list"]) {
                var jsonData = localStorage["word-list"];
                wordList = JSON.parse(jsonData);
                game.addWords(wordList);
            }
        }

        dictstore.init(onStoreReady);

        /*
        var saveWordsButton = document.getElementById("save-words-button");
        saveWordsButton.addEventListener('click', function (e) {
            selectWords = doc.getElementById("selectWords");
            children = selectWords.childNodes;
            wordList = [];
            for (var n = 0; n < children.length; n++) {
                child = children[n];
                if (child.type == 'text') {
                    if (child.value.length > 0) {
                        // check minimal word size
                        if (child.value.length < 3) {
                            child.focus();
                            activity.showAlert('ERROR',
                                'Words should be at least 3 character long',
                                null, function() {child.focus();});
                            return;
                        }
                        word = child.value;
                        if (wordList.indexOf(word) == -1) {
                            wordList.push(word);
                        }
                    }
                }
            }
            // save in the journal
            localStorage["word-list"] = JSON.stringify(wordList);
            dictstore.save();

            // load the sound
            soundSrc = "sounds/card.ogg";
            createjs.Sound.alternateExtensions = ["mp3"];
            createjs.Sound.addEventListener("fileload", soundReady);
            createjs.Sound.registerSound(soundSrc);
            soundInstance = createjs.Sound.createInstance(soundSrc);

        });
        */

        var startGameButton = document.getElementById("start-game-button");
        startGameButton.addEventListener('click', function (e) {
            document.getElementById("firstPage").style.display = "none";
            document.getElementById("gameCanvas").style.display = "block";
            game.matrixView.init();
        });


        // not allow input special characters, number or spaces in the words
        var iChars = "0123456789!¡~@#$%^&*()+=-[]\\\';,./{}|\":<>?¿ ";
        /*
        children = doc.getElementById("selectWords").childNodes;
        for (var n = 0; n < children.length; n++) {
            child = children[n];
            if (child.type == 'text') {
                child.addEventListener('keyup', function(e) {
                    var str = $.trim(e.target.value);
                    if ( str != "" ) {
                        new_str = '';
                        for (var i = 0; i < str.length; i++) {
                            if (iChars.indexOf(str.charAt(i)) == -1) {
                                new_str = new_str + str.charAt(i);
                            };
                        };
                        e.target.value = new_str;
                    };
                });
            };
        };
        */

        var addWordButton = document.getElementById("add-word-button");
        addWordButton.addEventListener('click', function (e) {
            var wordInput = document.getElementById("word-input");
            game.addWords([wordInput.value]);
            wordInput.value = '';
            wordInput.focus();
            // save in the journal
            localStorage["word-list"] = JSON.stringify(game.words);
            dictstore.save();
        });

        /*
        var showWordListButton = document.getElementById(
            "show-wordlist-button");
        showWordListButton.addEventListener('click', function (e) {
            // change the page
            document.getElementById("secondPage").style.display = "none";
            document.getElementById("firstPage").style.display = "block";
        });

        var easyButton = document.getElementById("easy-button");
        easyButton.addEventListener('click', function (e) {
            startGame('easy');
        });

        var mediumButton = document.getElementById("medium-button");
        mediumButton.addEventListener('click', function (e) {
            startGame('medium');
        });

        var hardButton = document.getElementById("hard-button");
        hardButton.addEventListener('click', function (e) {
            startGame('hard');
        });
        */

        function soundReady(event) {
            console.log('Sound loaded');
            soundLoaded = true;
        }

        //
    });

});
