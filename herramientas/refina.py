from lib import *
import random, json
PAPER='#fbfbfd'; NOCHE='#0f0f0e'; N=10
random.seed(23)
L_LO,L_HI=43,49; C_LO,C_HI=20,30
def cMax(L,H):
    lo,hi=0,C_HI
    for _ in range(22):
        m=(lo+hi)/2
        if enGama(L,m,H): lo=m
        else: hi=m
    return lo
def sw(p):
    return [(lch2hex(L,max(C_LO*.85,min(c,cMax(L,H))),H),L,max(C_LO*.85,min(c,cMax(L,H))),H) for L,H,c in p]
def peorPar(hx,tipo=None):
    s=[simular(h,tipo) for h in hx] if tipo else hx
    return min((de2000(s[i],s[j]),i,j) for i in range(N) for j in range(i+1,N))
def puntua(s):
    hx=[h for h,_,_,_ in s]
    if any(contraste(h,PAPER)<3.2 for h in hx): return -1e9
    n=peorPar(hx)[0]; d=peorPar(hx,'deuteranopia')[0]; p=peorPar(hx,'protanopia')[0]
    # el peor de los dos daltonismos frecuentes pesa igual que la vision normal
    return n + 1.6*min(d,p)
base=json.load(open('paleta.json'))['claro']
p=[[*hex2lch(h)[:1], hex2lch(h)[2], hex2lch(h)[1]] for h in base]
p=[[L,H,C] for L,H,C in p]
best,bp=sw(p),puntua(sw(p))
for k in range(12000):
    T=1-k/12000
    c=[list(x) for x in p]; i=random.randrange(N)
    c[i][1]=(c[i][1]+random.gauss(0,14*T+2))%360
    c[i][0]=max(L_LO,min(L_HI,c[i][0]+random.gauss(0,2*T+.5)))
    c[i][2]=max(C_LO,min(C_HI,c[i][2]+random.gauss(0,3*T+.8)))
    s=sw(c); q=puntua(s)
    if q>bp: p,best,bp=c,s,q
rest=list(best); orden=[max(rest,key=lambda x:x[2])]; rest.remove(orden[0])
while rest:
    sig=max(rest,key=lambda cd:min(de2000(cd[0],o[0]) for o in orden))
    orden.append(sig); rest.remove(sig)
def nombra(H):
    for lim,n in [(20,'terracota'),(45,'oxido'),(78,'ocre'),(112,'oliva'),(152,'salvia'),
                  (188,'pino'),(212,'cardenillo'),(250,'acero'),(288,'indigo'),(325,'malva'),(360,'granate')]:
        if H<lim: return n
claro=[h for h,_,_,_ in orden]
print("═══ PALETA FINAL ═══")
print(f"{'#':>2}  {'nombre':<11} {'hex':<9} {'L*':>5} {'C*':>5} {'H°':>6} {'contraste':>10}")
for i,(h,L,C,H) in enumerate(orden,1):
    print(f"{i:>2}  {nombra(H):<11} {h:<9} {L:5.1f} {C:5.1f} {H:6.1f} {contraste(h,PAPER):9.2f}:1")
Ls=[L for _,L,_,_ in orden]; Cs=[C for _,_,C,_ in orden]
print(f"\n  luminosidad rango  {max(Ls)-min(Ls):.1f} L*")
print(f"  croma              {min(Cs):.0f}–{max(Cs):.0f}")
print(f"  ΔE normal          {peorPar(claro)[0]:.1f}")
print(f"  ΔE deuteranopia    {peorPar(claro,'deuteranopia')[0]:.1f}")
print(f"  ΔE protanopia      {peorPar(claro,'protanopia')[0]:.1f}")
for n in (3,4,5,6,8):
    print(f"  con {n} asignaturas:   ΔE mín {min(de2000(claro[i],claro[j]) for i in range(n) for j in range(i+1,n)):.1f}")
oscuro=[lch2hex(68,min(C*.86,cMax(68,H)),H) for _,L,C,H in orden]
print("\n  noche · contraste sobre #0f0f0e:", ' '.join(f"{contraste(h,NOCHE):.1f}" for h in oscuro))
print(f"  noche · ΔE normal {peorPar(oscuro)[0]:.1f}")
json.dump({'claro':claro,'oscuro':oscuro,'nombres':[nombra(H) for _,_,_,H in orden]},open('final.json','w'))
print("\nCLARO  =",claro); print("OSCURO =",oscuro)
print("NOMBRES=",[nombra(H) for _,_,_,H in orden])
