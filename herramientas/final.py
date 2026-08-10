from lib import *
import random, math, json
PAPER='#fbfbfd'; NOCHE='#0f0f0e'
random.seed(11)
N=10
# ── la filosofia manda, la metrica comprueba ──
# banda de luminosidad ESTRECHA (46+-3): una sola familia, ningun color que
#   grite ni que desaparezca. el optimizador libre la abria a 12 puntos y
#   producia dos castas visibles.
# croma 20-30: por encima deja de leerse como pigmento sobre plano. es el
#   limite entre "lapiz de color" y "color de interfaz", y es toda la tesis.
L_LO,L_HI = 43, 49
C_LO,C_HI = 20, 30

def cMax(L,H):
    lo,hi=0,C_HI
    for _ in range(22):
        m=(lo+hi)/2
        if enGama(L,m,H): lo=m
        else: hi=m
    return lo

def sw(p):
    out=[]
    for L,H,c in p:
        C=max(C_LO*0.85, min(c, cMax(L,H)))
        out.append((lch2hex(L,C,H),L,C,H))
    return out

def puntua(s):
    hx=[h for h,_,_,_ in s]
    if any(contraste(h,PAPER)<3.2 for h in hx): return -1e9
    nor=min(de2000(hx[i],hx[j]) for i in range(N) for j in range(i+1,N))
    d=[simular(h,'deuteranopia') for h in hx]
    dm=min(de2000(d[i],d[j]) for i in range(N) for j in range(i+1,N))
    return nor + 1.4*dm

p=[[46,i*360/N,26] for i in range(N)]
best,bp=sw(p),puntua(sw(p))
for k in range(9000):
    T=1-k/9000
    c=[list(x) for x in p]; i=random.randrange(N)
    c[i][1]=(c[i][1]+random.gauss(0,20*T+3))%360
    c[i][0]=max(L_LO,min(L_HI,c[i][0]+random.gauss(0,2.5*T+.6)))
    c[i][2]=max(C_LO,min(C_HI,c[i][2]+random.gauss(0,4*T+1)))
    s=sw(c); q=puntua(s)
    if q>bp: p,best,bp=c,s,q

# ── orden codicioso: el que se asigna primero debe ser el mas distinto ──
# plan reparte colores por orden. asi un estudiante con 4 asignaturas recibe
# las 4 mas separadas entre si, no las 4 primeras del array.
rest=list(best); orden=[max(rest,key=lambda x:x[2])]; rest.remove(orden[0])
while rest:
    sig=max(rest,key=lambda cand:min(de2000(cand[0],o[0]) for o in orden))
    orden.append(sig); rest.remove(sig)

NOM=['pizarra','terracota','oliva','cardenillo','ciruela','ocre','indigo','salvia','oxido','humo']
def nombra(H):
    tabla=[(20,'terracota'),(48,'oxido'),(78,'ocre'),(108,'oliva'),(150,'salvia'),
           (185,'pino'),(215,'cardenillo'),(248,'acero'),(285,'indigo'),(320,'ciruela'),(360,'granate')]
    for lim,n in tabla:
        if H<lim: return n
    return 'granate'

print("═══ PALETA MIRADAPROPIA · pigmento sobre plano ═══")
print(f"{'#':>2}  {'nombre':<11} {'hex':<9} {'L*':>5} {'C*':>5} {'H°':>6} {'contraste':>10}")
claro=[]
for i,(h,L,C,H) in enumerate(orden,1):
    n=nombra(H); claro.append(h)
    print(f"{i:>2}  {n:<11} {h:<9} {L:5.1f} {C:5.1f} {H:6.1f} {contraste(h,PAPER):9.2f}:1")

Ls=[L for _,L,_,_ in orden]; Cs=[C for _,_,C,_ in orden]
print(f"\n  luminosidad  rango {max(Ls)-min(Ls):.1f} L*   (actual 22.2)")
print(f"  croma        {min(Cs):.0f}–{max(Cs):.0f}      (actual 0–63)")
print(f"  ΔE mínimo    {min(de2000(claro[i],claro[j]) for i in range(N) for j in range(i+1,N)):.1f}       (actual 4.2)")
for t in ('deuteranopia','protanopia'):
    s=[simular(h,t) for h in claro]
    print(f"  ΔE {t:<13}{min(de2000(s[i],s[j]) for i in range(N) for j in range(i+1,N)):.1f}")
print("\n  con 4 asignaturas (las 4 primeras):", f"ΔE mín {min(de2000(claro[i],claro[j]) for i in range(4) for j in range(i+1,4)):.1f}")
print("  con 6 asignaturas:", f"ΔE mín {min(de2000(claro[i],claro[j]) for i in range(6) for j in range(i+1,6)):.1f}")

# ── variantes de noche: mismo tono, luminosidad levantada ──
# los --cat NO tenian variante oscura: un L*45 sobre casi-negro queda turbio.
oscuro=[]
for h,L,C,H in orden:
    Ln=68
    Cn=min(C*0.86, cMax(Ln,H))
    oscuro.append(lch2hex(Ln,Cn,H))
print("\n═══ VARIANTES DE NOCHE (L* 68) ═══")
print("  contraste sobre #0f0f0e:", ' '.join(f"{contraste(h,NOCHE):.1f}" for h in oscuro))
json.dump({'claro':claro,'oscuro':oscuro,'nombres':[nombra(H) for _,_,_,H in orden]},open('paleta.json','w'))
print("\nCLARO  =", claro)
print("OSCURO =", oscuro)
