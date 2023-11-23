function assert(bool) {
    if (!bool)
        throw "Assertion failed.";
}
function predicateToIndex(node, predicateValue=node.data("predicateValue")) {
    return (1 - predicateValue) * (node.data("options").length - 1);
}
function predicateToOption(node, predicateValue) {
    return node.data("options")[predicateToIndex(node, predicateValue)];
}
function getPredicateFromIndex(node, index) {
    return 1 - index / (node.options.length - 1);
}
function nodeCoeffValue(node) {
    return (node.data("predicateValue") * 2 - 1);
}
function computeNodeMutualSupport(n1, n2) {
    let weight = n1.edgesWith(n2).data("weight");
    return nodeCoeffValue(n1) * nodeCoeffValue(n2) * weight;
}
function updateEdgeColoursGetNodeLogProb(n) {
    //console.log(" "+n.data("label")+" "+predicateToOption(n, n.data("predicateValue")));
    let baseProb = n.data("baseProb");
    let altLogOdds = Math.log(baseProb / (1 - baseProb));
    let nodeLogOdds = altLogOdds*nodeCoeffValue(n);
    //console.log("  alt-baseprob "+baseProb+" alt-logodds "+altLogOdds+" option-logodds "+nodeLogOdds);
    let linkedEdges = [];
    for (e of n.incomers("edge")) 
        linkedEdges.push([e, e.source()]);
    //uncomment to make all edges bidirectional
    //for (e of n.outgoers("edge"))
    //    linkedEdges.push([e, e.target()]);
    
    for (let [e, otherNode] of linkedEdges)
    {
        assert(otherNode!==n);
        let nodeMutualSupport = computeNodeMutualSupport(n, otherNode);
        //console.log("  mutual support from "+otherNode.data("label")+" "+nodeMutualSupport);
        nodeLogOdds += nodeMutualSupport;
        if (nodeMutualSupport > 0)
            e.data("color", "green");
        else if (nodeMutualSupport < 0)
            e.data("color", "red");
        else
            e.data("color", "grey");
    }
    
    let logProb = nodeLogOdds - Math.log(1 + Math.exp(nodeLogOdds));
    //console.log( "  final log odds "+nodeLogOdds+" logProb "+logProb);
    return logProb;
}
function computeBelievabilityFromLogLik(logLik) {
    //believability is a scale of two parts. 
    //0-50% maps MINLOGPROB to PERMITTEDMINLOGPROB
    //50-100% maps PERMITTEDMINLOGPROB to MAXLOGPROB
    //You might ask why this is not done in probability space, not log probability space.
    //It just doesn't work so well for a display that way.
    let believability;
    if (logLik < PERMITTEDMINLOGPROB)
        believability = (logLik - MINLOGPROB) / (PERMITTEDMINLOGPROB - MINLOGPROB) * 50;
    else
        believability = 50 + (logLik - PERMITTEDMINLOGPROB) / (MAXLOGPROB - PERMITTEDMINLOGPROB) * 50;
    
    //round to 1 decimal place
    return believability.toFixed(1);
}
function updateLogLik(cy) {
    let logLik = 0;
    for (n of cy.nodes()) {
        let logProb = updateEdgeColoursGetNodeLogProb(n);
        n.data("logprob", logProb);
        let baseLogProb = Math.log(n.data("baseProb"));
        n.data("displaylabel", n.data("label")+baseLogProb.toFixed(1)+" "+logProb.toFixed(1));
        logLik += logProb;
    }
    return logLik;
}
function altNetworkLogLik(cy, nodesToChange) {
    let eles = cy.elements().map(x => x.json());
    let cyClone = cytoscape({ elements: eles, headless: true });
    for (let [nodeID, nodePredValue] of Object.entries(nodesToChange))
        cyClone.getElementById(nodeID).data("predicateValue", nodePredValue);
    return updateLogLik(cyClone);
}
