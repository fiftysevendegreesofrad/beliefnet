function animateNodeDetailsChange(node) {
    hideNodeDisplay(()=>{updateGraphDisplay(cy);displayNodeDetails(node);});
}
function hideNodeDisplay(callback) {
    let nodeDisplay = document.getElementById("node-display");
    nodeDisplay.addEventListener('transitionend', function() {
        callback();
        nodeDisplay.style.display = "none";
        document.body.style.overflow = "auto";
    }, { once: true });
    document.body.style.overflow = "hidden";
    nodeDisplay.classList.remove("on-screen");
}

function hideNodeDetailsUpdateGraphDisplay(cy) {
    hideNodeDisplay(()=>updateGraphDisplay(cy));
}
function predicateToTextColour(predicateValue) {
    return predicateValue == 0.5 ? "#111111" : (predicateValue > 0.5 ? "purple" : "blue");
}
function showHideAtStartClass() {
    let elements = document.getElementsByClassName("hide-at-start");
    for (let e of elements)
        e.style.display = "block";
}
function displayNodeDetails(node)
{
    updateNodeDetails(node);
    let nodeDisplay = document.getElementById("node-display");
    nodeDisplay.style.display = "block";
    nodeDisplay.classList.add("on-screen");
    setTimeout(showHideAtStartClass, 1000);
}
function updateNodeDetails(node) {
    updateClownImage(cy);
    
    let closeButton = document.getElementById("node-close");
    closeButton.onclick = function () {
        hideNodeDetailsUpdateGraphDisplay(cy);
    }

    document.getElementById("topic").innerHTML = node.data("displaylabel");
    let options = node.data().options;
    let whichSelected = predicateToIndex(node);
    let predicateValue = node.data("predicateValue");
    let color = predicateToTextColour(predicateValue);
    document.getElementById("currentBelief").innerHTML = "<font color=" + color + "><b>"+CHARACTERNAME+" currently believes: " + options[whichSelected] + "</b></font>";

    //create research button
    if (node.data("researched")==0) {
        document.getElementById("ResearchButton").innerHTML = "";
        let button = document.createElement("button");
        button.innerHTML = "Research Influencing Beliefs";
        button.addEventListener("click", function (evt1) {
            node.data("researched", 1);
            //iterate through neighbouring nodes
            for (e of node.incomers())
                e.source().style("display", "element");
            //no longer showing beliefs infleunced by this one, as it's more fun to discover them
            //for (e of node.outgoers())
            //    e.target().style("display", "element");
            hideNodeDetailsUpdateGraphDisplay(cy);
        });
        document.getElementById("ResearchButton").appendChild(button);
    }
    else {
        displayRelatedBeliefs(node);
    }
    //create buttons for other options
    document.getElementById("nodeDetails").innerHTML = "";
    //let prevNodeValues = cy.elements().map(x => x.json()); //for undo not yet implemented
    let table = document.createElement("table");
    for (let i = 0; i < options.length; i++) {
        let row = document.createElement("tr");
        row.classList.add("optiontable");


        let optionSpan = document.createElement("span");
        const isTargetOption = (node.data().target && i==0);
        let htmlOption = "";
        let color = predicateToTextColour(getPredicateFromIndex(node.data(), i));
        if (isTargetOption)
            htmlOption+=`<div class=targetbox><span class=darkbg><font class=target color=ffff00><b>GAME TARGET<br>&darr; Your aim is to convince ${CHARACTERNAME} of this &darr;</b></font></span><div class=targettextcontainer><font class=target>`;
        htmlOption +=  "<font color="+color+">"+options[i]+"</font>";
        if (isTargetOption)
            htmlOption+=`</font></div></div>
        `;
        optionSpan.innerHTML = htmlOption;

        let button = document.createElement("button");
        if (i != whichSelected) {
            let buttonPredValue = getPredicateFromIndex(node.data(), i);
            button.innerHTML = "Influence";

            let currentLogLik = updateLogLik(cy);
            let resultingLogLik = altNetworkLogLik(cy, { [node.id()]: buttonPredValue });
            let resultingBelievability = computeBelievabilityFromLogLik(resultingLogLik);

            let possible = resultingLogLik >= PERMITTEDMINLOGPROB;

            if (DEVMODE && possible) {
                    button.style.backgroundColor = "green";
                    button.innerHTML = resultingLogLik.toFixed(2);
                }
            if (DEVMODE && !possible) {
                button.style.backgroundColor = "red";
                button.innerHTML = resultingLogLik.toFixed(2);
                if (ALLOWIMPOSSIBLEMOVES)
                    possible = true;
            }
            if (possible) {

                button.addEventListener("click", function (evt1) {
                    document.getElementById("progress-bar-container").classList.remove("hidden");
                    node.data("predicateValue", buttonPredValue);
                    updateBelievabilityDisplay(cy);
                    animateNodeDetailsChange(node);
                    if (isTargetOption)
                    {
                        let div = document.createElement("div");
                        div.appendChild(getClownImage());
                        if (getDifficulty() == "easy")
                        {
                            div.innerHTML += `<h1>Well done!</h1>
                            <h2>You convinced ${CHARACTERNAME} of the reptilian elite.</h2>
                            <p>${CHARACTERNAME} (set to easy mode) sits around doomscrolling all day, his isolation making him gullible. So although you've convinced him, this doesn't change much as he hardly leaves his couch.</p>
                            <p><button onclick="window.restartGameOnHardMode()">Try again on hard mode</button></p>
                            `;
                        }
                        else
                        {
                            div.innerHTML += `<h1>Well done!</h1><h2>
                            <h2>You completed the game on hard mode.</h2>
                            <p>Convinced that we are governed by reptiles, ${CHARACTERNAME} goes out one day and attacks a zookeeper.</p>
                            <p>I hope you're proud of yourself.</p>`;
                        }
                        div.innerHTML += `<button type="button" class="btn-about" onclick="about()">FAQ & Credits</button>`;
                        ;
                        showModal(div,canDismiss=false);
                    }
                });
            }
            else {
                button.addEventListener("click", function (evt1) {
                    let div = document.createElement("div");
                    let message = `<h2>You can't convince ${CHARACTERNAME} of this. 
                                       His bullshitometer would climb above 100%.</h2>
                                       <ul>`;
                    //if node is not researched, suggest researching it
                    if (node.data("researched")==0)
                    {
                        message += `<li>Try researching ${CHARACTERNAME}'s related beliefs first</li>`;
                        div.innerHTML = message;
                    }
                    else
                    {
                        message += `<li>Maybe influencing some other beliefs first will help.</li>`;
                        message += `<li>Even if the other beliefs all line up right, the belief you're trying to influence could still be too implausible for ${CHARACTERNAME}. 
                        Can you lower the bullshitometer to grow his trust in you?
                        </li>`;
                        div.innerHTML = message;
                        let button = document.createElement("button");
                        button.innerHTML = "Analyse failure to influence";
                        div.appendChild(button);
                        button.addEventListener("click", ()=>examineHypothetical(cy,node,buttonPredValue)); 

                        let button2 = document.createElement("button");
                        button2.innerHTML = "Try something else";
                        div.appendChild(button2);
                        button2.addEventListener("click", hideModal);
                    }

                    showModal(div);
                });
            }
        }
        else {
            button.innerHTML = "<i>Current</i>";
            button.disabled = true;
        }

        let td = document.createElement("td");
        td.appendChild(button);
        row.appendChild(td);
        let td2 = document.createElement("td");
        td2.appendChild(optionSpan);
        row.appendChild(td2);
        table.appendChild(row);
    }
    document.getElementById("nodeDetails").appendChild(table);
}

