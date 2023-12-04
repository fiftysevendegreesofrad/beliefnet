function refreshNodeDetails(node) {
    var leftPanel = document.getElementsByClassName("left-panel")[0];
    leftPanel.classList.remove("show");
    setTimeout(function () { displayNodeDetails(node); }, 350);
}
function predicateToTextColour(predicateValue) {
    return predicateValue == 0.5 ? "#111111" : (predicateValue > 0.5 ? "purple" : "blue");
}
function displayNodeDetails(node) {
    updateClownImage(cy);
    var leftPanel = document.getElementsByClassName("left-panel")[0];
    leftPanel.classList.add("show");
    document.getElementById("topic").innerHTML = node.data("displaylabel");
    let options = node.data().options;
    let whichSelected = predicateToIndex(node);
    let predicateValue = node.data("predicateValue");
    let color = predicateToTextColour(predicateValue);
    document.getElementById("currentBelief").innerHTML = "<font color=" + color + "><b>"+CHARACTERNAME+" currently believes: " + options[whichSelected] + "</b></font>";

    //create research button
    document.getElementById("ResearchButton").innerHTML = "";
    if (node.data("researched")==0) {
        let button = document.createElement("button");
        button.innerHTML = "Research Related Beliefs";
        button.addEventListener("click", function (evt1) {
            node.data("researched", 1);
            //iterate through neighbouring nodes
            for (e of node.incomers())
                e.source().style("display", "element");
            for (e of node.outgoers())
                e.target().style("display", "element");
            refreshNodeDetails(node);
            updateGraphDisplay(cy);
        });
        document.getElementById("ResearchButton").appendChild(button);
    }
    else {
        displayRelatedBeliefs(node);
    }
    //create buttons for other options
    document.getElementById("nodeDetails").innerHTML = "";
    let prevNodeValues = cy.elements().map(x => x.json()); //for undo not yet implemented
    let table = document.createElement("table");
    for (let i = 0; i < options.length; i++) {
        let row = document.createElement("tr");
        row.classList.add("optiontable");


        let optionSpan = document.createElement("span");
        const isTargetOption = (node.data().target && i==0);
        let htmlOption = "";
        let color = predicateToTextColour(getPredicateFromIndex(node.data(), i));
        if (isTargetOption)
            htmlOption+=`<div class=targetbox><span class=darkbg><font class=target color=ffff00><b>&darr; GAME TARGET: Your aim is to convince ${CHARACTERNAME} of this &darr;</b></font></span><div class=targettextcontainer><font class=target>`;
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
                    node.data("predicateValue", buttonPredValue);
                    narrative.push({
                        message: options[i],
                        logLik: resultingLogLik, prevLogLik: currentLogLik, undo: prevNodeValues
                    });
                    updateBelievabilityDisplay(cy);
                    updateNarrativeDisplay();
                    refreshNodeDetails(node);
                    if (isTargetOption)
                        showModal("<h1>Well done!</h1><h2>Convinced that we are governed by reptiles, "+CHARACTERNAME+" goes out one day and stabs a zookeeper.</h2><h2>I hope you're proud of yourself.</h2>");
                });
            }
            else {
                button.addEventListener("click", function (evt1) {
                    let message = `<h2>You can't convince ${CHARACTERNAME} of this. 
                                       His bullshitometer would climb above 100%.</h2>
                                       <h3>Hints</h3><ul>`;
                    //if node is not researched, suggest researching it
                    if (node.data("researched")==0)
                        message += `<li>Try researching ${CHARACTERNAME}'s influencing beliefs first</li>`;
                    else
                    {
                        message += `<li>Maybe influencing some other beliefs first will help.</li>`;
                        message += `<li>Even if the other beliefs all support what you're trying to do, it could be that the belief you're trying to influence is still unlikely. Something else you've done is driving ${CHARACTERNAME}'s bullshitometer too high to trust you, so you need to lower it first.
                            <br>
                                Look at the mind map for clues:
                                <ul>
                                    <li>Are any other beliefs influenced by this one? Maybe changing this belief would cause those to generate too much bullshit.</li>
                                    <li>Are any beliefs drawn larger? This means they are currently triggering the bullshitometer more.</li>
                                    <li>Are any links between beliefs drawn in red? This means they are currently contradicting each other.</li>
                                    <li>Are any links between beliefs drawn in grey? This means they aren't influencing each other at all right now, but they potentially could.</li>
                                </ul>	
                            </li>`;
                    }
                    showModal(message);
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

function displayRelatedBeliefs(node) {
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
    
    document.getElementById("ResearchButton").innerHTML += "<h3>" + CHARACTERNAME + "'s other beliefs...</h3>";
    if (supportingBeliefs.length > 0) {
        document.getElementById("ResearchButton").innerHTML += "<h3>...currently supporting this one:</h3>";
        let list = document.createElement("ul");
        for (let [mutualSupport, otherBelief, narrative] of supportingBeliefs) {
            list.innerHTML += "<li><font color=green>+" + mutualSupport + ": " + otherBelief + ".</font>" + narrative + "</li>";
        }
        document.getElementById("ResearchButton").appendChild(list);
    }
    if (opposingBeliefs.length > 0) {
        document.getElementById("ResearchButton").innerHTML += "<h3>...currently opposing this one:</h3>";
        let list = document.createElement("ul");
        for (let [mutualSupport, otherBelief, narrative] of opposingBeliefs) {
            list.innerHTML += "<li><font color=red>" + mutualSupport + ": " + otherBelief + ".</font>" + narrative + "</li>";
        }
        document.getElementById("ResearchButton").appendChild(list);
    }
    if (neutralBeliefs.length > 0) {
        document.getElementById("ResearchButton").innerHTML += "<h3>...that could affect this one, but currently don't:</h3>";
        let list = document.createElement("ul");
        for (let [mutualSupport, otherBelief, narrative] of neutralBeliefs) {
            list.innerHTML += `<li>${otherBelief}. ${narrative}</li>`;
        }
        document.getElementById("ResearchButton").appendChild(list);
    }

    supportingBeliefs = [];
    opposingBeliefs = [];
    neutralBeliefs = [];
    for (let [e, nodeSupport] of getSupportedEdgesCoeffs(node)) {
        let n = e.target();
        let otherBelief = n.data().displaylabel + ": " + n.data().options[predicateToIndex(n)];
        const otherPredicate = n.data().predicateValue;

        let narrative = getNarrative(e, predicateValue, otherPredicate);
        if (narrative != "")
            narrative = " <i>" + narrative + "</i>";

        if (nodeSupport > 0)
            supportingBeliefs.push([nodeSupport, otherBelief, narrative]);
        else if (nodeSupport < 0)
            opposingBeliefs.push([nodeSupport, otherBelief, narrative]);
        else
            neutralBeliefs.push([nodeSupport, otherBelief, narrative]);
    }
    
    if (supportingBeliefs.length > 0) {
        document.getElementById("ResearchButton").innerHTML += "<h3>...currently supported by this one:</h3>";
        let list = document.createElement("ul");
        for (let [mutualSupport, otherBelief, narrative] of supportingBeliefs) {
            list.innerHTML += "<li><font color=green>+" + mutualSupport + ": " + otherBelief + ".</font>" + narrative + "</li>";
        }
        document.getElementById("ResearchButton").appendChild(list);
    }
    if (opposingBeliefs.length > 0) {
        document.getElementById("ResearchButton").innerHTML += "<h3>...currently opposed by this one:</h3>";
        let list = document.createElement("ul");
        for (let [mutualSupport, otherBelief, narrative] of opposingBeliefs) {
            list.innerHTML += "<li><font color=red>" + mutualSupport + ": " + otherBelief + ".</font>" + narrative + "</li>";
        }
        document.getElementById("ResearchButton").appendChild(list);
    }
    if (neutralBeliefs.length > 0) {
        document.getElementById("ResearchButton").innerHTML += "<h3>...that could be affected by this one, but currently aren't:</h3>";
        let list = document.createElement("ul");
        for (let [mutualSupport, otherBelief, narrative] of neutralBeliefs) {
            list.innerHTML += `<li>${otherBelief}. ${narrative}</li>`;
        }
        document.getElementById("ResearchButton").appendChild(list);
    }
}