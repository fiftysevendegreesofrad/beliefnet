
    
const cytoscape = require('cytoscape');
const {load_elements, } = require('./gamedata');
const {
    assert,
    predicateToIndex,
    predicateToOption,
    getPredicateFromIndex,
    nodeCoeffValue,
    getSupportingEdgesCoeffs,
    updateEdgeColoursGetNodeLogProb,
    altNetworkLogLik,
    updateLogLik,
    computeBelievabilityFromLogLik
} = require('./BeliefGraphUtils');
const PriorityQueue = require('./priority-queue.min');

async function output(text) {
    console.log(text);
}
async function progressReport(text) {
    process.stdout.write(text+"\r");
}
async function getAllPredCombinations(nodes) {
    //recurse through all possible node predicate values
    let head = nodes[0];
    let tail = nodes.slice(1);
    let options = head.data("options");
    let optionsPredValues = [];
    for (let i = 0; i < options.length; i++)
        optionsPredValues.push(getPredicateFromIndex(head.data(), i));

    let tailCombinations;
    if (tail.length > 0)
        tailCombinations = await getAllPredCombinations(tail);
    else
        tailCombinations = [[]];

    let result = [];
    for (optionIndex of optionsPredValues)
        for (tailCombination of tailCombinations)
            result.push([optionIndex].concat(tailCombination));
    return result;
}
async function computeStateGraphNodes(cy) {
    let nodes = cy.nodes();
    let combinations = await getAllPredCombinations(nodes);
    output("got all combinations")
    let allLogProbs = [];
    let stateGraphNodes = [];
    for (let i = 0; i < combinations.length; i++) {
        if (i%5000==0)
            progressReport("Combinations: "+i);
        let nodesToChange = {};
        for (let j = 0; j < nodes.length; j++)
            nodesToChange[nodes[j].id()] = combinations[i][j];
        let logprob = altNetworkLogLik(cy, nodesToChange);
        allLogProbs.push(logprob);
        stateGraphNodes.push({id:i, state: combinations[i], logProb: logprob, neighbours: [] });
    }
    return stateGraphNodes;
}
async function computeStateGraphEdges(nodes) {
    let nodecount = 0;
    for (n of nodes) {
        nodecount++;
        if (nodecount % 5000 == 0)
            progressReport("computed edges for nodes: "+nodecount);
        for (n1 of nodes) {
            //if the state of n1 and the state of n differ by exactly one element
            //then add an edge from n1 to n
            let state = n.state;
            let state1 = n1.state;
            let diffCount = 0;
            for (let i = 0; i < state.length; i++)
                if (state[i] != state1[i])
                    diffCount++;
            if (diffCount == 1)
                n.neighbours.push(n1);
        }
    }
}
function describeStateChange(beliefNetGraph,before,after)
{
    let result = "";
    for (let i = 0; i < before.length; i++)
        if (before[i] != after[i])
            result += predicateToOption(beliefNetGraph.nodes()[i],after[i])+" ";
    return result;
}
class SearchState {
    constructor(node,steps=0,backtrace=null,minLogProb=node.logProb) {
        this.minLogProb = minLogProb;
        this.steps = steps;
        this.backtrace = backtrace;
        this.node = node;
    }

    //issue: do we discard ways to reach the same node at worse prob? yes
    //issue: do we discard ways to reach the same node with more steps? only if the minimum cost is the same or better
    getOutgoing(nodeBestSearchStates)
    {
        let outgoingStates = [];
        for (n of this.node.neighbours)
        {
            let newMinLogProb = Math.min(this.minLogProb, n.logProb);
            let newSteps = this.steps+1;
            
            let potentialNewSearchState = new SearchState(n,newSteps,this,newMinLogProb);
            let nodeUnexplored = !(n.id in nodeBestSearchStates);
            if (nodeUnexplored || potentialNewSearchState.compare(nodeBestSearchStates[n.id]) > 0)
                outgoingStates.push(potentialNewSearchState);
        }
        return outgoingStates;
    }

    compare(other) { //returns 1 if this is better, -1 for worse, 0 for equal
        if (this.minLogProb > other.minLogProb)
            return 1;
        if (this.minLogProb < other.minLogProb)
            return -1;
        if (this.steps < other.steps)
            return 1;
        if (this.steps > other.steps)
            return -1;
        return 0;
    }
}
async function findMaxLikelihoodPath(beliefNetGraph, startNode, isEndNode) {
    //NOTE this works on the stateNet graph, not the beliefNet graph which is only included to interpret the results
    let queue = new PriorityQueue({ comparator: function(b, a) { return a.compare(b); }});
    let nodeBestSearchStates = {};
    let startSearchState = new SearchState(startNode);
    queue.queue(startSearchState);
    nodeBestSearchStates[startNode.id] = startSearchState;
    let iterations=0;
    while (queue.length > 0) {
        iterations++;
        if (iterations % 5000 == 0)
            progressReport("Iterations: "+iterations);
        let searchState = queue.dequeue();
        if (isEndNode(searchState.node)) {
            output("Found path with "+searchState.steps+" steps.");
            output("let PERMITTEDMINLOGPROB="+searchState.minLogProb+";");
            let path = [];
            let current = searchState;
            path.push(current.node.logProb.toFixed(2));
            while (current.backtrace != null) {
                let after = current;
                current = current.backtrace;
                //round current.node.logprob to 2 decimal places
                path.push(describeStateChange(beliefNetGraph,current.node.state,after.node.state));
                path.push(current.node.logProb.toFixed(2));
            }
            path.reverse();
            for (p of path)
                output(p);
            let finalState = searchState.node.state;
            if (!finalState.every(x => x === 1))
                output ("WARNING: final state is not all 1s.");
            for (let i = 0; i < finalState.length; i++)
                if (finalState[i] != 1)
                    output(predicateToOption(beliefNetGraph.nodes()[i],finalState[i]));
            return;
        }
        let outgoingStates = searchState.getOutgoing(nodeBestSearchStates);
        for (s of outgoingStates) {
            queue.queue(s);
            nodeBestSearchStates[s.node.id] = s;
        }
    }
    output("No path found.");
}


async function main() {

    let beliefNet = await load_elements(debug=false);

    var beliefNetGraph = cytoscape({
        headless: true,
        styleEnabled: false,
        elements: beliefNet,
    });
    let stateGraph = await computeStateGraphNodes(beliefNetGraph);
    output("Computed "+stateGraph.length+" state graph nodes.");

    let startNode = stateGraph[stateGraph.length - 1];
    assert(startNode.state.every(x => x === 0));

    //set endnode to be any node where the first predicate is true
    let isEndNode = (node) => node.state[0]==1;

    await computeStateGraphEdges(stateGraph);
    output("Computed state graph edges.");

    await findMaxLikelihoodPath(beliefNetGraph, startNode, isEndNode);
}
main();