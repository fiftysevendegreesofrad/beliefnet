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
    return node.data("predicateValue") * 2 - 1;
}
function computeNodeMutualSupport(n1, n2) {
    let weight = n1.edgesWith(n2).data("weight");
    return nodeCoeffValue(n1) * nodeCoeffValue(n2) * weight;
}
function OLDupdateEdgePredValuesGetNodeLogProb(n)
{
    let baseProb = n.data("baseProb");
    let nodeLogOdds = Math.log(baseProb/(1-baseProb));
    let nodeCoeffValue = n.data("predicateValue")*2-1;
    for (e of n.incomers("edge"))
    {
        let sourcePredValue = e.source().data("predicateValue");
        let incomingCoeffValue = sourcePredValue*2-1;
        nodeLogOdds += incomingCoeffValue*e.data("weight");
    }
    nodeLogOdds *= nodeCoeffValue;
    return nodeLogOdds - Math.log(1+Math.exp(nodeLogOdds));
}
function updateEdgeColoursGetNodeLogProb(n) {
    let baseProb = n.data("baseProb");
    let nodeLogOdds = Math.log(baseProb / (1 - baseProb))*nodeCoeffValue(n);

    console.log("baseprob", baseProb, "logodds", nodeLogOdds);
    for (e of n.incomers("edge")) {
        let nodeMutualSupport = computeNodeMutualSupport(n, e.source());
        nodeLogOdds += nodeMutualSupport;
        console.log("mutual support", nodeMutualSupport, "for edge", e.source().data("displaylabel"));
        if (nodeMutualSupport > 0)
            e.data("color", "green");
        else if (nodeMutualSupport < 0)
            e.data("color", "red");
        else
            e.data("color", "grey");
    }
    let logProb = nodeLogOdds - Math.log(1 + Math.exp(nodeLogOdds));
    console.log("total logodds",nodeLogOdds,"logprob", logProb);
    assert(logProb==OLDupdateEdgePredValuesGetNodeLogProb(n));
    console.log("logprob", logProb, "oldlogprob", OLDupdateEdgePredValuesGetNodeLogProb(n));
    return logProb;
}
function computeBelievabilityFromLogLik(logLik) {
    let believability = (logLik - MINLOGPROB) / (MAXLOGPROB - MINLOGPROB) * 100;
    //round to 1 decimal place
    return Math.round(believability * 10) / 10;
}
function updateLogLik(cy) {
    let logLik = 0;
    for (n of cy.nodes()) {
        let logProb = updateEdgeColoursGetNodeLogProb(n);
        n.data("logprob", logProb);
        n.data("displaylabel", n.data("label"));
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
