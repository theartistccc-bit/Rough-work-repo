import json, sys, unicodedata, collections
from math import comb
D=sys.argv[1]
SHORT={"AFC Bournemouth":"Bournemouth","Arsenal FC":"Arsenal","Aston Villa FC":"Aston Villa","Brentford FC":"Brentford","Brighton & Hove Albion FC":"Brighton","Burnley FC":"Burnley","Chelsea FC":"Chelsea","Crystal Palace FC":"Crystal Palace","Everton FC":"Everton","Fulham FC":"Fulham","Leeds United FC":"Leeds United","Liverpool FC":"Liverpool","Manchester City FC":"Manchester City","Manchester United FC":"Manchester United","Newcastle United FC":"Newcastle United","Nottingham Forest FC":"Nottingham Forest","Sunderland AFC":"Sunderland","Tottenham Hotspur FC":"Tottenham Hotspur","West Ham United FC":"West Ham United","Wolverhampton Wanderers FC":"Wolverhampton",
"Athletic Club":"Athletic","CA Osasuna":"Osasuna","Club Atlético de Madrid":"Atletico Madrid","Deportivo Alavés":"Alaves","Elche CF":"Elche","FC Barcelona":"Barcelona","Getafe CF":"Getafe","Girona FC":"Girona","Levante UD":"Levante","RC Celta de Vigo":"Celta","RCD Espanyol de Barcelona":"Espanyol","RCD Mallorca":"Mallorca","Rayo Vallecano de Madrid":"Rayo Vallecano","Real Betis Balompié":"Betis","Real Madrid CF":"Real Madrid","Real Oviedo":"Oviedo","Real Sociedad de Fútbol":"Real Sociedad","Sevilla FC":"Sevilla","Valencia CF":"Valencia","Villarreal CF":"Villarreal",
"AC Milan":"Milan","AC Pisa 1909":"Pisa","ACF Fiorentina":"Fiorentina","AS Roma":"Roma","Atalanta BC":"Atalanta","Bologna FC 1909":"Bologna","Cagliari Calcio":"Cagliari","Como 1907":"Como","FC Internazionale Milano":"Inter","Genoa CFC":"Genoa","Hellas Verona FC":"Verona","Juventus FC":"Juventus","Parma Calcio 1913":"Parma","SS Lazio":"Lazio","SSC Napoli":"Napoli","Torino FC":"Torino","US Cremonese":"Cremonese","US Lecce":"Lecce","US Sassuolo Calcio":"Sassuolo","Udinese Calcio":"Udinese",
"1. FC Heidenheim 1846":"Heidenheim","1. FC Köln":"Koln","1. FC Union Berlin":"Union Berlin","1. FSV Mainz 05":"Mainz","Bayer 04 Leverkusen":"Bayer Leverkusen","Borussia Dortmund":"Borussia Dortmund","Borussia Mönchengladbach":"Monchengladbach","Eintracht Frankfurt":"Eintracht Frankfurt","FC Augsburg":"Augsburg","FC Bayern München":"Bayern","FC St. Pauli 1910":"St Pauli","Hamburger SV":"Hamburger SV","RB Leipzig":"RB Leipzig","SC Freiburg":"Freiburg","SV Werder Bremen":"Werder Bremen","TSG 1899 Hoffenheim":"Hoffenheim","VfB Stuttgart":"Stuttgart","VfL Wolfsburg":"Wolfsburg",
"AJ Auxerre":"Auxerre","AS Monaco FC":"Monaco","Angers SCO":"Angers","FC Lorient":"Lorient","FC Metz":"Metz","FC Nantes":"Nantes","Le Havre AC":"Le Havre","Lille OSC":"Lille","OGC Nice":"Nice","Olympique Lyonnais":"Lyon","Olympique de Marseille":"Marseille","Paris FC":"Paris FC","Paris Saint-Germain FC":"PSG","RC Strasbourg Alsace":"Strasbourg","Racing Club de Lens":"Lens","Stade Brestois 29":"Brest","Stade Rennais FC 1901":"Rennes","Toulouse FC":"Toulouse",
"AFC Ajax":"Ajax","AZ":"AZ Alkmaar","FC Groningen":"Groningen","FC Twente '65":"Twente","FC Utrecht":"Utrecht","FC Volendam":"Volendam","Feyenoord Rotterdam":"Feyenoord","Fortuna Sittard":"Fortuna Sittard","Go Ahead Eagles":"Go Ahead Eagles","Heracles Almelo":"Heracles","NAC Breda":"NAC Breda","NEC":"NEC Nijmegen","PEC Zwolle":"PEC Zwolle","PSV":"PSV","SBV Excelsior":"Excelsior","SC Heerenveen":"Heerenveen","Sparta Rotterdam":"Sparta Rotterdam","Telstar 1963":"Telstar",
"AVS":"AVS","CD Nacional":"Nacional","CD Santa Clara":"Santa Clara","CD Tondela":"Tondela","CF Estrela da Amadora":"Estrela Amadora","Casa Pia AC":"Casa Pia","FC Alverca":"Alverca","FC Arouca":"Arouca","FC Famalicão":"Famalicao","FC Porto":"Porto","GD Estoril Praia":"Estoril","Gil Vicente FC":"Gil Vicente","Moreirense FC":"Moreirense","Rio Ave FC":"Rio Ave","Sport Lisboa e Benfica":"Benfica","Sporting Clube de Braga":"Braga","Sporting Clube de Portugal":"Sporting","Vitória Guimarães":"Vitoria Guimaraes"}
def red(n):
    while n>9: n=sum(map(int,str(n)))
    return n
