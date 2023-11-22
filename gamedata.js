const MINLOGPROB = -81;
const MAXLOGPROB = 0;
const PERMITTEDMINLOGPROB = -5.74;

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

QANON 0.05: QAnon
Donald Trump's primary struggle is to fight against Satan worshipping paedophiles
Donald Trump's primary struggle is that he is Donald Trump
+5 CHEMTRAILS
+5 GOVERNMENTS

GOVERNMENTS 0.2: Governments
Governments are the tools of a secret evil world order
Governments are no more competent or moral than the rest of us 
Governments can be trusted 
+5 COMPETENT
+1 PHARMA

BIRDS 0.01: Birds
All birds have been replaced with robot surveillance drones
Birds are just birds
+5 GOVERNMENTS
+5 FIVEG

FIVEG 0.05: 5G
Disease is caused by 5G phone masts
Disease is caused by germs, viruses, etc
+5 CHEMTRAILS
+5 GOVERNMENTS
-5 HOPE

CHEMTRAILS 0.1: Chemtrails
Trails left behind jets are chemtrails used for mind control
Trails left behind jets are condensed water called contrails
+5 PHARMA
+5 GOVERNMENTS
-5 HOPE

PHARMA 0.5: Big Pharma
Big pharma is the tool of a secret world order
Big pharma does not always act in the interests of the patient 
Large medical research corporations are trustworthy
+1 IBSCURE
+5 HOMEOPATHY

HOMEOPATHY 0.3: Homeopathy
Homeopathy definitely works
Science has proven nothing about homeopathy, but one day it might
Homeopathy is indistinguishable from placebo, we're done here
+10 IBSCURE

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
Donald Trump's primary struggle is to fight against Satan worshipping paedophiles
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
            predicateValue: 0, logprob: 0, researched: false}});

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