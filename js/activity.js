define(function (require) {
    var activity = require("sugar-web/activity/activity");
    var icon = require("sugar-web/graphics/icon");

    var dictstore = require("sugar-web/dictstore");

    require("easel");
    require("wordfind");
    require("tween");
    require("CSSPlugin");
    require("wordlist");
    require("wordmatrix");

    // Manipulate the DOM only when it is ready.
    require(['domReady!'], function (doc) {

        var wordListCanvas = document.getElementById("wordListCanvas");
        var gameCanvas = document.getElementById("gameCanvas");
        var startGameButton = document.getElementById("start-game-button");
        var upperLowerButton = document.getElementById("upperlower-button");
        var backButton = document.getElementById("back-button");
        var wordInput = document.getElementById("word-input");
        var errorArea = document.getElementById("validation-error");
        var addWordButton = document.getElementById("add-word-button");
        var easyButton = document.getElementById("easy-button");
        var mediumButton = document.getElementById("medium-button");
        var hardButton = document.getElementById("hard-button");

        // Initialize the activity.

        console.log(navigator.userAgent);

        var onAndroid = /Android/i.test(navigator.userAgent);
        if (onAndroid) {
            console.log('ON ANDROID, hide toolbar and move the canvas');
            // hide the sugar toolbar
            var toolbar = document.getElementById("main-toolbar");
            toolbar.style.display = "none";
            // move the toolbar at the top
            var canvas = document.getElementById("canvas");
            canvas.style.top = "0px";
            // add a div and put the buttons
            var fragment = document.createDocumentFragment();
            var div = document.createElement('div');
            div.className = 'toolbar';
            div.id = 'floatingToolbar';
            fragment.appendChild(div);
            div.appendChild(backButton);
            div.appendChild(upperLowerButton);
            document.body.appendChild(fragment.cloneNode(true));
            // update the references to the buttons
            upperLowerButton = document.getElementById("upperlower-button");
            backButton = document.getElementById("back-button");
        };

        activity.setup();

        // HERE GO YOUR CODE

        // initialize canvas size

        var is_xo = ((window.innerWidth == 1200) && (window.innerHeight >= 900));
        var sugarCellSize = 75;
        var sugarSubCellSize = 15;
        if (!is_xo) {
            sugarCellSize = 55;
            sugarSubCellSize = 11;
        };

        if (onAndroid) {
            // set to the size of the bottom bar
            sugarCellSize = 10;
        }
        wordListCanvas.height = window.innerHeight - sugarCellSize;
        wordListCanvas.width = window.innerWidth / 3;

        gameCanvas.height = window.innerHeight - sugarCellSize;
        var availableWidth = Math.min(window.innerWidth / 3 * 2,
                                      gameCanvas.height);
        // the matrix have 12 cells and a padding equeal to half a cell
        gameCanvas.width = availableWidth / 13 * 12;

        // game logic

        function Game(wordListCanvas, gameCanvas, startGameButton) {

            this.words = [];
            this.level = 'easy';
            this.found = [];
            this.started = false;
            this.lowerCase = false;
            this.colors = ['#e51c23', '#e91e63', '#9c27b0', '#673ab7',
                           '#3f51b5', '#5677fc', '#03a9f4', '#00bcd4',
                           '#009688', '#259b24', '#8bc34a', '#cddc39',
                           '#ffc107', '#ff9800', '#ff5722'];

            this.wordListView = new wordlist.View(wordListCanvas, this);
            this.matrixView = new wordmatrix.View(gameCanvas, this);
            this.startGameButton = startGameButton;
            this.wordColors = {};

            this.setLowerCase = function (lowerCase) {
                this.lowerCase = lowerCase;
                this.wordListView.changeCase();
                if (this.started) {
                    // change the matrix
                    this.matrixView.changeCase();
                };
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
                this.startGameButton.disabled = false;
            };

            this.addFoundWord = function (word) {
                this.found.push(word);
                this.wordListView.updateWord(word);
            };

            this.restartWordList = function() {
                this.wordListView.updateAll();
            };

            this.getWordColor = function(word, alpha) {
                var word = word.toUpperCase();
                var hexaColor = "#cccccc";
                if (word in this.wordColors) {
                    hexaColor = this.wordColors[word];
                } else {
                    if (this.colors.length > 0) {
                        hexaColor = this.colors.pop();
                        this.wordColors[word] = hexaColor;
                    };
                };

                r = parseInt(hexaColor.substr(1, 2), 16);
                g = parseInt(hexaColor.substr(3, 2), 16);
                b = parseInt(hexaColor.substr(5, 2), 16);
                return createjs.Graphics.getRGB(r, g, b, alpha);
            };

            this.start = function() {
                this.started = true;
                this.wordListView.gameStarted();
                this.matrixView.init();
            };

            this.stop = function() {
                if (this.started) {
                    this.started = false;
                } else {
                    // stop the animation
                    this.matrixView.stop();
                };
                this.found = [];
                this.restartWordList();
            };

            this.removeWord = function(word) {
                var word = word.toUpperCase();
                if (this.words.indexOf(word) > -1) {
                    this.words.splice(this.words.indexOf(word), 1);
                    localStorage["word-list"] = JSON.stringify(this.words);
                    dictstore.save();
                    // free the color
                    this.colors.push(this.wordColors[word]);
                    delete this.wordColors[word];
                };
                if (this.words.length == 0) {
                    this.startGameButton.disabled = true;
                };
            };

        };

        var game = new Game(wordListCanvas, gameCanvas, startGameButton);

        // toolbar
        upperLowerButton.onclick = function () {
            this.classList.toggle('active');
            var lowercase = this.classList.contains('active');
            game.setLowerCase(lowercase);
        };

        backButton.addEventListener('click', function (e) {
            document.getElementById("firstPage").style.display = "block";
            document.getElementById("gameCanvas").style.display = "none";
            game.stop();
        });

        // datastore
        var wordList = [];

        function onStoreReady() {
            if (localStorage["word-list"]) {
                var jsonData = localStorage["word-list"];
                var wordList = JSON.parse(jsonData);
                game.addWords(wordList);
                setLevel(localStorage["level"]);
            };
        };

        dictstore.init(onStoreReady);

        startGameButton.addEventListener('click', function (e) {
            document.getElementById("firstPage").style.display = "none";
            document.getElementById("gameCanvas").style.display = "block";
            game.start();
            hideError();
        });

        // not allow input special characters, number or spaces in the words
        var iChars = "0123456789!¡~@#$%^&*()+=-[]\\\';,./{}|\":<>?¿ ";

        createjs.CSSPlugin.install(createjs.Tween);
        createjs.Ticker.setFPS(30);

        // set size in the addWordButton
        if (onAndroid) {
            // in Sugar the background image is not properly resized
            addWordButton.style.height = wordInput.offsetHeight + 'px';
        };

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
            if (game.wordListView.noMoreSpace) {
                showError('No more space for words!');
                return false;
            }
            hideError();
            return true;
        };

        function showError(msg) {
            var buttonPos = findPosition(addWordButton);
            errorArea.innerHTML = '<div id="validation-error-msg">' + msg +
                '</div>';
            errorArea.style.left = buttonPos.left + 'px';
            var top = buttonPos.top;
            if (onAndroid) {
                top = buttonPos.top + addWordButton.offsetHeight;
            };
            errorArea.style.top = top + 'px';
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
                };
            } else if(obj.x) {
                left += obj.x;
                top += obj.y;
            };
            return {left:left, top: top};
        };

        function addWord() {
            if (!validateWord(wordInput.value)) {
                return;
            };
            game.addWords([wordInput.value.toUpperCase()]);
            wordInput.value = '';
            wordInput.focus();
            // save in the journal
            localStorage["word-list"] = JSON.stringify(game.words);
            dictstore.save();
        };

        // level buttons

        function getButton(level) {
            var button;
            if (level == 'easy') {
                console.log('LEVEL EASY');
                button = easyButton;
            } else if (level == 'medium') {
                console.log('LEVEL MEDIUM');
                button = mediumButton;
            } else if (level == 'hard') {
                console.log('LEVEL HARD');
                button = hardButton;
            };
            return button;
        }

        function setLevel(level) {

            console.log('setLevel ' + game.level + ' new level ' + level);
            var originalButton = getButton(game.level);
            var button = getButton(level);
            game.level = level;

            if (localStorage["level"] != level) {
                localStorage["level"] = level;
                dictstore.save();
            };

            var initSize = sugarSubCellSize * 6;
            console.log('button ' + button + ' width ' + initSize);
            createjs.Tween.get(button).set(
                {webkitTransform: "rotate(30deg)"}, button.style, 500).wait(100).set(
                {webkitTransform: "rotate(0deg)"}, button.style, 500).wait(100).set(
                {webkitTransform: "rotate(-30deg)"}, button.style, 500).wait(100).set(
                {webkitTransform: "rotate(0deg)"}, button.style, 500).wait(100).set(
                {width: String(initSize * 1.5) +"px",
                 height: String(initSize * 1.5) +"px"}, button.style, 1500).wait(200).set(
                {width: String(initSize * 1.25) +"px",
                 height: String(initSize * 1.25) +"px"}, button.style, 1000);

            createjs.Tween.get(originalButton).set(
                {width: String(initSize) +"px",
                 height: String(initSize) +"px"}, originalButton.style, 1000);
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
