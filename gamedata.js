const PERMITTEDMINLOGPROB = -7.1; //for restricting moves; derived from game analysis

async function load_elements(debug=false)
{
    //let response = await fetch(new Request(filename));
    //let text = await response.text();
    let text=`
REPTILES 0.01: Reptilian Elite
The world is governed by a secret elite of literal reptiles - actual lizard people
The world is governed by humans
+5 QANON
+5 GOVERNMENTS
+5 CHEMTRAILS
+5 BIRDS
-10 HOPE
+1 OUTSIDER

QANON 0.05: QAnon
Donald Trump's primary struggle is to fight against Satan worshipping paedophiles
Donald Trump's primary struggle is that he is Donald Trump
+5 CHEMTRAILS
+5 GOVERNMENTS
+5 OUTSIDER

GOVERNMENTS 0.2: Governments
Governments are the tools of a secret evil world order
Governments are no more competent or moral than the rest of us 
Governments can be trusted 
+5 COMPETENT
+1 PHARMA
+3 EXPERTSEVIL

BIRDS 0.01: Birds
All birds have been replaced with robot surveillance drones
Birds are just birds
+5 GOVERNMENTS
+5 FIVEG
+1 OUTSIDER
+5 EXPERTSEVIL

FIVEG 0.05: 5G
Disease is caused by 5G phone masts
Disease is caused by germs, viruses, etc
+5 CHEMTRAILS
+5 GOVERNMENTS
-5 HOPE
+1 OUTSIDER
+5 EXPERTSEVIL

CHEMTRAILS 0.1: Chemtrails
Trails left behind jets are chemtrails used for mind control
Trails left behind jets are condensed water called contrails
+5 PHARMA
+5 GOVERNMENTS
-5 HOPE
+1 OUTSIDER
+5 EXPERTSEVIL

PHARMA 0.5: Big Pharma
Big pharma is the tool of a secret world order
Big pharma does not always act in the interests of the patient 
Large medical research corporations are trustworthy
+1 IBSCURE
+5 HOMEOPATHY
+5 EXPERTSEVIL

HOMEOPATHY 0.3: Homeopathy
Homeopathy definitely works
Science has proven nothing about homeopathy, but one day it might
Homeopathy is indistinguishable from placebo, we're done here
+10 IBSCURE
+5 EXPERTSWRONG

COMPETENT 0.5: I got fired 
I got fired because the elite are trying to suppress me 
I got fired because my manager was incompetent
I got fired because I am incompetent 
+5 HOPE

IBSCURE 0.5: IBS 
My Irritable Bowel Syndrome can be cured
...well, maybe. I dunno.
My Irritable Bowel Syndrome is incurable
+5 HOPE

HOPE 0.9: Hope
There is hope for me! 
There is no hope for me!

OUTSIDER 0.1: Outsider
I am an outsider not accepted by the mainstream; the only people who will understand me are other outsiders
I am a conventional member of society
+5 NORESPECT
+1 REPTILES
+1 QANON
+1 BIRDS
+1 FIVEG
+1 CHEMTRAILS

NORESPECT 0.5: Respect
My friends treat me with disdain for thinking differently
My friends respect our differences of opinion

EXPERTSWRONG 0.5: Expertise
Anyone who can make YouTube videos is an expert, and I can become one myself by watching them
Experts are sometimes wrong, but if they have spent many years studying a topic, they have a better chance of being right than I do
Experts should always be trusted
+3 PHARMA
+3 GOVERNMENTS
+2 COMPETENT

EXPERTSEVIL 0.05: Expert Conspiracy
Experts are part of a conspiracy to suppress the truth
Most experts are trying to get things right
+3 PHARMA
+3 GOVERNMENTS
+3 EXPERTSWRONG
+3 QANON

`
    if (debug) text=`
REPTILES 0.01: Reptilian Elite
The world is governed by a secret elite of literal reptiles - actual lizard people
The world is governed by humans
+5 QANON
+5 GOVERNMENTS
+5 CHEMTRAILS
+5 BIRDS
-10 HOPE

QANON 0.05: QAnon
Donald Trump's primary struggle is to fight against Satan worshipping sex offenders
Donald Trump's primary struggle is that he is Donald Trump
+5 CHEMTRAILS
+5 GOVERNMENTS

GOVERNMENTS 0.2: Governments
Governments are the tools of a secret evil world order
Governments are no more competent or moral than the rest of us 
Governments can be trusted 

BIRDS 0.01: Birds
All birds have been replaced with robot surveillance drones
Birds are just birds
+5 GOVERNMENTS

CHEMTRAILS 0.1: Chemtrails
Trails left behind jets are chemtrails used for mind control
Trails left behind jets are condensed water called contrails
+5 GOVERNMENTS
-5 HOPE

HOPE 0.9: Hope
There is hope for me! 
There is no hope for me!

`
    let lines = text.split("\n");
    let elements = {nodes: [], edges: []};
    
    while (lines.length > 0)
    {
        let line = lines.shift();
        if (line.trim()=="") continue;

        //expecting node line
        let parts = line.split(":");
        let leftparts = parts[0].split(" ");
        let nodeLabel = leftparts[0].trim();
        let baseProb = parseFloat(leftparts[1]);
        let userLabel = parts[1].trim();

        let options=[]
        line = lines.shift();
        while (true)
        {
            if (line.trim()=="")
                break; //end of node
            if (line[0]=="+" || line[0]=="-")
                break; //that will be an edge
            options.push(line);
            line = lines.shift();
        }
        elements.nodes.push({data: {id: nodeLabel, label: userLabel, displaylabel: userLabel, baseProb: baseProb, options: options,
            predicateValue: 0, logprob: 0, researched: 0}});

        //now we are expecting edges
        while(line.trim()!="")
        {
            let parts = line.split(" ");
            let weight = parseFloat(parts[0]);
            let source = parts[1].trim();
            elements.edges.push({data: {source: source, target: nodeLabel, weight: weight, absweight: Math.abs(weight), 
                directed: true, color:'grey'}});
            line = lines.shift();
        }
    }
    return elements;
}

module.exports = {load_elements, PERMITTEDMINLOGPROB};