def nm(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode()
    return red(sum((ord(c)-97)%9+1 for c in s.lower() if c.isalpha()))
rows=[]
LEAGUES={'en.1':'Premier League','es.1':'La Liga','it.1':'Serie A','de.1':'Bundesliga','fr.1':'Ligue 1','pt.1':'Primeira Liga','nl.1':'Eredivisie'}
for l in LEAGUES:
    ms=[m for m in json.load(open(f'{D}/{l}.json'))['matches'] if isinstance(m.get('score'),dict) and m['score'].get('ft')]
    ms.sort(key=lambda m:(m['date'],m.get('time','')))
    tab=collections.defaultdict(lambda:[0,0,0,0]) # pts gf ga played
    hist=collections.defaultdict(list)
    # group by date so same-day matches use table before that day
    bydate=collections.OrderedDict()
    for m in ms: bydate.setdefault(m['date'],[]).append(m)
    teams={SHORT[m['team1']] for m in ms}|{SHORT[m['team2']] for m in ms}
    for d,day in bydate.items():
        order=sorted(teams,key=lambda t:(-tab[t][0],-(tab[t][1]-tab[t][2]),-tab[t][1],t))
        pos={t:i+1 for i,t in enumerate(order)}
        for m in day:
            h,a=SHORT[m['team1']],SHORT[m['team2']]; x,y=m['score']['ft']
            def info(t):
                n=nm(t); p=pos[t] if tab[t][3]>0 else None
                nums={n}|({red(p)} if p else set())
                last=hist[t][-5:]
                form=sum(last)/len(last) if len(last)==5 else None
                return n,p,nums,form
            rows.append(dict(league=LEAGUES[l],date=d,h=h,a=a,x=x,y=y,H=info(h),A=info(a)))
        for m in day:
            h,a=SHORT[m['team1']],SHORT[m['team2']]; x,y=m['score']['ft']
            for t,gf,ga in ((h,x,y),(a,y,x)):
                tab[t][1]+=gf;tab[t][2]+=ga;tab[t][3]+=1;tab[t][0]+=3 if gf>ga else 1 if gf==ga else 0
                hist[t].append(gf)
TH=2.0
def is8(i): return 8 in i[2]
def inform(i): return i[3] is not None and i[3]>=TH
def g(r): return r['x']+r['y']
def o35(r): return g(r)>=4
def ext(r): return g(r)<=1 or g(r)>=4
def rate(sel,f): 
    n=len(sel); k=sum(1 for r in sel if f(r)); return k,n,(100*k/n if n else 0)
def fisher(a,b,c,d):
    n=a+b+c+d;r1=a+b;c1=a+c
    return sum(comb(r1,x)*comb(n-r1,c1-x)/comb(n,c1) for x in range(a,min(r1,c1)+1))
valid=[r for r in rows if r['H'][3] is not None and r['A'][3] is not None]
print("matches total",len(rows),"with 5-game form for both",len(valid))
def report(name,sel,ctrl,f,lab):
    k,n,p=rate(sel,f); k2,n2,p2=rate(ctrl,f)
    pv=fisher(k,n-k,k2,n2-k2) if n else 1
    print(f"{name}: {lab} {k}/{n} = {p:.1f}%   | control {k2}/{n2} = {p2:.1f}%   | p={pv:.3f}")
base=valid
eight=[r for r in base if is8(r['H']) or is8(r['A'])]
non8=[r for r in base if not(is8(r['H']) or is8(r['A']))]
report("ANY 8 vs no 8",eight,non8,ext,"extreme")
report("ANY 8 vs no 8",eight,non8,o35,"over3.5")
# in-form 8 rule: at least one 8 team that is in form
s8=[r for r in base if any(is8(i) and inform(i) for i in (r['H'],r['A']))]
ctrl=[r for r in base if not(is8(r['H']) or is8(r['A'])) and (inform(r['H']) or inform(r['A']))]
report("IN-FORM 8 (rule) vs in-form non-8 control",s8,ctrl,o35,"over3.5")
d8=[r for r in base if is8(r['H']) and is8(r['A'])]
report("DOUBLE-8 any form vs no 8",d8,non8,o35,"over3.5")
d8f=[r for r in d8 if inform(r['H']) and inform(r['A'])]
ctrl2=[r for r in non8 if inform(r['H']) and inform(r['A'])]
report("DOUBLE-8 both in form vs both-in-form non-8",d8f,ctrl2,o35,"over3.5")
print("\nby league (in-form 8 rule, over3.5):")
for L in LEAGUES.values():
    a=[r for r in s8 if r['league']==L]; c=[r for r in ctrl if r['league']==L]
    k,n,p=rate(a,o35);k2,n2,p2=rate(c,o35); print(f"  {L:14} rule {k}/{n} {p:.0f}%  control {k2}/{n2} {p2:.0f}%")
print("\nname-only 8 vs position-only 8 (in-form rule):")
for lab,fn in (("name",lambda i:i[0]==8),("position",lambda i:i[1] is not None and red(i[1])==8 and i[0]!=8)):
    a=[r for r in base if any(fn(i) and inform(i) for i in (r['H'],r['A']))]
    k,n,p=rate(a,o35); print(f"  {lab}: {k}/{n} = {p:.1f}%")
print("\ndouble-8 both in form matches:")
for r in d8f: print(f"  {r['date']} {r['league']}: {r['h']} {r['x']}-{r['y']} {r['a']}")
avg_odds=2.9
k,n,p=rate(s8,o35); print(f"\nflat 1 unit on in-form 8 over3.5 at ~{avg_odds}: profit {k*avg_odds-n:.1f} units over {n} bets")
json.dump([dict(r,H=list(r['H'][:2])+[r['H'][3]],A=list(r['A'][:2])+[r['A'][3]]) for r in rows],open(sys.argv[2],'w'))
