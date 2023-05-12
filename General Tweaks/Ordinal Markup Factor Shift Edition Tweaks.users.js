// ==UserScript==
// @name         Ordinal Markup: Factor Shift Edition Tweaks
// @version      0.1
// @description  Corrects typos and marks objectives when completed
// @author       yakasov
// @match        https://patcailmemer.github.io/om-fse-minus/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.io
// @grant        none
// ==/UserScript==

/* eslint-disable no-undef */
let objectiveTargets = [
    { id: "obj0", cmp: false, tag: "ord", val: 20 }, // Reach the number 20
    { id: "obj1", cmp: false, tag: "op", val: 1 }, // Perform an Infinity
    { id: "obj2", cmp: false, tag: "fac", val: 1 }, // Perform a Factor Shift
    { id: "obj3", cmp: false, tag: obj3Check() }, // Get every booster upgrade on the first row
    { id: "obj4", cmp: false, tag: "fac", val: 7 }, // Unlock Factor 8
    { id: "obj5", cmp: false, tag: obj5Check() }, // Get your ordinal to ω^ω^2
    { id: "obj6", cmp: false }, // TODO: Reach Base 6
    { id: "obj7", cmp: false, tag: "up", val: 9 }, // Get every booster upgrade
    { id: "obj8", cmp: false, tag: obj8Check() }, // Unlock the next layer
    { id: "obj9", cmp: false }, // TODO: Unlock the second Omega Factor
    { id: "obj10", cmp: false, tag: "op", val: 1.79e308 }, // Get your Ordinal Points above 1.8e308
];

function maxDiagonalizeTypo() {
    const buttons = Array.from(document.getElementsByClassName("normalButton"));
    let typoButton = buttons.find((b) => b.innerText.includes("You finger"));
    typoButton.innerText = typoButton.innerText.replace("You", "Your");
}

function setObjectives() {
    let objectivesDiv = document.getElementById("Tab4");
    let lis = objectivesDiv.children[0].children;
    for (var i = 0; i < lis.length; i++) {
        lis[i].id = `obj${i}`;
    }
    objectivesDiv.innerHTML += `<p id="objectiveStatuses" style="color: lightgrey; font-size: 14px"></p>`;
}

function checkObjectives() {
    for (var objective of objectiveTargets) {
        if (objective.tag) {
            if (typeof objective.tag === "string") {
                objective.obj = updateObjectiveObj(objective.tag);
            } else {
                objective.obj = objective.tag;
            }
        }
    }

    if (!objective.cmp) {
        let check = objective.val
            ? ExpantaNum(objective.obj).gte(objective.val)
            : objective.obj;

        if (check) {
            objective.cmp = true;
            updateObjStyle(objective.id);
        }
    }
}

function updateObjectiveObj(tag) {
    switch (tag) {
        case "ord":
            return game.ord;
        case "op":
            return game.OP;
        case "fac":
            return game.factors.length;
        case "up":
            return game.upgrades.length;
        default:
            return;
    }
}

function updateObjStyle(id) {
    let el = document.getElementById(id);
    el.style = "font-style: italic; text-decoration: line-through;";
}

function obj3Check() {
    return [1, 2, 3].every((v) => {
        return game.upgrades.indexOf(v) !== -1;
    });
}

function obj5Check() {
    return game.ord.gte(game.base ** (game.base ** 2)); // if this doesn't work try >=
}

function obj8Check() {
    return game.upgrades.indexOf(4) !== -1;
}

function updateObjectiveStatuses() {
    let el = document.getElementById("objectiveStatuses");
    let elText = "<br>Objective Tracking Debug:<br>";
    for (var objective of objectiveTargets) {
        elText += `${objective.id}: ${objective.cmp} (${
            objective.val
                ? `[${ExpantaNum(objective.obj).array}] >= ${objective.val}`
                : "func"
        })<br>`;
    }
    el.innerHTML = elText;
}

maxDiagonalizeTypo();
setObjectives();
setInterval(checkObjectives, 250);
setInterval(updateObjectiveStatuses, 250);