function examineHypothetical(cy,node,hypotheticalPredValue) {
    let normalGraphInfo = document.getElementById("normal-graph-info");
    normalGraphInfo.style.display = "none";
    let impossibleInfo = document.getElementById("impossible-info");
    impossibleInfo.innerHTML = "";

    let nodeName = node.data("displaylabel");
    let option = predicateToOption(node, hypotheticalPredValue);
    let nodeText = nodeName + ": " + option;

    hideModal();
    hideNodeDetailsUpdateGraphDisplay(cy);
    
    allowClickNodes = false;
    let prevPredValue = node.data("predicateValue");
    node.data("predicateValue", hypotheticalPredValue);
    updateBelievabilityDisplay(cy);
    
    const gradient = "repeating-linear-gradient(45deg, #ffffff, #ffffff 10px, #fff0f0 10px, #fff0f0 20px)";
    let bodydiv = document.getElementById("body-div");
    bodydiv.style.background = gradient;
    let restoreBackground = ()=>{bodydiv.style.background = "";};
    
    let p = document.createElement("p");
    p.innerHTML = `<b>Unachievable belief combination (bullshit > 100%) for<br><i>${nodeText}</i></b>`;
       
    impossibleInfo.appendChild(p);

    let button = document.createElement("button");
    button.innerHTML = "Try something else";
    button.classList.add("align-right");
    impossibleInfo.appendChild(button);

    //if any beliefs are not researched
    let unresearched = cy.elements().filter(x => x.data("researched")==0);
    if (unresearched.length > 0) {
        let p = document.createElement("p");
        p.innerHTML = `<i>Warning: there are also  some unresearched beliefs which may be triggering the bullshitometer</i>`;
        impossibleInfo.appendChild(p);
    }

    function closeHypotheticalDisplay() {
        restoreBackground();
        node.data("predicateValue", prevPredValue);
        updateBelievabilityDisplay(cy);
        updateGraphDisplay(cy);
        impossibleInfo.innerHTML = "";
        allowClickNodes = true;
        normalGraphInfo.style.display = "block";
    }

    setTimeout(()=>
        document.addEventListener("click",closeHypotheticalDisplay,{once:true}, true) 
        //useCapture=true to catch click before it reaches cy, but that still doesn't work on mobile so we make a button too
    ,100);
    button.addEventListener("click",closeHypotheticalDisplay);
}

