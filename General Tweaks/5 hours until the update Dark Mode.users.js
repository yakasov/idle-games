// ==UserScript==
// @name         5 hours until the update Dark Mode
// @version      0.2
// @description
// @author       yakasov
// @match        https://dan-simon.github.io/misc/5hours/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.io
// @grant        none
// ==/UserScript==

let darkModeEnabled = false

function toggleDarkMode() {
    let body = document.getElementsByTagName('body')[0];
    let tables = document.getElementsByTagName('table');

    body.style = darkModeEnabled ? '' : 'background-color: black; color: lightgrey;';
    for (var t of tables) {
        t.style.color = darkModeEnabled ? 'black' : 'lightgrey'
    }

    darkModeEnabled = !darkModeEnabled;
}


let buttonSpan = document.getElementsByTagName('span')[0];
buttonSpan.innerHTML += `<button onclick='window.toggleDarkMode()'>Toggle Dark Mode</button>`;

let loreDiv = document.getElementById('lore-div');
loreDiv.style = 'line-height: 150%';

window.toggleDarkMode = toggleDarkMode;
toggleDarkMode(); // start in dark mode

