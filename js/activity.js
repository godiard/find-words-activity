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
    var lowercase = false;
    var gameStarted = false;

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

        // game logic

        function Game(wordListCanvas) {

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

            this.setLowerCase = function (lowerCase) {
                this.lowerCase = lowerCase;
                this.wordListView.changeCase();
                /*
                if (this.started) {
                    // change the matrix
                    changeUpperLowerCase();
                }
                */
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

        var game = new Game(wordListCanvas);

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
            // change the page
            document.getElementById("firstPage").style.display = "none";
            document.getElementById("secondPage").style.display = "block";

            // load the sound
            soundSrc = "sounds/card.ogg";
            createjs.Sound.alternateExtensions = ["mp3"];
            createjs.Sound.addEventListener("fileload", soundReady);
            createjs.Sound.registerSound(soundSrc);
            soundInstance = createjs.Sound.createInstance(soundSrc);

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


        var puzzle;
        var wordLocations;

        var stage;
        var cell_size = 60;
        var margin_x = 50;
        var margin_y = 50;

        var start_cell = null;
        var end_cell = null;
        var select_word_line = null;

        var boxes;
        var container;
        var letters;

        var end_cell_x;
        var end_cell_y;

        function startGame(level) {

            // change the page
            document.getElementById("secondPage").style.display = "none";
            document.getElementById("testCanvas").style.display = "block";

            if (level == 'easy') {
                orientations = ['horizontal', 'vertical'];
            }
            if (level == 'medium') {
                orientations = ['horizontal', 'vertical', 'diagonal'];
            }
            if (level == 'hard') {
                orientations = ['horizontal', 'vertical', 'diagonal',
                                'horizontalBack', 'verticalUp',
                                'diagonalUp', 'diagonalBack',
                                'diagonalUpBack'];
            }

            var puzzleGame = wordfind.newPuzzle(wordList,
                                        {height: 12, width:12,
                                         orientations: orientations,
                                         fillBlanks: true});

            puzzle = puzzleGame.matrix;
            wordLocations = puzzleGame.locations;

            // to debug, show the matrix in the console
            wordfind.print(puzzle);

            // show the words
            drawWords("#words", wordList);

            for (var n = 0; n < wordLocations.length; n++) {
                word = wordLocations[n];
                var nextFn = wordfind.orientations[word.orientation];
                word_end = nextFn(word.x, word.y, word.word.length - 1);
                // store it on the solved structure
                word.end_x = word_end.x;
                word.end_y = word_end.y;
                console.log(word);
            }

            canvas = doc.getElementById("testCanvas");
            stage = new createjs.Stage(canvas);

            startup_animation();

        }

        function soundReady(event) {
            console.log('Sound loaded');
            soundLoaded = true;
        }

        function startup_animation() {

            // create boxes with letters for every row
            boxes = []
            for (var i = 0, height = puzzle.length; i < height; i++) {
                row = puzzle[i];
                y = 0;

                bar = new createjs.Container();
                bar.x = margin_x;
                bar.y = 0;

                for (var j = 0, width = row.length; j < width; j++) {
                    var v_box = new createjs.Shape();
                    v_box.graphics.beginStroke("#000000").beginFill(
                        "#eeeeee").drawRect(cell_size * j, 0, cell_size, cell_size);
                    bar.addChild(v_box);

                    letter = puzzle[i][j];
                    if (lowercase) {
                        letter = letter.toLowerCase();
                    } else {
                        letter = letter.toUpperCase();
                    }
                    text = new createjs.Text(letter,
                                             "24px Arial", "#000000");
                    text.x = cell_size * j + cell_size / 2;
                    text.y = y + cell_size / 3;
                    text.textAlign = "center";
                    bar.addChild(text);
                }
                bar.cache(0, 0, cell_size * row.length, cell_size);

                boxes.push(bar);
                stage.addChild(bar);
            }

            createjs.Ticker.setFPS(10);
            createjs.Ticker.addEventListener("tick", stage);

            soundInstance.play();

            // startup the animation
            createjs.Tween.get(boxes.pop()).to(
                {y:cell_size * boxes.length + margin_y}, 1000,
                createjs.Ease.bounceOut).wait(300).call(animateNextBox);

        }

        function animateNextBox() {
            if (boxes.length > 0) {
                soundInstance.stop();
                soundInstance.play();
                createjs.Tween.get(boxes.pop()).to(
                    {y:cell_size * boxes.length + margin_y}, 1000,
                    createjs.Ease.bounceOut).wait(300).call(animateNextBox);
            } else {
                soundInstance.stop();
                stage.clear();
                createjs.Ticker.setPaused(true);
                init_game();
            }
        }

        function get_cell(x, y) {
            cell_x = parseInt((x - margin_x) / cell_size);
            cell_y = parseInt((y - margin_y) / cell_size);
            // console.log('x = '+ x + ' y = ' + y + 'cell = ' + cell_x + ' ' + cell_y);
            return [cell_x, cell_y];
        }

        function init_game() {

            // Enable touch interactions if supported on the current device:
            createjs.Touch.enable(stage);
            stage.addEventListener("pressup", pressup_cb);
            stage.addEventListener("pressmove", pressmove_cb);
            stage.mouseChildren = false;

            select_word_line = new createjs.Shape();

            container = new createjs.Container();
            container.x = margin_x;
            container.y = margin_y;

            var background = new createjs.Shape();
            background.graphics.beginFill(
                "#eeeeee").drawRect(
                0, 0, cell_size * puzzle.length, cell_size * puzzle.length);
            container.addChild(background);

            letters = [];
            for (var i = 0, height = puzzle.length; i < height; i++) {
                row = puzzle[i];
                y = cell_size * i;

                var h_box = new createjs.Shape();
                h_box.graphics.beginStroke("#000000").drawRect(
                    0, y, cell_size * row.length, cell_size);
                container.addChild(h_box);

                var v_box = new createjs.Shape();
                h_box.graphics.beginStroke("#000000").drawRect(
                    cell_size * i, 0, cell_size,
                    cell_size * puzzle.length);
                container.addChild(v_box);

                for (var j = 0, width = row.length; j < width; j++) {
                    letter = puzzle[i][j];
                    if (lowercase) {
                        letter = letter.toLowerCase();
                    } else {
                        letter = letter.toUpperCase();
                    }
                    text = new createjs.Text(letter,
                                             "24px Arial", "#000000");
                    text.x = cell_size * j + cell_size / 2;
                    text.y = y + cell_size / 3;
                    text.textAlign = "center";
                    container.addChild(text);
                    letters.push(text);
                }
            }
            container.cache(0, 0, cell_size * puzzle.length,
                            cell_size * puzzle.length);
            stage.addChild(container);

            stage.addChild(select_word_line);

            stage.update();

            gameStarted = true;
        }

        function changeUpperLowerCase() {
            for (var i = 0; i < letters.length; i++) {
                letter = letters[i];
                if (lowercase) {
                    letter.text = letter.text.toLowerCase();
                } else {
                    letter.text = letter.text.toUpperCase();
                }
            }
            container.updateCache();
            drawWords("#words", wordList);
        }

        function pressup_cb(event) {
            verify_word(start_cell, end_cell);
            start_cell = null;
            end_cell = null;
        }

        function pressmove_cb(event) {
            if (start_cell == null) {
                cell = get_cell(event.stageX, event.stageY);
                cell_x = cell[0];
                cell_y = cell[1];
                start_cell = [cell_x, cell_y];
                end_cell = null;
                return;
            }

            end_cell = get_cell(event.stageX, event.stageY);
            if ((end_cell_x == end_cell[0]) && (end_cell_y == end_cell[1])) {
                return;
            }
            end_cell_x = end_cell[0];
            end_cell_y = end_cell[1];

            start_cell_x = start_cell[0];
            start_cell_y = start_cell[1];

            select_word_line.graphics.clear();
            select_word_line.graphics.beginStroke(
                createjs.Graphics.getRGB(0xFF00FF, 0.2));
            select_word_line.graphics.setStrokeStyle(cell_size, "round");
            select_word_line.graphics.moveTo(
                margin_x + start_cell_x * cell_size + cell_size / 2,
                margin_y + start_cell_y * cell_size + cell_size / 2);
            select_word_line.graphics.lineTo(
                margin_x + end_cell_x * cell_size + cell_size / 2,
                margin_y + end_cell_y * cell_size + cell_size / 2);
            select_word_line.graphics.endStroke();
            stage.update();
        }

        function verify_word(start_cell, end_cell) {
            for (var n = 0; n < wordLocations.length; n++) {
                word = wordLocations[n];
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
                        cell_size, "round");
                    found_word_line.graphics.moveTo(
                        margin_x + start_cell_x * cell_size + cell_size / 2,
                        margin_y + start_cell_y * cell_size + cell_size / 2);
                    found_word_line.graphics.lineTo(
                        margin_x + end_cell_x * cell_size + cell_size / 2,
                        margin_y + end_cell_y * cell_size + cell_size / 2);
                    found_word_line.graphics.endStroke();
                    found_word_line.mouseEnabled = false;
                    stage.addChild(found_word_line);

                    $('.' + word.word.toLowerCase()).addClass('wordFound');
                }
            }
            select_word_line.graphics.clear();
            stage.update();
        }

        /**
        * Draws the words by inserting an unordered list into el.
        *
        * @param {String} el: The jQuery element to write the words to
        * @param {[String]} words: The words to draw
        */
        function drawWords(el, words) {

          var output = '<ul>';
          words.sort();
          for (var i = 0, len = words.length; i < len; i++) {
            var word = words[i];
            if (lowercase) {
                word = word.toLowerCase();
            } else {
                word = word.toUpperCase();
            }
            output += '<li class="word ' + word.toLowerCase() + '">' + word;
          }
          output += '</ul>';

          $(el).html(output);
        };

        //
    });

});
