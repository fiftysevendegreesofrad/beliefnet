function animateNodeDetailsChange(node) {
    let nodeDisplay = document.getElementById("node-display");
    nodeDisplay.classList.remove("show");
    setTimeout(function () { displayNodeDetails(node); }, 350);
}
function hideNodeDetailsUpdateGraphDisplay(cy) {
    let nodeDisplay = document.getElementById("node-display");
    nodeDisplay.addEventListener('transitionend', function() {
        updateGraphDisplay(cy);
    },{once:true});
    nodeDisplay.classList.remove("show");
}
function predicateToTextColour(predicateValue) {
    return predicateValue == 0.5 ? "#111111" : (predicateValue > 0.5 ? "purple" : "blue");
}
function displayNodeDetails(node) {
    updateClownImage(cy);
    
    let nodeDisplay = document.getElementById("node-display");
    nodeDisplay.classList.add("show");

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
                    node.data("predicateValue", buttonPredValue);
                    updateBelievabilityDisplay(cy);
                    animateNodeDetailsChange(node);
                    if (isTargetOption)
                        showModal("<h1>Well done!</h1><h2>Convinced that we are governed by reptiles, "+CHARACTERNAME+" goes out one day and stabs a zookeeper.</h2><h2>I hope you're proud of yourself.</h2>");
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
    let impossibleInfo = document.getElementById("impossible-text");
    impossibleInfo.innerHTML = "";

    hideModal();
    hideNodeDetailsUpdateGraphDisplay(cy);
    allowClickNodes = false;
    let prevPredValue = node.data("predicateValue");
    node.data("predicateValue", hypotheticalPredValue);
    updateBelievabilityDisplay(cy);
    
    let allResearched = cy.nodes().reduce((acc,curr)=>acc && curr.data("researched"),true);
    let researchText = "";
    if (!allResearched)
        researchText = `<li>Not all beliefs have been researched, so some may be missing from this mind map</li>`;

    let cyPanel = document.getElementById("cy");
    
    impossibleInfo.classList.add("impossibleInfo");
    
    let p = document.createElement("p");
    p.innerHTML = `<b>Unachievable belief combination (bullshit > 100%)</b>&nbsp;`;
    
    let revertButton = document.createElement("button");
    revertButton.innerHTML = "Go Back";
    revertButton.className = "align-right";
    p.appendChild(revertButton);
    
    let ul = document.createElement("ul");
    ul.innerHTML = `
    <li>Beliefs shown <span class=larger>larger</span> are triggering the bullshitometer more</li>
    <li>Links shown in <font color=red><b>red</b></font> show contradicting beliefs</li>
    <li>Links shown in <b>grey</b> show beliefs which aren't influencing one another</li>
    ${researchText}`
    p.appendChild(ul);

    impossibleInfo.appendChild(p);

    revertButton.addEventListener("click",()=>{
        node.data("predicateValue", prevPredValue);
        updateBelievabilityDisplay(cy);
        updateGraphDisplay(cy);
        impossibleInfo.innerHTML = "";
        allowClickNodes = true;
    }); 
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