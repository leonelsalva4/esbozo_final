import { apiFetch } from "./api/transport";
import { useEffect, useRef, useState } from "react";
import { LoginScreen, type Session } from "./screens/Login/LoginScreen";
import { AccountsScreen } from "./screens/Accounts/AccountsScreen";
import { OperationsScreen } from "./screens/Operations/OperationsScreen";
import { HomeScreen } from "./screens/Home/HomeScreen";
import { BocetoScreen } from "./screens/Boceto/BocetoScreen";
import { LoteObtenidoScreen, type LoteObtenidoResult, type RevealMode } from "./screens/LoteObtenido/LoteObtenidoScreen";
import { AlternativasScreen } from "./screens/Alternativas/AlternativasScreen";
import { DetalleProyeccionScreen } from "./screens/Detalle/DetalleProyeccionScreen";
import { ComparacionScreen } from "./screens/Comparacion/ComparacionScreen";
import { TrazabilidadScreen } from "./screens/Trazabilidad/TrazabilidadScreen";
import { EtapasScreen } from "./screens/Etapas/EtapasScreen";
import { LotsNavigation } from "./components/LotsNavigation";
import { LotExhaustedScreen, type ConservedLot } from "./screens/LotExhausted/LotExhaustedScreen";
import { LotesScreen } from "./screens/Lotes/LotesScreen";
import { ShellActions, type OperationsContext } from "./components/ShellActions";
import { ShellDialogs } from "./components/ShellDialogs";
import { SESSION_EVENT, type SessionFailure } from "./api/transport";
import type { Sketch } from "./types";

const API_URL = "http://localhost:4000";

type Route =
  | { name: "operations"; context?:OperationsContext }
  | { name: "lot-exhausted" }
  | { name: "lotes" }
  | { name: "home" }
  | { name: "boceto" }
  | { name: "lote-obtenido"; revealMode: RevealMode }
  | { name: "alternativas" }
  | { name: "detalle"; projectionId: string }
  | { name: "etapas"; projectionId: string }
  | { name: "comparacion"; projectionId: string }
  | { name: "trazabilidad"; projectionId: string };

