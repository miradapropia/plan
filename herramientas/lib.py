import math
# ── sRGB <-> Lab (D65) ─────────────────────────────────────────────────────
def hex2rgb(h):
    h=h.lstrip('#'); return tuple(int(h[i:i+2],16)/255 for i in (0,2,4))
def rgb2hex(r,g,b):
    f=lambda v:max(0,min(255,round(v*255)))
    return '#%02x%02x%02x'%(f(r),f(g),f(b))
def lin(c): return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def unlin(c): return 12.92*c if c<=0.0031308 else 1.055*c**(1/2.4)-0.055
M=[[.4124564,.3575761,.1804375],[.2126729,.7151522,.0721750],[.0193339,.1191920,.9503041]]
Mi=[[3.2404542,-1.5371385,-.4985314],[-.9692660,1.8760108,.0415560],[.0556434,-.2040259,1.0572252]]
WP=(.95047,1.0,1.08883)
def rgb2xyz(r,g,b):
    v=[lin(r),lin(g),lin(b)]
    return tuple(sum(M[i][j]*v[j] for j in range(3)) for i in range(3))
def xyz2rgb(x,y,z):
    v=[x,y,z]
    return tuple(unlin(max(0,min(1,sum(Mi[i][j]*v[j] for j in range(3))))) for i in range(3))
def f(t): return t**(1/3) if t>216/24389 else (24389/27*t+16)/116
def fi(t): return t**3 if t**3>216/24389 else (116*t-16)/(24389/27)
def xyz2lab(x,y,z):
    fx,fy,fz=f(x/WP[0]),f(y/WP[1]),f(z/WP[2])
    return (116*fy-16, 500*(fx-fy), 200*(fy-fz))
def lab2xyz(L,a,b):
    fy=(L+16)/116; fx=fy+a/500; fz=fy-b/200
    return (fi(fx)*WP[0], fi(fy)*WP[1], fi(fz)*WP[2])
def hex2lab(h): return xyz2lab(*rgb2xyz(*hex2rgb(h)))
def lch2hex(L,C,H):
    a=C*math.cos(math.radians(H)); b=C*math.sin(math.radians(H))
    return rgb2hex(*xyz2rgb(*lab2xyz(L,a,b)))
def lab2lch(L,a,b):
    return (L, math.hypot(a,b), math.degrees(math.atan2(b,a))%360)
def hex2lch(h): return lab2lch(*hex2lab(h))
def enGama(L,C,H):
    a=C*math.cos(math.radians(H)); b=C*math.sin(math.radians(H))
    x,y,z=lab2xyz(L,a,b); v=[x,y,z]
    raw=[sum(Mi[i][j]*v[j] for j in range(3)) for i in range(3)]
    return all(-0.001<=c<=1.001 for c in raw)
# ── contraste WCAG ─────────────────────────────────────────────────────────
def lum(h):
    r,g,b=hex2rgb(h); return .2126*lin(r)+.7152*lin(g)+.0722*lin(b)
def contraste(a,b):
    l1,l2=sorted([lum(a),lum(b)],reverse=True); return (l1+.05)/(l2+.05)
# ── CIEDE2000 ──────────────────────────────────────────────────────────────
def de2000(c1,c2):
    L1,a1,b1=hex2lab(c1); L2,a2,b2=hex2lab(c2)
    C1,C2=math.hypot(a1,b1),math.hypot(a2,b2); Cb=(C1+C2)/2
    G=.5*(1-math.sqrt(Cb**7/(Cb**7+25**7))) if Cb>0 else .5
    a1p,a2p=(1+G)*a1,(1+G)*a2
    C1p,C2p=math.hypot(a1p,b1),math.hypot(a2p,b2)
    h1p=math.degrees(math.atan2(b1,a1p))%360; h2p=math.degrees(math.atan2(b2,a2p))%360
    dLp=L2-L1; dCp=C2p-C1p
    if C1p*C2p==0: dhp=0
    elif abs(h2p-h1p)<=180: dhp=h2p-h1p
    elif h2p-h1p>180: dhp=h2p-h1p-360
    else: dhp=h2p-h1p+360
    dHp=2*math.sqrt(C1p*C2p)*math.sin(math.radians(dhp)/2)
    Lbp=(L1+L2)/2; Cbp=(C1p+C2p)/2
    if C1p*C2p==0: hbp=h1p+h2p
    elif abs(h1p-h2p)<=180: hbp=(h1p+h2p)/2
    elif h1p+h2p<360: hbp=(h1p+h2p+360)/2
    else: hbp=(h1p+h2p-360)/2
    T=1-.17*math.cos(math.radians(hbp-30))+.24*math.cos(math.radians(2*hbp))+\
      .32*math.cos(math.radians(3*hbp+6))-.20*math.cos(math.radians(4*hbp-63))
    dTh=30*math.exp(-((hbp-275)/25)**2)
    Rc=2*math.sqrt(Cbp**7/(Cbp**7+25**7)) if Cbp>0 else 0
    Sl=1+.015*(Lbp-50)**2/math.sqrt(20+(Lbp-50)**2); Sc=1+.045*Cbp; Sh=1+.015*Cbp*T
    Rt=-Rc*math.sin(2*math.radians(dTh))
    return math.sqrt((dLp/Sl)**2+(dCp/Sc)**2+(dHp/Sh)**2+Rt*(dCp/Sc)*(dHp/Sh))
# ── daltonismo (Viénot-Brettel-Mollon) ─────────────────────────────────────
LMS=[[17.8824,43.5161,4.11935],[3.45565,27.1554,3.86714],[.0299566,.184309,1.46709]]
LMSi=[[.0809445,-.130504,.116721],[-.0102485,.0540194,-.113615],[-.000365294,-.00412163,.693513]]
SIM={'deuteranopia':[[1,0,0],[.494207,0,1.24827],[0,0,1]],
     'protanopia':  [[0,2.02344,-2.52581],[0,1,0],[0,0,1]],
     'tritanopia':  [[1,0,0],[0,1,0],[-.395913,.801109,0]]}
def mul(Mx,v): return [sum(Mx[i][j]*v[j] for j in range(3)) for i in range(3)]
def simular(h,tipo):
    r,g,b=hex2rgb(h); v=[lin(r)*255,lin(g)*255,lin(b)*255]
    l=mul(LMS,v); s=mul(SIM[tipo],l); out=mul(LMSi,s)
    return rgb2hex(*[unlin(max(0,min(1,c/255))) for c in out])
