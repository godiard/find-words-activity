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
        CSSPlugin: "../lib/CSSPlugin",
        sound: "../lib/soundjs",
        wordfind: "../js/wordfind",
        wordlist: "../js/wordlist",
        wordmatrix: "../js/wordmatrix"
    }
});

requirejs(["activity/activity"]);