function App() {
  // La sesión se conserva únicamente mientras la ventana permanece abierta.
  const [session, setSession] = useState<Session | null>(null);
  const [shellDialog,setShellDialog]=useState<'guide'|'about'|null>(null);
  const [sessionWarning,setSessionWarning]=useState<'inactive'|'expired'|null>(null);
  const sessionToken=session?.token;
  useEffect(()=>{
    if(!sessionToken)return;
    const controller=new AbortController();let pending=false;
    async function check(){if(pending)return;pending=true;try{
      const response=await apiFetch(`${API_URL}/api/auth/me`,{headers:{Authorization:`Bearer ${sessionToken}`},cache:'no-store',signal:controller.signal});
      if(response.status===401||response.status===403){setSessionWarning(response.status===403?'inactive':'expired');return;}
      if(response.ok){const user=await response.json();if(!controller.signal.aborted)setSession(previous=>previous&&previous.token===sessionToken&&(previous.user.username!==user.username||previous.user.displayName!==user.displayName||previous.user.role!==user.role)?{...previous,user}:previous);}
    }catch{/* Una falla temporal del servidor no invalida la sesión local. */}finally{pending=false;}}
    function sessionFailure(event: Event) { const {token,reason}=(event as CustomEvent<SessionFailure>).detail; if(token===sessionToken){setShellDialog(null);setSessionWarning(reason);} }
    window.addEventListener(SESSION_EVENT,sessionFailure);
    const timer=window.setInterval(check,60000);window.addEventListener('focus',check);check();
    return()=>{controller.abort();clearInterval(timer);window.removeEventListener('focus',check);window.removeEventListener(SESSION_EVENT,sessionFailure);};
  },[sessionToken]);

  const [route, setRoute] = useState<Route>({ name: "home" });
  const [operationsReturn,setOperationsReturn]=useState<Route>({name:"home"});

  // El boceto activo y el lote obtenido se comparten entre las pantallas.
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null);
  const activeLoad = useRef(0);
  const [exhaustedLot,setExhaustedLot]=useState<ConservedLot|null>(null);
  const [lotOperation, setLotOperation] = useState<LoteObtenidoResult | null>(null);
  const [obtainedLote, setObtainedLote] = useState<LoteObtenidoResult | null>(null);

  useEffect(() => {
    if (!session || !selectedSketch) {
      setObtainedLote(null);
      return;
    }
    let cancelled = false;
    const requestVersion = ++activeLoad.current;
    apiFetch(`${API_URL}/api/sketches/${selectedSketch.id}/lote-obtenido`, {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        if (cancelled || requestVersion !== activeLoad.current) return;
        setObtainedLote(
          data.obtained ? { lote: data.lote, steps: data.steps, obtainedAt: data.obtainedAt, obtainedBy: data.obtainedBy } : null
        );
      })
      .catch(() => {
        if (!cancelled && requestVersion === activeLoad.current) setObtainedLote(null);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSketch, session]);

  if (!session) {
    return (
      <LoginScreen
        onLoginSuccess={(s) => {
          setSession(s);
          setRoute({ name: "home" });
        }}
      />
    );
  }

  function activateLot(result: LoteObtenidoResult) {
    activeLoad.current += 1;
    setObtainedLote(result);
  }

  function handleLogout() {
    activeLoad.current += 1;
    setSession(null);
    setShellDialog(null);
    setSessionWarning(null);
    setSelectedSketch(null);
    setObtainedLote(null);
    setLotOperation(null);
    setExhaustedLot(null);
    setOperationsReturn({name:"home"});
    setRoute({ name: "home" });
  }

  function goHome() {
    setRoute({ name: "home" });
  }

  function goBoceto(sketch: Sketch) {
    if (sketch.id !== selectedSketch?.id) { activeLoad.current += 1; setSelectedSketch(sketch); setObtainedLote(null); setLotOperation(null); }
    setRoute({ name: "boceto" });
  }

  function goLoteObtenido(freshResult?: LoteObtenidoResult, revealMode: RevealMode = "instant") {
    setLotOperation(freshResult ?? obtainedLote);
    if (freshResult?.obtainedAt) activateLot(freshResult);
    setRoute({ name: "lote-obtenido", revealMode });
  }

  function goExhausted(lot: ConservedLot | null) {setExhaustedLot(lot?.sketch_id===selectedSketch?.id?lot:null);setRoute({name:"lot-exhausted"});}

  function goAlternativas() {
    setRoute({ name: "alternativas" });
  }

  function goDetalle(projectionId: string) {
    setRoute({ name: "detalle", projectionId });
  }

  function goComparacion(projectionId: string) {
    setRoute({ name: "comparacion", projectionId });
  }

  function goTrazabilidad(projectionId: string) {
    setRoute({ name: "trazabilidad", projectionId });
  }

  const navEnabled = {
    boceto: selectedSketch !== null,
    alternativas: Boolean(obtainedLote?.obtainedAt),
    lotes: selectedSketch !== null,
  };

  function renderScreen() {
  if(route.name==='lot-exhausted'&&selectedSketch)return <LotExhaustedScreen session={session!} sketch={selectedSketch} conservedLot={exhaustedLot} navEnabled={navEnabled} onLogout={handleLogout} onGoHome={goHome} onGoBoceto={()=>goBoceto(selectedSketch)} onGoAlternativas={goAlternativas} onGoLots={()=>setRoute({name:'lotes'})}/>;

  if (route.name === "operations") return <OperationsScreen key={JSON.stringify(route.context??{})} initialContext={route.context} session={session!} onLogout={handleLogout} onAccounts={()=>setRoute({name:"home"})} onBack={()=>setRoute(operationsReturn)} navEnabled={navEnabled} onNavigate={key=>{if(key==='inicio')goHome();if(key==='boceto'&&selectedSketch)goBoceto(selectedSketch);if(key==='alternativas')goAlternativas();if(key==='lotes')setRoute({name:'lotes'});}}/>;
  if (session!.user.role === "admin") return <AccountsScreen session={session!} onLogout={handleLogout} onOperations={()=>setRoute({name:"operations"})}/>;

  if (route.name === "lotes" && selectedSketch) {
    return <LotesScreen session={session!} sketch={selectedSketch} activeLotId={obtainedLote?.lote.id} navEnabled={navEnabled} onLogout={handleLogout} onGoHome={goHome} onGoBoceto={() => goBoceto(selectedSketch)} onGoAlternativas={goAlternativas} onOpened={result => { activateLot(result); goAlternativas(); }} onObtained={goLoteObtenido} onExhausted={goExhausted} />;
  }
  if (route.name === "comparacion" && selectedSketch && obtainedLote) {
    return (
      <ComparacionScreen
        session={session!}
        sketch={selectedSketch}
        loteId={obtainedLote.lote.id}
        initialProjectionId={route.projectionId}
        onLogout={handleLogout}
        navEnabled={navEnabled}
        onGoHome={goHome}
        onGoBoceto={() => goBoceto(selectedSketch)}
        onGoLoteObtenido={() => goLoteObtenido()}
        onGoAlternativas={goAlternativas}
        onBackToDetail={goDetalle}
      />
    );
  }

  if (route.name === "trazabilidad" && selectedSketch && obtainedLote) {
    return (
      <TrazabilidadScreen
        session={session!}
        sketch={selectedSketch}
        loteId={obtainedLote.lote.id}
        initialProjectionId={route.projectionId}
        onLogout={handleLogout}
        navEnabled={navEnabled}
        onGoHome={goHome}
        onGoBoceto={() => goBoceto(selectedSketch)}
        onGoLoteObtenido={() => goLoteObtenido()}
        onGoAlternativas={goAlternativas}
        onBackToDetail={goDetalle}
        onGoComparacion={goComparacion}
      />
    );
  }

  if (route.name === "etapas" && selectedSketch && obtainedLote) {
    return <EtapasScreen key={route.projectionId} session={session!} sketch={selectedSketch} lotId={obtainedLote.lote.id} projectionId={route.projectionId} navEnabled={navEnabled} onLogout={handleLogout} onGoHome={goHome} onGoBoceto={() => goBoceto(selectedSketch)} onGoAlternativas={goAlternativas} onBack={() => goDetalle(route.projectionId)} />;
  }

  if (route.name === "detalle" && selectedSketch && obtainedLote) {
    return (
      <DetalleProyeccionScreen
        session={session!}
        sketch={selectedSketch}
        loteId={obtainedLote.lote.id}
        initialProjectionId={route.projectionId}
        onLogout={handleLogout}
        navEnabled={navEnabled}
        onGoHome={goHome}
        onGoBoceto={() => goBoceto(selectedSketch)}
        onGoLoteObtenido={() => goLoteObtenido()}
        onGoAlternativas={goAlternativas}
        onReviewStages={projectionId => setRoute({ name: "etapas", projectionId })}
        onCompare={goComparacion}
        onViewTrazabilidad={goTrazabilidad}
      />
    );
  }

  if (route.name === "alternativas" && selectedSketch && obtainedLote) {
    return (
      <AlternativasScreen
        session={session!}
        sketch={selectedSketch}
        loteId={obtainedLote.lote.id}
        onLogout={handleLogout}
        navEnabled={navEnabled}
        onGoHome={goHome}
        onGoBoceto={() => goBoceto(selectedSketch)}
        onGoLoteObtenido={() => goLoteObtenido()}
        onViewDetail={goDetalle}
      />
    );
  }

  if (route.name === "lote-obtenido" && selectedSketch && (lotOperation || obtainedLote)) {
    return (
      <LoteObtenidoScreen
        session={session!}
        sketch={selectedSketch}
        result={(lotOperation ?? obtainedLote)!}
        revealMode={route.revealMode}
        onVerified={activateLot}
        onExhausted={goExhausted}
        onLogout={handleLogout}
        onBackToHome={goHome}
        onViewProjections={goAlternativas}
        navEnabled={navEnabled}
        onGoHome={goHome}
        onGoBoceto={() => goBoceto(selectedSketch)}
      />
    );
  }

  if (route.name === "boceto" && selectedSketch) {
    return (
      <BocetoScreen
        session={session!}
        sketch={selectedSketch}
        onLogout={handleLogout}
        onBackToHome={goHome}
        onLoteObtained={(result) => goLoteObtenido(result, "demo")}
        onExhausted={goExhausted}
        navEnabled={navEnabled}
        onGoHome={goHome}
        onGoAlternativas={goAlternativas}
        onViewLoteObtenido={obtainedLote ? () => goLoteObtenido(undefined, "demo") : undefined}
      />
    );
  }

  return (
    <HomeScreen
      session={session!}
      onLogout={handleLogout}
      onSelectSketch={goBoceto}
      navEnabled={navEnabled}
      onGoBoceto={selectedSketch ? () => goBoceto(selectedSketch) : undefined}
      onGoAlternativas={obtainedLote ? goAlternativas : undefined}
    />
  );
  }
  return <ShellActions value={{onGuide:()=>setShellDialog('guide'),onAbout:()=>setShellDialog('about'),onOperations:context=>{if(route.name!=='operations')setOperationsReturn(route);setRoute({name:'operations',context});}}}><LotsNavigation value={selectedSketch ? () => setRoute({ name: "lotes" }) : undefined}>{renderScreen()}</LotsNavigation>
    <ShellDialogs token={session.token} mode={shellDialog} warning={sessionWarning} onClose={()=>setShellDialog(null)} onAccess={()=>{setSessionWarning(null);handleLogout();}} />
    </ShellActions>;
}

export default App;
