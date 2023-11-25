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
function probToLogOdds(prob) {
    return Math.log(prob / (1 - prob));
}
function getPredicateArrayLogProb(beliefNetGraph,predicateArray) {
    const altLogOdds = beliefNetGraph.nodes.map(x => probToLogOdds(x.data.baseProb));
    let nodeLogOdds = altLogOdds.map((x,i) => x * predicateArray[i]);
    for (e of beliefNetGraph.edges) {
        const sourceIndex = e.data.sourceIndex;
        const targetIndex = e.data.targetIndex;
        const weight = e.data.weight;
        const sourcePredicate = predicateArray[sourceIndex];
        const targetPredicate = predicateArray[targetIndex];
        const support = sourcePredicate * targetPredicate * weight;
        nodeLogOdds[targetIndex] += support;
    }
    const logProbs = nodeLogOdds.map(x => x - Math.log(1 + Math.exp(x)));
    const logProb = logProbs.reduce((a,b) => a+b);
    return logProb;
}
function describeStateChange(beliefNetGraph,before,after)
{
    let result = "";
    for (let i = 0; i < before.length; i++)
        if (before[i] != after[i])
        {
            let options = beliefNetGraph.nodes[i].data.options;
            let index = (1 - after[i]) * (options.length - 1);
            result += options[index]+" ";
        }
    return result;
}
class SearchState {
    constructor(node,steps,backtrace,minLogProb) {
        this.minLogProb = minLogProb;
        this.steps = steps;
        this.backtrace = backtrace;
        this.node = node;
    }

    static getFirst(node, gameStateLogProbs) {
        return new SearchState(node,0,null,gameStateLogProbs.get(node));
    }
    //issue: do we discard ways to reach the same node at worse prob? yes
    //issue: do we discard ways to reach the same node with more steps? only if the minimum cost is the same or better
    getOutgoing(nodeBestSearchStates, gameStateLogProbs, predicateArrayOutgoingFunction)
    {
        let outgoingStates = [];
        for (let n of predicateArrayOutgoingFunction(this.node))
        {
            let candidateLogProb = gameStateLogProbs.get(n);
            let newMinLogProb = Math.min(this.minLogProb, candidateLogProb);
            let newSteps = this.steps+1;
            
            let potentialNewSearchState = new SearchState(n,newSteps,this,newMinLogProb);
            let nodeUnexplored = !(nodeBestSearchStates.has(n));
            if (nodeUnexplored || potentialNewSearchState.compare(nodeBestSearchStates[n]) > 0)
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
class GameStateLogProbCache {
    constructor(bng) {
        this.cache = new Map();
        this.beliefNetGraph = bng;
    }
    get(node) {
        if (this.cache.has(node))
            return this.cache.get(node);
        let logProb = getPredicateArrayLogProb(this.beliefNetGraph,node);
        this.cache.set(node,logProb);
        return logProb;
    }
}
function findMaxLikelihoodPath(beliefNet, predicateArrayOutgoingFunction, startNode, isEndNode) {
    //NOTE this works on the game state graph, not the beliefNet graph which is used to calculate weights on the game state graph
    let queue = new PriorityQueue({ comparator: function(b, a) { return a.compare(b); }});
    let gameStateBestPaths = new Map();
    let gameStateLogProbs = new GameStateLogProbCache(beliefNet);
    let startSearchState = SearchState.getFirst(startNode,gameStateLogProbs);
    queue.queue(startSearchState);
    gameStateBestPaths[startNode] = startSearchState;
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
            path.push(gameStateLogProbs.get(current.node));
            while (current.backtrace != null) {
                let after = current;
                current = current.backtrace;
                path.push(describeStateChange(beliefNet,current.node,after.node));
                path.push(gameStateLogProbs.get(current.node));
            }
            path.reverse();
            for (p of path)
                output(p);
            let finalState = searchState.node;
            if (!finalState.every(x => x === 1))
                output ("WARNING: final state is not all 1s.");
            for (let i = 0; i < finalState.length; i++)
                if (finalState[i] != 1)
                {
                    //get option from predicate
                    function predicateToIndex(node, predicateValue) {
                        return (1 - predicateValue) * (node.data.options.length - 1);
                    }
                    function predicateToOption(node, predicateValue) {
                        return node.data.options[predicateToIndex(node, predicateValue)];
                    }                    
                    output(predicateToOption(beliefNet.nodes[i],finalState[i]));
                }
            return;
        }
        let outgoingStates = searchState.getOutgoing(gameStateBestPaths, gameStateLogProbs, predicateArrayOutgoingFunction);
        for (s of outgoingStates) {
            queue.queue(s);
            gameStateBestPaths[s.node] = s;
        }
    }
    output("No path found.");
}

function addNodeIndicesToEdges(beliefNet) { 
    //this is a bit of a hack, but it's a lot easier than trying to figure out how to do it in cytoscape
    for (e of beliefNet.edges) {
        let source = beliefNet.nodes.find(x => x.data.id == e.data.source);
        let target = beliefNet.nodes.find(x => x.data.id == e.data.target);
        e.data.sourceIndex = beliefNet.nodes.indexOf(source);
        e.data.targetIndex = beliefNet.nodes.indexOf(target);
    }
}
async function main() {

    let beliefNet = await load_elements(debug=false);

    addNodeIndicesToEdges(beliefNet);
    let beliefNetOptionCounts = beliefNet.nodes.map(x => x.data.options.length);
    let optionCountToPredicateValues = {2: [-1,1], 3:[-1,0,1]};
    let beliefNetPredicateValues = beliefNetOptionCounts.map(x => optionCountToPredicateValues[x]);
    
    function predicateArrayOutgoingFunction(predicateArray) {
        let outgoing = [];
        for (let i = 0; i < predicateArray.length; i++) {
            for (let pv of beliefNetPredicateValues[i]) {
                if (pv == predicateArray[i]) continue;
                let newState = predicateArray.slice();
                newState[i] = pv;
                outgoing.push(newState);
            }
        }
        return outgoing;
    }

    //startnode is array of 0s with length equal to number of predicates
    let startNode = Array(beliefNetPredicateValues.length).fill(0);

    //set endnode to be any node where the first predicate is true
    let isEndNode = (node) => node[0]==1;

    findMaxLikelihoodPath(beliefNet, predicateArrayOutgoingFunction, startNode, isEndNode);
}
main();