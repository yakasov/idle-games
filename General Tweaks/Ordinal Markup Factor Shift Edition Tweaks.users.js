// ==UserScript==
// @name         Ordinal Markup: Factor Shift Edition Tweaks
// @version      0.4.1
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
    { id: "obj3", cmp: false, tag: "func" }, // Get every booster upgrade on the first row
    { id: "obj4", cmp: false, tag: "fac", val: 7 }, // Unlock Factor 8
    { id: "obj5", cmp: false, tag: "func" }, // Get your ordinal to ω^ω^2
    { id: "obj6", cmp: false, tag: "func" }, // Reach Base 6
    { id: "obj7", cmp: false, tag: "up", val: 9 }, // Get every booster upgrade
    { id: "obj8", cmp: false, tag: "func" }, // Unlock the next layer
    { id: "obj9", cmp: false, tag: "func" }, // Unlock the second Omega Factor
    { id: "obj10", cmp: false, tag: "op", val: 1.79e308 }, // Get your Ordinal Points above 1.8e308
];
const factorizeMilestones = [
    { id: "fact0", amount: 1 },
    { id: "fact1", amount: 2 },
    { id: "fact2", amount: 6 },
    { id: "fact3", amount: 24 },
    { id: "fact4", amount: 120 }
]

function maxDiagonalizeTypo() {
    const buttons = Array.from(document.getElementsByClassName("normalButton"));
    let typoButton = buttons.find((b) => b.innerText.includes("You finger"));
    typoButton.innerHTML = typoButton.innerHTML.replace("You", "Your");
}

function addMaxAutoButton() {
    let el = document.getElementById('dup9');
    el.insertAdjacentHTML('afterend',
                          `<button class="normalButton" onclick="window.buyMaxAuto()">Max all autobuyers<br>Your finger will thank me later... again</button>`);
}

function buyMaxAuto() {
    const succAmount = EN.affordGeometricSeries(game.DP, 1, 1.1, getExtraSuccAuto());
    const limAmount = EN.affordGeometricSeries(game.DP, 1, 1.1, getExtraLimAuto());

    for (let i = 1; i <= Math.max(succAmount, limAmount); i++) {
        if (i <= succAmount && getExtraSuccAuto().lte(getExtraLimAuto())) {
            dup(2);
        }

        if (i <= limAmount && getExtraLimAuto().lte(getExtraSuccAuto())) {
            dup(3);
        }
    }
}

function checkBoosters() {
    let boostersDisplay = document.getElementById('boosterTabButton');
    let el = document.getElementsByClassName('trueCenter long')[1];
    let buttons = Array.from(el.getElementsByTagName('button'));
    let showWarning = buttons.some(b => b.classList.contains('canbuy') && b.style.display !== 'none');

    boostersDisplay.style.width = '140px';
    boostersDisplay.innerText = 'Boosters' + (showWarning ? ' (!)' : '');
}

function checkProducts() {
    let productsDisplay = document.getElementById('productTabButton');
    let el = document.getElementsByClassName('trueCenter long')[3];
    let buttons = Array.from(el.getElementsByTagName('button'));
    let showWarning = buttons.some(b => b.classList.contains('canbuy') && b.style.display !== 'none');

    productsDisplay.style.width = '140px';
    productsDisplay.innerText = 'Products' + (showWarning ? ' (!)' : '');
}

function addBestFactorized() {
    let el = document.getElementById('factMile');
    el.insertAdjacentHTML('afterend',
                          `<h4 id="bestFactorized" style="font-weight: normal; text-align: center">Current best: ${beautify(game.mostFactorizedOnce)}</h4>`);
}

function checkFactorizeMilestones() {
    let el = document.getElementById('bestFactorized');
    el.innerText = `Current best: ${beautify(game.mostFactorizedOnce)}`

    for (var milestone of factorizeMilestones) {
        if (game.mostFactorizedOnce.gte(milestone.amount)) {
            let el = document.getElementById(milestone.id);
            el.style = 'background: #00FF00; color: black';
        } else {
            return;
        }
    }
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
        if (!objective.cmp) {
            let obj = getObjectiveObj(objective.tag ?? 0, objective.id);
            let check = objective.val ? ExpantaNum(obj).gte(objective.val) : obj;

            if (check) {
                objective.cmp = true;
                updateObjStyle(objective.id);
            }
        }
    }
}

function getObjectiveObj(tag, id) {
    switch (tag) {
        case "ord":
            return game.ord;
        case "op":
            return game.OP;
        case "fac":
            return game.factors.length;
        case "up":
            return game.upgrades.length;
        case "func":
            return getObjectiveCheck(id);
        default:
            return false;
    }
}

function getObjectiveCheck(id) {
    switch (id) {
        case "obj3":
            return obj3Check();
        case "obj5":
            return obj5Check();
        case "obj6":
            return obj6Check();
        case "obj8":
            return obj8Check();
        case "obj9":
            return obj9Check();
        default:
            return false;
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
    return game.ord >= game.base ** (game.base ** 2);
}

function obj6Check() {
    return game.base <= 8;
}

function obj8Check() {
    return game.upgrades.indexOf(4) !== -1;
}

function obj9Check() {
    return game.pupgrades.includes(7);
}

function updateObjectiveStatuses() {
    let el = document.getElementById("objectiveStatuses");
    let elText = "<br>Objective Tracking Debug:<br>";
    for (var objective of objectiveTargets) {
        let obj = getObjectiveObj(objective.tag ?? 0, objective.id);
        let check = objective.val ? ExpantaNum(obj).gte(objective.val) : obj;

        elText += `${objective.id}: ${objective.cmp} (${
            objective.val
                ? `[${ExpantaNum(obj).array}] >= ${objective.val}`
                : "func"
        }) => ${check ?? 'TODO'}<br>`;
    }
    el.innerHTML = elText;
}

maxDiagonalizeTypo();
checkBoosters();
checkProducts();
window.buyMaxAuto = buyMaxAuto;
addMaxAutoButton();
addBestFactorized();
setObjectives();

setInterval(checkBoosters, 250);
setInterval(checkProducts, 250);
setInterval(checkFactorizeMilestones, 250);
setInterval(checkObjectives, 250);
setInterval(updateObjectiveStatuses, 250);