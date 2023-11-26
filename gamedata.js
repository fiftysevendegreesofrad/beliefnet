const PERMITTEDMINLOGPROB = -7.1; //for restricting moves; derived from game analysis
const CHARACTERNAME = "Bruto";
async function load_elements(debug=false)
{
    //let response = await fetch(new Request(filename));
    //let text = await response.text();
    let text=`
REPTILES 0.00000000000001: Reptilian Elite
The world is governed by a secret elite of literal reptiles - actual lizard people
The world is governed by humans
+5 QANON
If Bruto believes in QAnon, it's not too much of a stretch for him to believe the Satanic overlords are actually lizards as well
If Bruto doesn't even believe in a secret human cult running the world, he's not likely to believe in a lizard one
+10 GOVERNMENTS
...which could even be run by lizards too
...and they haven't said anything about lizard people
+5 CHEMTRAILS
Chemtrails could be a plot by the lizard people to stop us from seeing the truth
Without chemtrails for mind control, it would be hard for any lizard leaders to hide themselves
+5.5 BIRDS
The drones could be used by lizard people to spy on us
How would lizard people spy on us without fake bird drones?
+3 OUTSIDER
Bruto is more likely to believe wacky shit if he identifies as an outsider.
Conventional members of society don't believe such nonsense.

QANON 0.001: QAnon
Donald Trump's primary struggle is to fight against Satan worshipping sex offenders
Donald Trump's primary struggle is that he is Donald Trump
+5 CHEMTRAILS
If chemtrails are a thing, these guys are the number one suspects for being behind them
Without chemtrails for mind control, it would be hard for a global satanic cult to stay so secret
+10 GOVERNMENTS
...which could well be QAnon
...and they are pretty clear about QAnon being nonsense
+3 OUTSIDER
Bruto is more likely to adopt unconventional beliefs if he identifies as an outsider.
Conventional members of society don't believe such nonsense.

GOVERNMENTS 0.2: Governments
Governments are the tools of a secret evil world order
Governments are no more competent or moral than the rest of us 
Governments can be trusted 
+5 COMPETENT
And you have to follow the dots - who is doing the supressing? 
No evidence for government conspiracy there.
+5 PHARMA
And it's likely the government is involved too.
No evidence for government conspiracy there.
+10 EXPERTSEVIL
And many of then are openly in the pay of the government.
Never explain with conspiracy what can be explained by incompetence.

BIRDS 0.000001: Birds
All birds have been replaced with robot surveillance drones
Birds are just birds, man, they're cool but what's the big deal?
+5 GOVERNMENTS
A secret world order needs its spy drones
But pigeons shit on statues of politicians anyway, of course
+5 FIVEG
The masts are also used to control the bird drones
Without any secret tech on those masts, how would they control the bird drones?
+3 OUTSIDER
Bruto is more likely to adopt batshit crazy beliefs like this if he identifies as an outsider.
Conventional members of society don't believe such nonsense.
+5 EXPERTSEVIL
You need them on board to stop people finding out.
And lots of bird experts are very clear about them being animals, not robots.

FIVEG 0.05: 5G
Disease is caused by 5G phone masts
Disease is caused by germs, viruses, etc
+5 CHEMTRAILS
+5 GOVERNMENTS
-5 HOPE
+3 OUTSIDER
+5 EXPERTSEVIL

CHEMTRAILS 0.1: Chemtrails
Trails left behind jets are chemtrails used for mind control
Trails left behind jets are condensed water called contrails
+5 PHARMA
+5 GOVERNMENTS
-5 HOPE
+3 OUTSIDER
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
It should be the other way round, shouldn't it? Like, Bruto should be more hopeful about life if he thinks he's competent. Still, he's got an interview next week. He'll do better if he's confident, and he'll be far more confident if he takes the optimistic point of view.
I'm afraid it's the depression talking.

IBSCURE 0.5: IBS 
My Irritable Bowel Syndrome can be cured
...well, maybe. I dunno.
My Irritable Bowel Syndrome is incurable
+5 HOPE
It should be the other way round, shouldn't it? Like, Bruto should only be hopeful about this if a potential cure looks promising. But maybe it's better for his sanity to be optimistic. The placebo effect is real, after all.
It should be the other way round, shouldn't it? Not counting the placebo effect, any future cure for IBS won't be held back by Bruto's pessimism. But that's not how depression works, is it.

HOPE 0.9: Hope
My life is good. There is hope &#128512;
I am useless. There is no hope for me &#128577;

OUTSIDER 0.1: Outsider
My friends don't accept me; I need to find new friends who think like me
I'm secure in my friendships as a conventional member of society
+5 NORESPECT
Why do I even think of them as friends any more?
+1 REPTILES
Most people just don't think that.
See, a conventional view!
+1 QANON
Most people just don't think that.
No comment.
+1 BIRDS
WAKE UP SHEEPLE!
See, a conventional view!
+1 FIVEG
WAKE UP SHEEPLE!
The science is pretty clear.
+1 CHEMTRAILS
WAKE UP SHEEPLE!
It's something to do with vortices. I paid attention in school, see.

NORESPECT 0.5: Respect
When we disagree on politics, my friends treat me with disdain and disgust for my opinions
My friends respect our differences

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
            predicateValue: 0, logprob: 0, researched: 0, target: false}});

        //now we are expecting edges
        while(line.trim()!="")
        {
            if (line[0]=="+"||line[0]=="-")
            {
                let parts = line.split(" ");
                let weight = parseFloat(parts[0]);
                let source = parts[1].trim();
                elements.edges.push({data: {source: source, target: nodeLabel, weight: weight, absweight: Math.abs(weight), 
                    directed: true, color:'grey', narrative: []}});
            }
            else
            {
                if (line=="no narrative") line="";
                elements.edges[elements.edges.length-1].data.narrative.push(line);
            }
            line = lines.shift();
        }
    }
    elements.nodes[0].data.target=true; //first node is the target
    return elements;
}

module.exports = {load_elements, PERMITTEDMINLOGPROB};