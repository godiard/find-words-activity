define(function (require) {
    var activity = require("sugar-web/activity/activity");
    var icon = require("sugar-web/graphics/icon");

    var datastore = require("sugar-web/datastore");

    var model = require("activity/model");
    var view = require("activity/view");
    var controller = require("activity/controller");

    require("easel");
    require("wordfind");

    // Manipulate the DOM only when it is ready.
    require(['domReady!'], function (doc) {

        // Initialize the activity.
        activity.setup();

        // Colorize the activity icon.
        var activityButton = document.getElementById("activity-button");
        activity.getXOColor(function (error, colors) {
            icon.colorize(activityButton, colors);
        });

        // Make the activity stop with the stop button.
        var stopButton = document.getElementById("stop-button");
        stopButton.addEventListener('click', function (e) {
            activity.close();
        });

        activity.write = function (callback) {
            console.log("writing...");
            var jsonData = JSON.stringify(todo.model.items);
            this.getDatastoreObject().setDataAsText(jsonData);
            this.getDatastoreObject().save(function (error) {
                if (error === null) {
                    console.log("write done.");
                }
                else {
                    console.log("write failed.");
                }
                callback(error);
            });
        };

        // HERE GO YOUR CODE

        var words = ['cows', 'tracks', 'arrived', 'located', 'sir', 'seat',
                   'division', 'effect', 'underline', 'view', 'annual',
                   'anniversary', 'centennial', 'millennium', 'perennial',
                   'artisan', 'apprentice', 'meteorologist', 'blizzard', 'tornado',
                   'intensify','speed','count','consonant','someone',
                   'sail','rolled','bear','wonder','smiled','angle', 'absent',
                   'decadent', 'excellent', 'frequent', 'impatient', 'cell',
                   'cytoplasm', 'organelle', 'diffusion', 'osmosis',
                   'respiration'];

        // create just a puzzle, without filling in the blanks and print to console
        var puzzle = wordfind.newPuzzle(words,
            {height: 18, width:18, fillBlanks: true});

        puzzleString = wordfind.print(puzzle);
        var stage;
        var cell_size = 40;
        var margin_x = 20;
        var margin_y = 20;

        var cell_pressed = null;
        var select_word_line = null;

        init();

        function get_cell(x, y) {
            cell_x = parseInt((x + cell_size / 2) / cell_size);
            cell_y = parseInt((y + cell_size / 2) / cell_size);
            return [cell_x, cell_y];
        }

        function init(){
            canvas = doc.getElementById("testCanvas");
            console.log(canvas);

            stage = new createjs.Stage(canvas);

            // Enable touch interactions if supported on the current device:
            createjs.Touch.enable(stage);
            stage.enableDOMEvents(true);

            select_word_line = new createjs.Shape();

            var container = new createjs.Container();
            container.x = margin_x;
            container.y = margin_y;

            var background = new createjs.Shape();
            background.graphics.beginFill(
                "#eeeeee").drawRect(
                0, 0, cell_size * puzzle.length, cell_size * puzzle.length);
            container.addChild(background);

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
                    text = new createjs.Text(letter, "20px Arial", "#000000");
                    text.x = cell_size * j + cell_size / 2;
                    text.y = y + cell_size / 3;
                    text.textAlign = "center";
                    container.addChild(text);
                }
            }
            container.cache(0, 0, cell_size * puzzle.length,
                            cell_size * puzzle.length);
            stage.on("stagemousedown", mousedown_cb);
            stage.on("stagemousemove", mouseover_cb);
            stage.on("stagemouseup", mouseup_cb);
            stage.addChild(container);

            stage.addChild(select_word_line);

            stage.update();
        }

        function mousedown_cb(event) {
            cell = get_cell(event.stageX, event.stageY);
            cell_x = cell[0];
            cell_y = cell[1];
            cell_pressed = [cell_x, cell_y];
        }

        function mouseup_cb(event) {
            cell_pressed = null;
        }

        function mouseover_cb(event) {
            if (cell_pressed == null) {
                return;
            }

            end_cell = get_cell(event.stageX, event.stageY);
            end_cell_x = end_cell[0];
            end_cell_y = end_cell[1];

            start_cell_x = cell_pressed[0];
            start_cell_y = cell_pressed[1];

            select_word_line.graphics.clear();
            select_word_line.graphics.beginStroke(
                createjs.Graphics.getRGB(0xFF00FF, 0.2));
            select_word_line.graphics.setStrokeStyle(cell_size, "round");
            select_word_line.graphics.moveTo(start_cell_x * cell_size,
                                    start_cell_y * cell_size);
            select_word_line.graphics.lineTo(end_cell_x * cell_size,
                                    end_cell_y * cell_size);
            select_word_line.graphics.endStroke();
            stage.update();
        }

        //
    });

});