function displayRelatedBeliefs(node) {
    let researchButton = document.getElementById("ResearchButton");

    researchButton.innerHTML = "";
    
    let closeButton = document.createElement("button");
    closeButton.innerHTML = "View Mind Map";
    closeButton.addEventListener("click", ()=>hideNodeDetailsUpdateGraphDisplay(cy));
    closeButton.className = "align-right";
    researchButton.appendChild(closeButton);

    let researchHeader = document.createElement("h3");
    researchHeader.innerHTML = CHARACTERNAME + "'s other beliefs...";
    researchButton.appendChild(researchHeader);

    let predicateValue = node.data("predicateValue");

    let supportingBeliefs = [];
    let opposingBeliefs = [];
    let neutralBeliefs = [];
    for (let [e, nodeSupport] of getSupportingEdgesCoeffs(node)) {
        let n = e.source();
        let otherBelief = n.data().displaylabel + ": " + n.data().options[predicateToIndex(n)];
        const otherPredicate = n.data().predicateValue;

        let narrative = getNarrative(e, otherPredicate, predicateValue);
        if (narrative != "")
            narrative = " <i>" + narrative + "</i>";

        if (nodeSupport > 0)
            supportingBeliefs.push([nodeSupport, otherBelief, narrative]);
        else if (nodeSupport < 0)
            opposingBeliefs.push([nodeSupport, otherBelief, narrative]);
        else
            neutralBeliefs.push([nodeSupport, otherBelief, narrative]);
    }
    
    let researchHTML = "";
    if (supportingBeliefs.length > 0) {
        researchHTML += "<h3>...currently supporting this one:</h3><ul>";
        for (let [mutualSupport, otherBelief, narrative] of supportingBeliefs) {
            researchHTML += "<li><font color=green>+" + mutualSupport + ": " + otherBelief + ".</font>" + narrative + "</li>";
        }
        researchHTML += "</ul>";
    }
    if (opposingBeliefs.length > 0) {
        researchHTML += "<h3>...currently opposing this one:</h3><ul>";
        for (let [mutualSupport, otherBelief, narrative] of opposingBeliefs) {
            researchHTML += "<li><font color=red>" + mutualSupport + ": " + otherBelief + ".</font>" + narrative + "</li>";
        }
        researchHTML += "</ul>";
    }
    if (neutralBeliefs.length > 0) {
        researchHTML += "<h3>...that could affect this one, but currently don't:</h3><ul>";
        for (let [mutualSupport, otherBelief, narrative] of neutralBeliefs) {
            researchHTML += `<li>${otherBelief}. ${narrative}</li>`;
        }
        researchHTML += "</ul>";
    }

    supportingBeliefs = [];
    opposingBeliefs = [];
    neutralBeliefs = [];

    for (let [e, nodeSupport] of getSupportedEdgesCoeffs(node)) {
        if (e.target().data("researched")==0) continue;
        let n = e.target();
        let otherBelief = n.data().displaylabel + ": " + n.data().options[predicateToIndex(n)];
        const otherPredicate = n.data().predicateValue;

        let narrative = ""; //narratives are only written on target node

        if (nodeSupport > 0)
            supportingBeliefs.push([nodeSupport, otherBelief, narrative]);
        else if (nodeSupport < 0)
            opposingBeliefs.push([nodeSupport, otherBelief, narrative]);
        else
            neutralBeliefs.push([nodeSupport, otherBelief, narrative]);
    }
    
    if (supportingBeliefs.length > 0) {
        researchHTML += "<h3>...currently supported by this one:</h3><ul>";
        for (let [mutualSupport, otherBelief, narrative] of supportingBeliefs) {
            researchHTML += "<li><font color=green>+" + mutualSupport + ": " + otherBelief + ".</font>" + narrative + "</li>";
        }
        researchHTML += "</ul>";
    }
    if (opposingBeliefs.length > 0) {
        researchHTML += "<h3>...currently opposed by this one:</h3><ul>";
        for (let [mutualSupport, otherBelief, narrative] of opposingBeliefs) {
            researchHTML += "<li><font color=red>" + mutualSupport + ": " + otherBelief + ".</font>" + narrative + "</li>";
        }
        researchHTML += "</ul>";
    }
    if (neutralBeliefs.length > 0) {
        researchHTML += "<h3>...that could be affected by this one, but currently aren't:</h3><ul>";
        for (let [mutualSupport, otherBelief, narrative] of neutralBeliefs) {
            researchHTML += `<li>${otherBelief}. ${narrative}</li>`;
        }
        researchHTML += "</ul>";
    }

    let div = document.createElement("div");
    div.innerHTML = researchHTML;
    researchButton.appendChild(div);
}