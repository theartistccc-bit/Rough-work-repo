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
    tab=collections.defaultdict(lambda:[0,0,0,0])
    bydate=collections.OrderedDict()
    for m in ms: bydate.setdefault(m['date'],[]).append(m)
    teams={SHORT[m['team1']] for m in ms}|{SHORT[m['team2']] for m in ms}
    key=lambda T,t:(-T[t][0],-(T[t][1]-T[t][2]),-T[t][1],t)
    for d,day in bydate.items():
        order=sorted(teams,key=lambda t:key(tab,t)); pos={t:i+1 for i,t in enumerate(order)}
        started=all(tab[t][3]>0 for t in teams)
        def ifwin(t):
            T={k:list(v) for k,v in tab.items()}; T.setdefault(t,[0,0,0,0]); T[t][0]+=3; T[t][1]+=1
            for k in teams: T.setdefault(k,[0,0,0,0])
            o=sorted(teams,key=lambda k:key(T,k)); return o.index(t)+1
        for m in day:
            h,a=SHORT[m['team1']],SHORT[m['team2']]; x,y=m['score']['ft']
            def info(t):
                n=nm(t); p=pos[t] if started else None
                one=(n==1) or (p is not None and red(p)==1)
                nine_src=[]
                if n==9: nine_src.append('name')
                if p is not None and red(p)==9: nine_src.append('position')
                if p is not None and p!=9 and ifwin(t)==9: nine_src.append('move-to-9th')
                return dict(n=n,p=p,one=one,nine=nine_src)
            rows.append(dict(league=LEAGUES[l],date=d,h=h,a=a,x=x,y=y,H=info(h),A=info(a)))
        for m in day:
            h,a=SHORT[m['team1']],SHORT[m['team2']]; x,y=m['score']['ft']
            for t,gf,ga in ((h,x,y),(a,y,x)):
                tab[t][1]+=gf;tab[t][2]+=ga;tab[t][3]+=1;tab[t][0]+=3 if gf>ga else 1 if gf==ga else 0
def res(margin,hc):
    return 'W' if margin<hc else 'P' if margin==hc else 'L'
def tally(bets,hc):
    c=collections.Counter(res(m,hc) for m in bets); n=c['W']+c['L']
    return c, (100*c['W']/n if n else 0)
bets=[];ctrl=[];allm=[]
for r in rows:
    for one,opp,m1 in ((r['H'],r['A'],r['x']-r['y']),(r['A'],r['H'],r['y']-r['x'])):
        if one['p'] is None: continue
        allm.append((m1,one,opp,r))
        if one['one']:
            if opp['nine'] and not opp['one'] and not one['nine']: bets.append((m1,one,opp,r))
            elif not opp['nine']: ctrl.append((m1,one,opp,r))
print("matches",len(rows))
for hc in (2,3):
    print(f"\n=== handicap +{hc} on the opponent of the 1 ===")
    for lab,sel in (("1 vs 9 (rule)",bets),("1 vs non-9 (control)",ctrl),("any team (baseline)",allm)):
        c,p=tally([b[0] for b in sel],hc); print(f"  {lab:22} n={len(sel):4}  W {c['W']}  P {c['P']}  L {c['L']}  win% (excl. push) {p:.1f}")
    for src in ('name','position','move-to-9th'):
        s=[b for b in bets if src in b[2]['nine']]; c,p=tally([b[0] for b in s],hc)
        print(f"    9 by {src:12} n={len(s):3} W {c['W']} P {c['P']} L {c['L']}  {p:.1f}%")
    # strong 1 (top 5) vs weaker 9 and control
    for lab,f in (("1 is top-5 side",lambda b:b[1]['p']<=5),("1 is not top-5",lambda b:b[1]['p']>5)):
        s=[b for b in bets if f(b)]; s2=[b for b in ctrl if f(b)]
        c,p=tally([b[0] for b in s],hc); c2,p2=tally([b[0] for b in s2],hc)
        print(f"    {lab:16} rule n={len(s)} {p:.1f}%   control n={len(s2)} {p2:.1f}%")
def fisher(a,b,c,d):
    n=a+b+c+d;r1=a+b;c1=a+c
    return sum(comb(r1,x)*comb(n-r1,c1-x)/comb(n,c1) for x in range(a,min(r1,c1)+1))
for hc in (2,3):
    c,_=tally([b[0] for b in bets],hc); c2,_=tally([b[0] for b in ctrl],hc)
    print(f"\np-value rule better than control at +{hc}: {fisher(c['W'],c['L'],c2['W'],c2['L']):.3f}")
# 1 result distribution
c=collections.Counter('win' if b[0]>0 else 'draw' if b[0]==0 else 'loss' for b in bets)
c2=collections.Counter('win' if b[0]>0 else 'draw' if b[0]==0 else 'loss' for b in ctrl)
print("\n1's results vs a 9:",dict(c)," | 1 vs non-9:",dict(c2))
print("\nTop-5 '1' teams losing the +3 bet (won by 4+) vs 9s:")
for b in bets:
    if b[0]>3: print(f"  {b[3]['date']} {b[3]['h']} {b[3]['x']}-{b[3]['y']} {b[3]['a']}")
