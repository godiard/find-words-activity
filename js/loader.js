requirejs.config({
    baseUrl: "lib",
    shim: {
        easel: {
            exports: "createjs"
        },
        tween: {
            deps: ['easel'],
            exports: 'TweenJS'
        },
        sound: {
            deps: ['easel'],
            exports: 'SoundJS'
        }
    },
    paths: {
        activity: "../js",
        easel: "../lib/easeljs",
        tween: "../lib/tweenjs",
        sound: "../lib/soundjs",
        wordfind: "../js/wordfind"
    }
});

requirejs(["activity/activity"]);
