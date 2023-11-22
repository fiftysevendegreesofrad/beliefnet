function predicateToIndex(node) {
    return (1 - node.data("predicateValue")) * (node.data("options").length - 1);
}
function getPredicateFromIndex(node, index) {
    return 1 - index / (node.options.length - 1);
}
function computeNodeMutualSupport(n1, n2) {
    let n1CoeffValue = n1.data("predicateValue") * 2 - 1;
    let n2CoeffValue = n2.data("predicateValue") * 2 - 1;
    let weight = n1.edgesWith(n2).data("weight");
    return n1CoeffValue * n2CoeffValue * weight;
}
function updateEdgeColoursGetNodeLogProb(n) {
    let baseProb = n.data("baseProb");
    let nodeLogOdds = Math.log(baseProb / (1 - baseProb));

    for (e of n.incomers("edge")) {
        let nodeMutualSupport = computeNodeMutualSupport(n, e.source());
        nodeLogOdds += nodeMutualSupport;

        if (nodeMutualSupport > 0)
            e.data("color", "green");
        else if (nodeMutualSupport < 0)
            e.data("color", "red");
        else
            e.data("color", "grey");
    }
    return nodeLogOdds - Math.log(1 + Math.exp(nodeLogOdds));
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
