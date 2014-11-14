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
        easel: "../lib/easeljs-0.7.1.min",
        tween: "../lib/tweenjs-0.5.1.min",
        CSSPlugin: "../lib/CSSPlugin",
        preload: "../lib/preloadjs-0.4.1.min",
        wordfind: "../js/wordfind",
        wordlist: "../js/wordlist",
        wordmatrix: "../js/wordmatrix",
        categories: "../js/categories_words"
    }
});

requirejs(["activity/activity"]);
