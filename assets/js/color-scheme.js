(function() {
    'use strict'

    const browser_theme = window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
    let stored_theme = localStorage.getItem('omaha_theme');
    if (! /^(light|dark)$/.test(String(stored_theme))) stored_theme = null;
    let user_theme = stored_theme || browser_theme;

    document.documentElement.setAttribute('data-theme', user_theme);
    localStorage.setItem('omaha_theme', user_theme);
})();
