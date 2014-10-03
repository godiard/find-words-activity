requirejs.config({
    baseUrl: "lib",
    shim: {
        easel: {
            exports: "createjs"
        },
        tween: {
            deps: ['easel'],
            exports: 'TweenJS'
        }
    },
    paths: {
        activity: "../js",
        easel: "../lib/easeljs",
        tween: "../lib/tweenjs",
        wordfind: "../js/wordfind"
    }
});

requirejs(["activity/activity"]);
