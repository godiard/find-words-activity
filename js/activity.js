define(function (require) {
    var activity = require("sugar-web/activity/activity");
    var icon = require("sugar-web/graphics/icon");

    var dictstore = require("sugar-web/dictstore");

    require("easel");
    require("wordfind");
    require("tween");
    require("CSSPlugin");
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

        // load the sound
        soundSrc = "sounds/card.ogg";
        createjs.Sound.alternateExtensions = ["mp3"];
        createjs.Sound.addEventListener("fileload", soundReady);
        createjs.Sound.registerSound(soundSrc);
        soundInstance = createjs.Sound.createInstance(soundSrc);

        function soundReady(event) {
            console.log('Sound loaded');
            soundLoaded = true;
        };

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
            this.audioEnabled = true;

            this.wordListView = new WordListView(wordListCanvas, this);
            this.matrixView = new MatrixView(gameCanvas, this);

            this.setLowerCase = function (lowerCase) {
                this.lowerCase = lowerCase;
                this.wordListView.changeCase();
                if (this.started) {
                    // change the matrix
                    this.matrixView.changeCase();
                };
            };

            this.enableAudio = function (enable) {
                this.audioEnabled = enable;
            };

            this.addWords = function (words) {
                console.log('addWords ' + words.toString());
                var wordsAdded = [];
                for (var n = 0; n < words.length; n++) {
                    if (this.words.indexOf(words[n]) == -1) {
                        this.words.push(words[n]);
                        wordsAdded.push(words[n]);
                    };
                };
                this.wordListView.addWords(wordsAdded);
            };

            this.addFoundWord = function (word) {
                this.found.push(word);
                this.wordListView.markFound(word);
            };

            this.restartWordList = function() {
                this.wordListView.unmarkAll();
            };

            this.getWordColor = function(word, alpha) {
                var color = createjs.Graphics.getRGB(0xcccccc, alpha);
                index = this.words.indexOf(word);
                if (index < this.colors.length) {
                    hexa_color = this.colors[index];
                    r = parseInt(hexa_color.substr(1, 2), 16);
                    g = parseInt(hexa_color.substr(3, 2), 16);
                    b = parseInt(hexa_color.substr(5, 2), 16);
                    color = createjs.Graphics.getRGB(r, g, b, alpha);
                };
                return color;
            };

            this.start = function() {
                this.started = true;
                this.wordListView.gameStarted();
            };

            this.stop = function() {
                if (this.started) {
                    this.started = false;
                } else {
                    // stop the animation
                    this.matrixView.stop();
                }
                this.found = [];
                this.restartWordList();
            };

            this.removeWord = function(word) {
                if (this.words.indexOf(word) > -1) {
                    this.words.splice(this.words.indexOf(word), 1);
                    localStorage["word-list"] = JSON.stringify(this.words);
                    dictstore.save();
                }
            };

        }

        function WordListView(canvas, game) {

            this.canvas = canvas;
            this.game = game;
            this.selectedWord = null;
            this.onAnimation = false;

            this.stage = new createjs.Stage(this.canvas);
            createjs.Ticker.setFPS(10);
            createjs.Ticker.addEventListener("tick", this.stage);

            // add a background
            this.background = new createjs.Shape();
            this.background.graphics.beginFill(
                createjs.Graphics.getRGB(0xe0e0e0)
                ).drawRect(0, 0, this.canvas.width, this.canvas.height);
            this.stage.addChild(this.background);

            this.wordHeight = 50;

            this.deleteButton = new createjs.Container();
            this.deleteButtonImg = new createjs.Bitmap("icons/minus.svg");
            this.deleteButton.visible = false;
            this.deleteButton.addChild(this.deleteButtonImg);
            this.stage.addChild(this.deleteButton);

            this.stage.on('click', function (event) {
                if (this.game.started) {
                    return;
                };

                if (event.target == this.background) {
                    this.deleteButton.visible = false;
                    this.selectedWord = null;
                };
            }, this);

            this.deleteButton.on('click', function (event) {
                if (this.game.started) {
                    return;
                };

                if (this.selectedWord != null) {
                    this.game.removeWord(this.selectedWord.word);

                    this.stage.removeChild(this.selectedWord);
                    this.deleteButton.visible = false;

                    var found = false;
                    // animate the pending blocks
                    delay = 100;
                    for (var n = 0; n < this.wordElements.length; n++) {
                        textElement = this.wordElements[n];
                        if (textElement.text.toUpperCase() ==
                            this.selectedWord.word) {
                            found = true;
                        }
                        if (found) {
                            var cont = textElement.parent;
                            var y_final_position = cont.y + this.wordHeight;
                            createjs.Tween.get(cont).wait(delay).to(
                                {y:y_final_position}, 1000,
                                createjs.Ease.bounceOut);
                            delay = delay + 100;
                        }
                    };

                    this.selectedWord = null;

                };
            }, this);

            // the stage elements displaying every word in the word list
            this.wordElements = [];

            this.addWords = function (words) {
                if (words.length == 0) {
                    this.onAnimation = false;
                    return;
                }
                this.onAnimation = true;
                word = words.pop();
                var cont = new createjs.Container();
                cont.x = 20; // margin_x;
                cont.y = 0;
                cont.mouseChildren = false;

                var alpha = 1.0;
                if (this.game.found.indexOf(word.toUpperCase()) > -1) {
                    alpha = 0.25;
                }
                var text = this.addRoundedLabel(cont, word, alpha);
                cont.word = word.toUpperCase();

                this.stage.addChild(cont);

                this.wordElements.push(text);

                // startup the animation
                y_final_position = this.canvas.height - this.wordHeight *
                    this.wordElements.length;
                createjs.Tween.get(cont).to(
                    {y:y_final_position}, 800,
                    createjs.Ease.bounceOut).wait(100).call(
                    this.addWords, [words], this);
            }

            this.addRoundedLabel = function(cont, word, alpha) {
                var padding = 10;
                var label;
                if (this.game.lowerCase) {
                    label = word.toLowerCase();
                } else {
                    label = word.toUpperCase();
                }
                var text = new createjs.Text(label, "24px Arial", "#000000");
                text.x = text.getMeasuredWidth() / 2 + padding;
                text.y = padding;
                text.textAlign = "center";

                var box = new createjs.Shape();
                box.graphics.beginFill(this.game.getWordColor(word, alpha)
                    ).drawRoundRect(0, 0,
                               text.getMeasuredWidth() + padding * 2,
                               text.getMeasuredHeight()+ padding * 2, 20);
                cont.addChild(box);
                cont.addChild(text);

                cont.cache(0, 0,
                               text.getMeasuredWidth() + padding * 2,
                               text.getMeasuredHeight()+ padding * 2);
                cont.width = text.getMeasuredWidth() + padding * 2;
                cont.height = text.getMeasuredHeight()+ padding * 2;

                cont.on('click', function (event) {
                    // if the game already started or the words are falling,
                    // do nothing
                    if (this.game.started || this.onAnimation) {
                        return;
                    };

                    if (event.target != this.selectedWord) {
                        cont = event.target;
                        this.selectedWord = cont;
                        // set the position of deleteButton and make visible
                        this.deleteButton.y = cont.y;
                        this.deleteButton.x = cont.x + cont.width + padding;

                        rect = this.deleteButtonImg.getBounds();
                        scale = cont.height / rect.height;
                        this.deleteButtonImg.scaleX = scale;
                        this.deleteButtonImg.scaleY = scale;

                        this.deleteButton.visible = true;
                    };
                }, this);

                return text;
            }

            this.changeCase = function () {
                for (var i = 0; i < this.wordElements.length; i++) {
                    word = this.wordElements[i];
                    if (this.game.lowerCase) {
                        word.text = word.text.toLowerCase();
                    } else {
                        word.text = word.text.toUpperCase();
                    };
                    word.parent.updateCache();
                };
            };

            this.markFound = function (foundWord) {
                for (var i = 0; i < this.wordElements.length; i++) {
                    word = this.wordElements[i];
                    if (word.text.toUpperCase() == foundWord) {
                        console.log('markFound ' + foundWord);
                        cont = word.parent;
                        cont.removeAllChildren();
                        text = this.addRoundedLabel(cont, foundWord, 0.25);
                        // update the reference in wordList
                        this.wordElements[i] = text;
                        this.stage.update();
                        break;
                    };
                };
            };

            this.unmarkAll = function () {
                for (var i = 0; i < this.wordElements.length; i++) {
                    word = this.wordElements[i];
                    text = word.text;
                    cont = word.parent;
                    cont.removeAllChildren();
                    // update the reference in wordList
                    this.wordElements[i] = this.addRoundedLabel(cont, text, 1);
                };
                this.stage.update();
            };

            this.gameStarted = function() {
                this.deleteButton.visible = false;
            };

        };

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
            this.animation_runnning = false;

            this.init = function () {
                var orientations;
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
                }
                // clean objects if the canvas was already used
                this.stage.removeAllChildren();
                this.stage.update();
                this.startup_animation();
            }

            this.startup_animation = function () {
                this.animation_runnning = true;
                // create boxes with letters for every row
                this.boxes = []
                for (var i = 0, height = this.puzzle.length; i < height; i++) {
                    row = this.puzzle[i];
                    y = 0;

                    bar = new createjs.Container();
                    bar.x = 0;
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

                if (soundLoaded && this.game.audioEnabled) {
                    soundInstance.play();
                }

                // startup the animation
                createjs.Tween.get(this.boxes.pop()).to(
                    {y:this.cell_size * this.boxes.length + this.margin_y}, 1000,
                    createjs.Ease.bounceOut).wait(300).call(
                    this.animateNextBox, [], this);

            }

            this.animateNextBox = function () {
                if (!this.animation_runnning) {
                    this.stage.removeAllChildren();
                    this.stage.update();
                    return;
                }
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
                }
            }

            this.getCell = function (x, y) {
                cell_x = parseInt(x / this.cell_size);
                cell_y = parseInt((y - this.margin_y) / this.cell_size);
                return [cell_x, cell_y];
            }

            this.startGame = function() {

                this.select_word_line = new createjs.Shape();

                this.container = new createjs.Container();
                this.container.x = 0;
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

                this.game.start();
            }

            this.stop = function() {
                // stop the animation
                this.animation_runnning = false;
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

            this.stage.on('click', function (event) {
                if (this.animation_runnning) {
                    // empty the list with the falling blocks
                    // to end the animation
                    this.boxes = [];
                }
            }, this);

            this.stage.on("pressmove", function (event) {
                if (!this.game.started) {
                    return;
                }

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
                this.select_word_line.graphics.clear();
                color = createjs.Graphics.getRGB(0xFF0000, 0.5);
                this.markWord(this.start_cell, this.end_cell,
                              this.select_word_line, color);

                // move the select word line to the top
                topIndex = this.stage.getNumChildren() - 1;
                selectWordIndex = this.stage.getChildIndex(
                    this.select_word_line);
                if (topIndex != selectWordIndex) {
                    this.stage.swapChildrenAt(topIndex, selectWordIndex);
                }
                this.stage.update();
            }, this);

            this.verifyWord = function(start_cell, end_cell) {
                if ((start_cell == null) || (end_cell == null)) {
                    return;
                }
                for (var n = 0; n < this.wordLocations.length; n++) {
                    word = this.wordLocations[n];
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
                                      found_word_line, color);

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
            this.markWord = function(start_cell, end_cell, shape, color) {

                start_cell_x = start_cell[0];
                start_cell_y = start_cell[1];

                end_cell_x = end_cell[0];
                end_cell_y = end_cell[1];

                var x1 = start_cell_x * this.cell_size + this.cell_size / 2;
                var y1 = this.margin_y + start_cell_y * this.cell_size +
                    this.cell_size / 2;
                var x2 = end_cell_x * this.cell_size + this.cell_size / 2;
                var y2 = this.margin_y + end_cell_y * this.cell_size +
                    this.cell_size / 2;

                diff_x = x2 - x1;
                diff_y = y2 - y1;
                angle_rad = Math.atan2(diff_y, diff_x);
                angle_deg = angle_rad * 180 / Math.PI;
                distance = diff_x / Math.cos(angle_rad);
                if (Math.abs(angle_deg) == 90) {
                    distance = Math.abs(diff_y);
                };

                line_width = this.cell_size / 10;
                shape.graphics.setStrokeStyle(line_width, "round");
                shape.graphics.beginStroke(color);
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

        };

        var game = new Game(wordListCanvas, gameCanvas);

        // toolbar
        var upperLowerButton = document.getElementById("upperlower-button");
        upperLowerButton.onclick = function () {
            this.classList.toggle('active');
            lowercase = this.classList.contains('active');
            game.setLowerCase(lowercase);
        };

        var backButton = document.getElementById("back-button");
        backButton.addEventListener('click', function (e) {
            document.getElementById("firstPage").style.display = "block";
            document.getElementById("gameCanvas").style.display = "none";
            game.stop();
        });

        var audioButton = document.getElementById("audio-button");
        audioButton.onclick = function () {
            this.classList.toggle('active');
            enable = !this.classList.contains('active');
            game.enableAudio(enable);
            localStorage["audio-enabled"] = enable;
            dictstore.save();
        };

        // datastore
        var wordList = [];

        function onStoreReady() {
            if (localStorage["word-list"]) {
                var jsonData = localStorage["word-list"];
                wordList = JSON.parse(jsonData);
                game.addWords(wordList);
                setLevel(localStorage["level"]);
                game.enableAudio(localStorage["audio-enabled"] == 'true');
                if (!game.audioEnabled){
                    audioButton.classList.toggle('active');
                };
            };
        };

        dictstore.init(onStoreReady);

        var startGameButton = document.getElementById("start-game-button");
        startGameButton.addEventListener('click', function (e) {
            document.getElementById("firstPage").style.display = "none";
            document.getElementById("gameCanvas").style.display = "block";
            game.matrixView.init();
        });

        // not allow input special characters, number or spaces in the words
        var iChars = "0123456789!¡~@#$%^&*()+=-[]\\\';,./{}|\":<>?¿ ";

        var wordInput = document.getElementById("word-input");
        var errorArea = document.getElementById("validation-error");
        var addWordButton = document.getElementById("add-word-button");

        createjs.CSSPlugin.install(createjs.Tween);
        createjs.Ticker.setFPS(10);

        addWordButton.addEventListener('click', function (e) {
            addWord();
        });

        wordInput.addEventListener('keypress', function (e) {
            hideError();
            if (e.which == 13) {
                addWord();
            };
        });

        function validateWord(word) {
            if (word.length < 3) {
                showError('Must be at least 3 letters');
                return false;
            };
            for (var i = 0; i < word.length; i++) {
                if (iChars.indexOf(word.charAt(i)) > -1) {
                    showError('Remove all punctuation');
                    return false;
                };
            };
            hideError();
            return true;
        };

        function showError(msg) {
            buttonPos = findPosition(addWordButton);
            console.log('POSITION ' + buttonPos.left + ' ' + buttonPos.top);
            errorArea.innerHTML = '<div id="validation-error-msg">' + msg +
                '</div>';
            errorArea.style.left = buttonPos.left + 'px';
            errorArea.style.top = buttonPos.top + 'px';
            errorArea.style.opacity = "0.1";
            errorArea.style.display = "block";

            createjs.Tween.get(errorArea).set({opacity:"1.0"},
                               errorArea.style, 3000);

        };

        function hideError() {
            errorArea.style.display = "none";
        };

        function findPosition(obj) {
            var left = 0;
            var top = 0;
            if (obj.offsetParent) {
                while(1) {
                    left += obj.offsetLeft;
                    top += obj.offsetTop;
                    if(!obj.offsetParent)
                        break;
                    obj = obj.offsetParent;
                }
            } else
                if(obj.x) {
                    left += obj.x;
                    top += obj.y;
                    }
            return {left:left, top: top};
        };

        function addWord() {
            if (!validateWord(wordInput.value)) {
                return;
            }
            game.addWords([wordInput.value.toUpperCase()]);
            wordInput.value = '';
            wordInput.focus();
            // save in the journal
            localStorage["word-list"] = JSON.stringify(game.words);
            dictstore.save();
        };

        // level buttons
        var easyButton = document.getElementById("easy-button");
        var mediumButton = document.getElementById("medium-button");
        var hardButton = document.getElementById("hard-button");

        function setLevel(level) {
            easyButton.classList.remove('active');
            mediumButton.classList.remove('active');
            hardButton.classList.remove('active');
            game.level = level;
            if (level == 'easy') {
                easyButton.classList.toggle('active');
            } else if (level == 'medium') {
                mediumButton.classList.toggle('active');
            } else if (level == 'hard') {
                hardButton.classList.toggle('active');
            };
            if (localStorage["level"] != level) {
                localStorage["level"] = level;
                dictstore.save();
            }
        };

        easyButton.addEventListener('click', function (e) {
            setLevel('easy');
        });

        mediumButton.addEventListener('click', function (e) {
            setLevel('medium');
        });

        hardButton.addEventListener('click', function (e) {
            setLevel('hard');
        });

    });

});
