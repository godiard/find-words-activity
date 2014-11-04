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
        easel: "../lib/easeljs-0.7.1.min",
        tween: "../lib/tweenjs-0.5.1.min",
        CSSPlugin: "../lib/CSSPlugin",
        sound: "../lib/soundjs-0.5.2.min",
        preload: "../lib/preloadjs-0.4.1.min",
        wordfind: "../js/wordfind",
        wordlist: "../js/wordlist",
        wordmatrix: "../js/wordmatrix"
    }
});

requirejs(["activity/activity"]);
